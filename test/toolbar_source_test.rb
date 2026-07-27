# frozen_string_literal: true

require "minitest/autorun"

class ToolbarSourceTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)

  def test_toolbar_definition_is_a_singleton_across_turbo_renders
    source = File.read(File.join(ROOT, "app/assets/javascripts/rails_markup/toolbar.js"))

    assert_includes source, "if (global.RailsMarkupToolbar) return;"
  end

  def test_only_the_partial_owns_the_turbo_load_listener
    source = File.read(File.join(ROOT, "app/assets/javascripts/rails_markup/toolbar.js"))
    partial = File.read(File.join(ROOT, "app/views/rails_markup/shared/_toolbar.html.erb"))

    assert_equal 0, source.scan('document.addEventListener("turbo:load"').size
    assert_equal 1, partial.scan('document.addEventListener("turbo:load"').size
  end

  def test_turbo_reinitialization_deactivates_old_page_handlers_before_rebinding
    source = File.read(File.join(ROOT, "app/assets/javascripts/rails_markup/toolbar.js"))

    assert_includes source, "if (previousPathname && previousPathname !== window.location.pathname) this._deactivateMode();"
  end

  def test_partial_skips_toolbar_when_disabled
    partial = File.read(File.join(ROOT, "app/views/rails_markup/shared/_toolbar.html.erb"))

    assert_includes partial, "RailsMarkup.config.toolbar_enabled"
  end

  def test_popup_controls_avoid_native_selects
    source = File.read(File.join(ROOT, "app/assets/javascripts/rails_markup/toolbar.js"))

    # Host select-enhancers (Materialize FormSelect, Select2, etc.) rewrite every
    # <select> on the page. Intent/severity/status must be custom button menus
    # under #rm-toolbar-root so host JS and CSS cannot touch them (#4).
    refute_match(/<select[\s>]/, source)
    assert_includes source, 'class="rm-menu'
    assert_includes source, "_menuMarkup"
    assert_includes source, "#rm-toolbar-root .rm-menu-btn"
    assert_includes source, 'input type="hidden"'
  end

  def test_press_events_are_suppressed_in_annotation_mode
    source = File.read(File.join(ROOT, "app/assets/javascripts/rails_markup/toolbar.js"))

    # _handleMouseDown must suppress the press so host controls don't act before
    # mouseup/click is blocked (guarding the synthetic touch object).
    handler = source[/_handleMouseDown\(event\).*?\n    \},/m]
    assert handler, "_handleMouseDown not found"
    assert_includes handler, "event.preventDefault()"
    assert_includes handler, "event.stopPropagation()"
  end

  def test_turbo_load_tears_down_toolbar_when_gate_absent
    partial = File.read(File.join(ROOT, "app/views/rails_markup/shared/_toolbar.html.erb"))

    # A logout Turbo visit whose new body omits the partial (no gate sentinel)
    # must tear the toolbar down instead of recreating it.
    assert_includes partial, "rm-toolbar-gate"
    assert_includes partial, "RailsMarkupToolbar.destroy()"
  end

  def test_toolbar_tears_down_before_turbo_cache_snapshot
    partial = File.read(File.join(ROOT, "app/views/rails_markup/shared/_toolbar.html.erb"))

    # Turbo caches the page before navigating; without a before-cache teardown
    # the cached DOM keeps a dead toolbar root and init() early-returns on it.
    assert_includes partial, 'addEventListener("turbo:before-cache"'
  end

  def test_acknowledge_runs_under_a_row_lock
    model = File.read(File.join(ROOT, "app/models/rails_markup/annotation.rb"))
    ack = model[/def acknowledge!.*?\n    end/m]
    assert ack, "acknowledge! not found"
    assert_includes ack, "with_lock", "acknowledge! must lock to avoid reopening a resolved record"
  end
end
