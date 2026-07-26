# frozen_string_literal: true

require "securerandom"
require "json"

module RailsMarkup
  # In-memory store for sessions and annotations.
  # Ephemeral by design — data lives for one coding session.
  class Store
    class ValidationError < StandardError; end
    class CapacityError < StandardError; end

    Session    = Struct.new(:id, :url, :metadata, :created_at, :annotations, keyword_init: true)
    Annotation = Struct.new(:id, :session_id, :target, :content, :intent, :severity, :status,
                            :selected_text, :metadata, :created_at, :thread, keyword_init: true)

    MAX_SESSIONS = 100
    SESSION_TTL  = 4 * 3600 # 4 hours
    MAX_ANNOTATIONS_PER_SESSION = 1_000
    MAX_ANNOTATION_BYTES = 25_000_000
    MAX_CONTENT_BYTES = 5_000
    MAX_TARGET_BYTES = 16_384
    MAX_SELECTED_TEXT_BYTES = 2_000
    MAX_METADATA_BYTES = 65_536
    INTENTS = %w[fix change question approve].freeze
    SEVERITIES = %w[suggestion important blocking].freeze

    attr_reader :sessions

    def initialize(max_annotations_per_session: MAX_ANNOTATIONS_PER_SESSION,
                   max_annotation_bytes: MAX_ANNOTATION_BYTES)
      @sessions          = {}
      @annotations_index = {} # id -> annotation (O(1) lookup)
      @subscribers       = [] # SSE callbacks: [session_id, callback]
      @mutex             = Mutex.new
      @max_annotations_per_session = max_annotations_per_session
      @max_annotation_bytes = max_annotation_bytes
    end

    # --- Sessions ---

    def create_session(url:, metadata: {})
      id = SecureRandom.hex(8)
      session = Session.new(
        id: id,
        url: url,
        metadata: metadata || {},
        created_at: Time.now.iso8601,
        annotations: []
      )
      @mutex.synchronize do
        evict_stale_sessions
        @sessions[id] = session
      end
      session
    end

    def get_session(id)
      @mutex.synchronize { @sessions[id] }
    end

    def list_sessions
      @mutex.synchronize { @sessions.values }
    end

    # --- Annotations ---

    def create_annotation(session_id:, target:, content:, intent: "change", severity: "suggestion",
                          selected_text: nil, metadata: {})
      annotation_bytes = validate_annotation!(
        target:, content:, intent:, severity:, selected_text:, metadata:
      )
      id = SecureRandom.hex(8)
      annotation = Annotation.new(
        id: id,
        session_id: session_id,
        target: target,
        content: content,
        intent: intent,
        severity: severity,
        status: "pending",
        selected_text: selected_text,
        metadata: metadata || {},
        created_at: Time.now.iso8601,
        thread: []
      )

      # Single mutex block — no TOCTOU gap
      @mutex.synchronize do
        session = @sessions[session_id]
        return nil unless session

        enforce_session_capacity!(session, annotation_bytes)
        session.annotations << annotation
        @annotations_index[id] = annotation
      end

      notify(session_id, type: "annotation_created", annotation: serialize_annotation(annotation))
      annotation
    end

    def get_annotation(annotation_id)
      @mutex.synchronize { @annotations_index[annotation_id] }
    end

    def pending_for_session(session_id)
      session = get_session(session_id)
      return [] unless session

      @mutex.synchronize { session.annotations.select { |a| a.status == "pending" } }
    end

    def all_pending
      @mutex.synchronize do
        @sessions.values.flat_map { |s| s.annotations.select { |a| a.status == "pending" } }
      end
    end

    # --- Status transitions ---

    def acknowledge(annotation_id)
      update_status(annotation_id, "acknowledged")
    end

    def resolve(annotation_id, summary: nil)
      ann = update_status(annotation_id, "resolved")
      return nil unless ann

      ann.thread << { role: "agent", message: summary, timestamp: Time.now.iso8601 } if summary
      notify(ann.session_id, type: "annotation_update", annotation: serialize_annotation(ann),
                             status: "resolved", summary: summary)
      ann
    end

    def dismiss(annotation_id, reason: nil)
      ann = update_status(annotation_id, "dismissed")
      return nil unless ann

      ann.thread << { role: "agent", message: reason, timestamp: Time.now.iso8601 } if reason
      notify(ann.session_id, type: "annotation_update", annotation: serialize_annotation(ann),
                             status: "dismissed", reason: reason)
      ann
    end

    def reply(annotation_id, message:)
      ann = get_annotation(annotation_id)
      return nil unless ann

      @mutex.synchronize do
        ann.thread << { role: "agent", message: message, timestamp: Time.now.iso8601 }
      end
      notify(ann.session_id, type: "annotation_update", annotation: serialize_annotation(ann),
                             status: ann.status, message: message)
      ann
    end

    # --- SSE subscriptions ---

    def subscribe(session_id, &callback)
      sub = [session_id, callback]
      @mutex.synchronize { @subscribers << sub }
      sub
    end

    def unsubscribe(sub)
      @mutex.synchronize { @subscribers.delete(sub) }
    end

    def supports_subscriptions?
      true
    end

    # --- Serialization ---

    def serialize_session(session)
      {
        id: session.id,
        url: session.url,
        metadata: session.metadata,
        createdAt: session.created_at,
        annotations: session.annotations.map { |a| serialize_annotation(a) }
      }
    end

    def serialize_annotation(ann)
      {
        id: ann.id,
        sessionId: ann.session_id,
        target: ann.target,
        content: ann.content,
        intent: ann.intent,
        severity: ann.severity,
        status: ann.status,
        selectedText: ann.selected_text,
        authorName: ann.metadata&.dig("author"),
        metadata: ann.metadata,
        createdAt: ann.created_at,
        thread: ann.thread
      }
    end

    private

    def update_status(annotation_id, new_status)
      ann = get_annotation(annotation_id)
      return nil unless ann

      @mutex.synchronize { ann.status = new_status }
      ann
    end

    def notify(session_id, data)
      subscribers = @mutex.synchronize do
        @subscribers.select { |sid, _callback| sid.nil? || sid == session_id }
      end
      dead = []
      subscribers.each do |sub|
        _sid, callback = sub
        callback.call(data)
      rescue StandardError
        dead << sub
      end
      @mutex.synchronize { dead.each { |sub| @subscribers.delete(sub) } } unless dead.empty?
    end

    def validate_annotation!(target:, content:, intent:, severity:, selected_text:, metadata:)
      validate_target!(target)
      validate_string!("content", content, maximum: MAX_CONTENT_BYTES)
      validate_optional_string!("selected_text", selected_text, maximum: MAX_SELECTED_TEXT_BYTES)
      raise ValidationError, "intent is invalid" unless INTENTS.include?(intent)
      raise ValidationError, "severity is invalid" unless SEVERITIES.include?(severity)
      raise ValidationError, "metadata must be an object" unless metadata.nil? || metadata.is_a?(Hash)

      metadata_bytes = JSON.generate(metadata || {}).bytesize
      raise ValidationError, "metadata exceeds #{MAX_METADATA_BYTES} bytes" if metadata_bytes > MAX_METADATA_BYTES

      JSON.generate(
        target:, content:, intent:, severity:, selected_text:, metadata: metadata || {}
      ).bytesize
    rescue JSON::GeneratorError, Encoding::UndefinedConversionError
      raise ValidationError, "annotation fields must be JSON serializable"
    end

    def validate_string!(name, value, maximum:)
      raise ValidationError, "#{name} must be a non-empty string" unless value.is_a?(String) && !value.empty?
      raise ValidationError, "#{name} exceeds #{maximum} bytes" if value.bytesize > maximum
    end

    def validate_target!(target)
      if target.is_a?(String)
        return validate_string!("target", target, maximum: MAX_TARGET_BYTES)
      end
      raise ValidationError, "target must be a non-empty string or object" unless target.is_a?(Hash)

      target_bytes = JSON.generate(target).bytesize
      raise ValidationError, "target exceeds #{MAX_TARGET_BYTES} bytes" if target_bytes > MAX_TARGET_BYTES
    end

    def validate_optional_string!(name, value, maximum:)
      return if value.nil?

      raise ValidationError, "#{name} must be a string" unless value.is_a?(String)
      raise ValidationError, "#{name} exceeds #{maximum} bytes" if value.bytesize > maximum
    end

    def enforce_session_capacity!(session, incoming_bytes)
      if session.annotations.length >= @max_annotations_per_session
        raise CapacityError, "session annotation limit of #{@max_annotations_per_session} reached"
      end

      current_bytes = @sessions.values.sum do |stored_session|
        stored_session.annotations.sum { |annotation| annotation_storage_bytes(annotation) }
      end
      return if current_bytes + incoming_bytes <= @max_annotation_bytes

      raise CapacityError, "aggregate annotation byte limit of #{@max_annotation_bytes} reached"
    end

    def annotation_storage_bytes(annotation)
      JSON.generate(
        target: annotation.target,
        content: annotation.content,
        intent: annotation.intent,
        severity: annotation.severity,
        selected_text: annotation.selected_text,
        metadata: annotation.metadata
      ).bytesize
    end

    def evict_stale_sessions
      return if @sessions.size < MAX_SESSIONS

      cutoff = (Time.now - SESSION_TTL).iso8601
      @sessions.delete_if do |_id, session|
        if session.created_at < cutoff
          session.annotations.each { |a| @annotations_index.delete(a.id) }
          true
        else
          false
        end
      end

      # Hard cap: if every session is still fresh we'd otherwise grow without
      # bound. Evict the oldest sessions to make room for the incoming one.
      return if @sessions.size < MAX_SESSIONS

      overflow = @sessions.size - MAX_SESSIONS + 1
      oldest = @sessions.values.sort_by(&:created_at).first(overflow)
      oldest.each do |session|
        session.annotations.each { |a| @annotations_index.delete(a.id) }
        @sessions.delete(session.id)
      end
    end
  end
end
