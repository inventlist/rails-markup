# frozen_string_literal: true

class AddRevisionToRailsMarkupAnnotations < ActiveRecord::Migration[7.0]
  def change
    table = RailsMarkup.config.table_name
    return unless table_exists?(table)
    return if column_exists?(table, :revision)

    add_column table, :revision, :integer, null: false, default: 0
  end
end
