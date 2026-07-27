# frozen_string_literal: true

module RailsMarkup
  class Engine < ::Rails::Engine
    isolate_namespace RailsMarkup

    initializer "rails_markup.configuration" do
      RailsMarkup.configuration # ensure defaults are set
    end
  end
end
