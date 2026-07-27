# frozen_string_literal: true

module RailsMarkup
  module ToolbarSource
    DIR = File.expand_path("../../app/assets/javascripts/rails_markup/toolbar", __dir__)

    def self.script
      # Re-read every call in development so editing a toolbar/ module shows up
      # without a restart (matches the old single-file File.read). Memoize only
      # where the source can't change under a running process.
      return build if defined?(Rails) && Rails.env.development?

      @script ||= build
    end

    def self.build
      Dir.glob(File.join(DIR, "*.js")).sort.map { |file| File.read(file) }.join("\n")
    end

    def self.reset!
      @script = nil
    end
  end
end
