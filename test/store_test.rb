# frozen_string_literal: true

require_relative "test_helper"
require "timeout"

class StoreTest < Minitest::Test
  def setup
    @store = RailsMarkup::Store.new
  end

  # --- Sessions ---

  def test_create_session
    session = @store.create_session(url: "http://localhost:3000/sites/test")
    assert session.id
    assert_equal "http://localhost:3000/sites/test", session.url
    assert_equal [], session.annotations
  end

  def test_create_session_with_metadata
    session = @store.create_session(url: "http://example.com", metadata: { framework: "rails" })
    assert_equal({ framework: "rails" }, session.metadata)
  end

  def test_get_session
    session = @store.create_session(url: "http://example.com")
    found = @store.get_session(session.id)
    assert_equal session.id, found.id
  end

  def test_get_session_not_found
    assert_nil @store.get_session("nonexistent")
  end

  def test_list_sessions
    @store.create_session(url: "http://one.com")
    @store.create_session(url: "http://two.com")
    assert_equal 2, @store.list_sessions.size
  end

  # --- Annotations ---

  def test_create_annotation
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(
      session_id: session.id,
      target: "div.hero",
      content: "Make this bigger"
    )
    assert ann.id
    assert_equal "pending", ann.status
    assert_equal "change", ann.intent
    assert_equal "suggestion", ann.severity
    assert_equal 1, session.annotations.size
  end

  def test_create_annotation_invalid_session
    assert_nil @store.create_annotation(session_id: "nope", target: "div", content: "test")
  end

  def test_create_annotation_with_selected_text
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(
      session_id: session.id,
      target: "p.intro",
      content: "Fix typo",
      selected_text: "teh quick brown fox"
    )
    assert_equal "teh quick brown fox", ann.selected_text
  end

  def test_get_annotation
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    found = @store.get_annotation(ann.id)
    assert_equal ann.id, found.id
  end

  def test_pending_for_session
    session = @store.create_session(url: "http://example.com")
    @store.create_annotation(session_id: session.id, target: "div", content: "one")
    @store.create_annotation(session_id: session.id, target: "p", content: "two")
    assert_equal 2, @store.pending_for_session(session.id).size
  end

  def test_all_pending_across_sessions
    s1 = @store.create_session(url: "http://one.com")
    s2 = @store.create_session(url: "http://two.com")
    @store.create_annotation(session_id: s1.id, target: "div", content: "a")
    @store.create_annotation(session_id: s2.id, target: "p", content: "b")
    assert_equal 2, @store.all_pending.size
  end

  # --- Status transitions ---

  def test_acknowledge
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    result = @store.acknowledge(ann.id)
    assert_equal "acknowledged", result.status
  end

  def test_resolve_with_summary
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    result = @store.resolve(ann.id, summary: "Fixed the padding")
    assert_equal "resolved", result.status
    assert_equal 1, result.thread.size
    assert_equal "Fixed the padding", result.thread.first[:message]
  end

  def test_dismiss_with_reason
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    result = @store.dismiss(ann.id, reason: "Working as intended")
    assert_equal "dismissed", result.status
    assert_equal "Working as intended", result.thread.first[:message]
  end

  def test_reply
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    result = @store.reply(ann.id, message: "Can you clarify?")
    assert_equal 1, result.thread.size
    assert_equal "agent", result.thread.first[:role]
    assert_equal "Can you clarify?", result.thread.first[:message]
  end

  def test_resolve_nonexistent_annotation
    assert_nil @store.resolve("nope", summary: "test")
  end

  def test_resolved_annotations_not_in_pending
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    @store.resolve(ann.id, summary: "Done")
    assert_equal 0, @store.pending_for_session(session.id).size
  end

  # --- Serialization ---

  def test_serialize_session
    session = @store.create_session(url: "http://example.com", metadata: { tool: "rails-markup" })
    @store.create_annotation(session_id: session.id, target: "div", content: "note")
    data = @store.serialize_session(session)
    assert_equal session.id, data[:id]
    assert_equal "http://example.com", data[:url]
    assert_equal 1, data[:annotations].size
  end

  def test_serialize_annotation
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div.hero", content: "Fix this",
                                   intent: "fix", severity: "blocking")
    data = @store.serialize_annotation(ann)
    assert_equal ann.id, data[:id]
    assert_equal "div.hero", data[:target]
    assert_equal "fix", data[:intent]
    assert_equal "blocking", data[:severity]
    assert_equal "pending", data[:status]
  end

  def test_serialize_annotation_includes_author_name
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test",
                                   metadata: { "author" => "Alice" })
    data = @store.serialize_annotation(ann)
    assert_equal "Alice", data[:authorName]
  end

  def test_serialize_annotation_author_name_nil_when_absent
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    data = @store.serialize_annotation(ann)
    assert_nil data[:authorName]
  end

  # --- Subscriptions ---

  def test_subscribe_receives_annotation_events
    session = @store.create_session(url: "http://example.com")
    events = []
    @store.subscribe(session.id) { |data| events << data }
    @store.create_annotation(session_id: session.id, target: "div", content: "test")
    assert_equal 1, events.size
    assert_equal "annotation_created", events.first[:type]
  end

  def test_subscribe_receives_resolve_events
    session = @store.create_session(url: "http://example.com")
    ann = @store.create_annotation(session_id: session.id, target: "div", content: "test")
    events = []
    @store.subscribe(session.id) { |data| events << data }
    @store.resolve(ann.id, summary: "Done")
    assert_equal 1, events.size
    assert_equal "resolved", events.first[:status]
  end

  def test_unsubscribe
    session = @store.create_session(url: "http://example.com")
    events = []
    sub = @store.subscribe(session.id) { |data| events << data }
    @store.unsubscribe(sub)
    @store.create_annotation(session_id: session.id, target: "div", content: "test")
    assert_equal 0, events.size
  end

  def test_subscriber_callbacks_run_without_holding_the_store_mutex
    session = @store.create_session(url: "http://example.com")
    mutex_owned = nil
    @store.subscribe(session.id) do
      mutex_owned = @store.instance_variable_get(:@mutex).owned?
    end

    @store.create_annotation(session_id: session.id, target: "div", content: "test")

    assert_equal false, mutex_owned
  end

  def test_slow_and_raising_subscribers_do_not_block_store_operations_and_are_cleaned_up
    session = @store.create_session(url: "http://example.com")
    entered = Queue.new
    release = Queue.new
    @store.subscribe(session.id) do
      entered << true
      release.pop
    end
    @store.subscribe(session.id) { raise "closed socket" }

    notifying = Thread.new do
      @store.create_annotation(session_id: session.id, target: "div", content: "slow")
    end
    entered.pop

    Timeout.timeout(0.5) do
      assert_same session, @store.get_session(session.id)
      assert_equal 1, @store.list_sessions.length
    end
    release << true
    notifying.join

    assert_equal 1, @store.instance_variable_get(:@subscribers).length
  end

  def test_annotation_count_cap_rejects_excess_records_with_a_clear_error
    store = RailsMarkup::Store.new(max_annotations_per_session: 2)
    session = store.create_session(url: "http://example.com")
    2.times { |index| store.create_annotation(session_id: session.id, target: "div", content: "note #{index}") }

    error = assert_raises(RailsMarkup::Store::CapacityError) do
      store.create_annotation(session_id: session.id, target: "div", content: "one too many")
    end

    assert_match(/annotation limit/i, error.message)
    assert_equal 2, session.annotations.length
  end

  def test_annotation_aggregate_byte_cap_rejects_excess_payload
    store = RailsMarkup::Store.new(max_annotation_bytes: 700)
    first_session = store.create_session(url: "http://one.example.com")
    second_session = store.create_session(url: "http://two.example.com")
    store.create_annotation(session_id: first_session.id, target: "div", content: "a" * 200)

    error = assert_raises(RailsMarkup::Store::CapacityError) do
      store.create_annotation(session_id: second_session.id, target: "div", content: "b" * 600)
    end

    assert_match(/byte limit/i, error.message)
    assert_equal 1, first_session.annotations.length
    assert_empty second_session.annotations
  end

  def test_create_annotation_validates_basic_fields
    session = @store.create_session(url: "http://example.com")
    invalid_attributes = [
      { target: "", content: "note" },
      { target: "div", content: "" },
      { target: "div", content: "note", intent: "invented" },
      { target: "div", content: "note", severity: "catastrophic" },
      { target: "div", content: "note", metadata: [] }
    ]

    invalid_attributes.each do |attributes|
      assert_raises(RailsMarkup::Store::ValidationError) do
        @store.create_annotation(session_id: session.id, **attributes)
      end
    end
    assert_empty session.annotations
  end

  def test_session_count_is_hard_capped_even_when_all_are_fresh
    (RailsMarkup::Store::MAX_SESSIONS + 25).times do |i|
      @store.create_session(url: "http://example.com/#{i}")
    end

    count = @store.instance_variable_get(:@sessions).size
    assert_operator count, :<=, RailsMarkup::Store::MAX_SESSIONS,
      "fresh sessions must still be evicted at the hard cap"
  end
end
