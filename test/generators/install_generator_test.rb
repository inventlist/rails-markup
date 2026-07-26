# frozen_string_literal: true

require_relative "../engine_test_helper"
require "generators/rails_markup/install_generator"

class InstallGeneratorTest < ActiveSupport::TestCase
  test "generator class is defined" do
    assert defined?(RailsMarkup::Generators::InstallGenerator)
  end

  test "generator inherits from Rails::Generators::Base" do
    assert RailsMarkup::Generators::InstallGenerator < Rails::Generators::Base
  end

  test "generator includes migration support" do
    assert RailsMarkup::Generators::InstallGenerator.included_modules.any? { |m| m.name&.include?("Migration") }
  end

  # -- Class options --

  test "mount_path option defaults to /admin/annotations" do
    opt = RailsMarkup::Generators::InstallGenerator.class_options[:mount_path]
    assert_equal "/admin/annotations", opt.default
  end

  test "base_controller option defaults to ApplicationController" do
    opt = RailsMarkup::Generators::InstallGenerator.class_options[:base_controller]
    assert_equal "ApplicationController", opt.default
  end

  test "layout option defaults to application" do
    opt = RailsMarkup::Generators::InstallGenerator.class_options[:layout]
    assert_equal "application", opt.default
  end

  test "table_name option defaults to rails_markup_annotations" do
    opt = RailsMarkup::Generators::InstallGenerator.class_options[:table_name]
    assert_equal "rails_markup_annotations", opt.default
  end

  # -- Templates exist --

  test "migration template exists" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/create_rails_markup_annotations.rb.erb",
      __dir__
    )
    assert File.exist?(template_path), "Migration template should exist at #{template_path}"
  end

  test "initializer template exists" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/initializer.rb.erb",
      __dir__
    )
    assert File.exist?(template_path), "Initializer template should exist at #{template_path}"
  end

  test "auth controller template exists" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/auth_controller.rb.erb",
      __dir__
    )
    assert File.exist?(template_path), "Auth controller template should exist at #{template_path}"
  end

  test "bin wrapper template exists" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/bin_markup.erb",
      __dir__
    )
    assert File.exist?(template_path), "Bin wrapper template should exist at #{template_path}"
  end

  # -- Template content --

  test "migration template contains correct schema" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/create_rails_markup_annotations.rb.erb",
      __dir__
    )
    content = File.read(template_path)

    assert_match(/page_url/, content)
    assert_match(/content/, content)
    assert_match(/intent/, content)
    assert_match(/severity/, content)
    assert_match(/status/, content)
    assert_match(/thread/, content)
    assert_match(/target/, content)
    assert_match(/metadata/, content)
    assert_match(/client_uuid/, content)
    assert_match(/client_uuid, limit: 64, null: false/, content)
    assert_match(/revision, null: false, default: 0/, content)
    assert_match(/unique: true/, content)
  end

  test "initializer template sets base_controller_class to RailsMarkupAuthController" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/initializer.rb.erb",
      __dir__
    )
    content = File.read(template_path)

    assert_match(/config\.base_controller_class = "RailsMarkupAuthController"/, content)
  end

  test "auth controller template uses base_controller option" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/auth_controller.rb.erb",
      __dir__
    )
    content = File.read(template_path)

    assert_match(/RailsMarkupAuthController/, content)
    assert_match(/options\[:base_controller\]/, content)
  end

  test "auth controller template denies access without an authenticated admin" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/auth_controller.rb.erb",
      __dir__
    )
    content = File.read(template_path)

    assert_match(/before_action :authorize_rails_markup!/, content)
    assert_match(/current_user.*admin\?/, content)
    assert_match(/head :forbidden/, content)
  end

  test "initializer warns that the configured base must enforce authorization" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/initializer.rb.erb",
      __dir__
    )
    content = File.read(template_path)

    assert_match(/must enforce authentication and authorization/i, content)
    assert_match(/toolbar API/i, content)
  end

  test "bin wrapper template sets up Bundler before requiring the CLI" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/bin_markup.erb",
      __dir__
    )
    content = File.read(template_path)

    # Git-source installs live off the default $LOAD_PATH until bundler/setup
    # runs, so it must come before requiring rails_markup/cli (issue #2).
    assert_match(/require "bundler\/setup"/, content)
    assert_operator content.index('require "bundler/setup"'),
      :<, content.index('require "rails_markup/cli"'),
      "bundler/setup must be required before rails_markup/cli"
  end

  # -- Procfile.dev injection --

  test "generator defines inject_procfile method" do
    generator = RailsMarkup::Generators::InstallGenerator.new
    assert generator.respond_to?(:inject_procfile),
      "InstallGenerator should define inject_procfile method"
  end

  test "Procfile injection guards against a missing trailing newline" do
    source = File.read(File.expand_path(
      "../../lib/generators/rails_markup/install_generator.rb", __dir__
    ))

    # Appending must not glue the markup process onto an EOF-newline-less
    # last line (issue #1).
    assert_match(/end_with\?\("\\n"\)/, source)
  end

  test "toolbar layout injection is gated on an authorized admin" do
    source = File.read(File.expand_path(
      "../../lib/generators/rails_markup/install_generator.rb", __dir__
    ))

    # The injected gate must check authorization, not merely that the partial
    # exists, so the toolbar does not ship to logged-out/non-admin users
    # (issue #3).
    assert_match(/current_user\.admin\?/, source)
    # Re-running upgrades an old lookup_context gate (only the generated block
    # is matched to detect the legacy install; it is not re-emitted).
    assert_match(/legacy\s*=.*lookup_context/m, source)
  end

  test "generator upgrades a legacy public toolbar block on re-run" do
    source = File.read(File.expand_path(
      "../../lib/generators/rails_markup/install_generator.rb", __dir__
    ))

    # The pre-1.2.3 block rendered for every visitor; re-running must replace it
    # rather than skip (incomplete-fix follow-up to issue #3).
    assert_match(/gsub_file layout_path, legacy, toolbar_block/, source)
  end

  test "install generator rejects an unsafe table name" do
    generator = RailsMarkup::Generators::InstallGenerator.new([], { "table_name" => "feedback-items" })
    assert_raises(Thor::Error) { generator.validate_table_name }
  end

  test "install generator accepts a valid table name" do
    generator = RailsMarkup::Generators::InstallGenerator.new([], { "table_name" => "my_annotations" })
    assert_nil generator.validate_table_name
  end

  test "legacy toolbar-block regex requires the generated render line" do
    source = File.read(File.expand_path(
      "../../lib/generators/rails_markup/install_generator.rb", __dir__
    ))
    legacy_line = source[/legacy\s*=.*/]
    # Must anchor on the render line so a hand-written block that merely contains
    # lookup_context…end isn't swallowed.
    assert_includes legacy_line, 'render\s+"rails_markup\/shared\/toolbar"'
  end

  test "migration schema gives page_url a 2048 limit with an adapter-safe index" do
    template_path = File.expand_path(
      "../../lib/generators/rails_markup/install/templates/create_rails_markup_annotations.rb.erb",
      __dir__
    )
    content = File.read(template_path)

    assert_match(/t\.string :page_url, limit: 2048/, content)
    # A full 2048 index exceeds MySQL/InnoDB key length on utf8mb4 → prefix it.
    assert_match(/mysql/, content)
    assert_match(/length: 191/, content)
  end
end
