# frozen_string_literal: true

module RailsMarkup
  module ToolbarSource
    DIR = File.expand_path("../../app/assets/javascripts/rails_markup/toolbar", __dir__)

    def self.script
      @script ||= Dir.glob(File.join(DIR, "*.js")).sort.map { |file| File.read(file) }.join("\n")
    end

    def self.reset!
      @script = nil
    end
  end
end
