  Object.assign(RailsMarkupToolbar, {
    _injectStyles() {
      if (document.getElementById("rm-toolbar-styles")) return;
      const style = document.createElement("style");
      style.id = "rm-toolbar-styles";
      style.textContent = `
        @keyframes rm-pulse { 0%,100%{box-shadow:0 2px 8px rgba(0,0,0,0.2)} 50%{box-shadow:0 2px 12px rgba(0,0,0,0.3),0 0 0 4px rgba(99,102,241,0.15)} }
        @keyframes rm-toast-in { from{opacity:0;transform:translateY(16px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes rm-toast-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(16px) scale(0.95)} }
        #rm-toolbar-root { position:fixed; inset:0; pointer-events:none; z-index:9979; }
        #rm-toolbar-root * { box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif; }
        .rm-fab, .rm-panel-toggle, .rm-panel, .rm-popup { pointer-events:auto; }
        .rm-fab { position:fixed; z-index:9980; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; box-shadow:0 4px 12px rgba(0,0,0,0.15); }
        .rm-fab svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .rm-fab-badge { position:absolute; top:-4px; right:-4px; min-width:20px; height:20px; padding:0 4px; border-radius:10px; background:#ef4444; color:#fff; font-size:11px; font-weight:700; display:none; align-items:center; justify-content:center; }
        .rm-panel-toggle { position:fixed; z-index:9980; width:32px; height:32px; border-radius:50%; border:1px solid #e5e7eb; background:rgba(255,255,255,0.9); cursor:pointer; display:none; align-items:center; justify-content:center; color:#6b7280; transition:all 0.2s; backdrop-filter:blur(8px); }
        .rm-panel-toggle:hover { color:#4361ee; }
        .rm-panel-toggle svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .rm-toast-container { position:fixed; z-index:9983; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
        .rm-pins-container { position:absolute; top:0; left:0; width:100%; z-index:9979; pointer-events:none; }
        .rm-pin { pointer-events:auto; }
        .rm-popup { display:none; position:fixed; z-index:9982; width:360px; max-width:calc(100vw - 24px); background:rgba(255,255,255,0.95); backdrop-filter:blur(12px); border-radius:16px; box-shadow:0 25px 50px rgba(0,0,0,0.1); border:1px solid rgba(229,231,235,0.8); padding:16px; }
        #rm-toolbar-root .rm-popup textarea { display:block; width:100%; max-width:100%; font-size:13px; font-weight:400; line-height:1.4; color:#1f2937; height:auto; margin:0; border:1px solid #e5e7eb; border-radius:12px; padding:12px; resize:none; outline:none; font-family:inherit; background:#fff; background-image:none; box-shadow:none; appearance:none; -webkit-appearance:none; transition:border-color 0.15s,box-shadow 0.15s; }
        #rm-toolbar-root .rm-popup textarea:focus { border:1px solid #818cf8; box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        #rm-toolbar-root .rm-menu { position:relative; display:inline-block; vertical-align:middle; }
        #rm-toolbar-root .rm-menu-btn { display:inline-flex; align-items:center; gap:4px; width:auto; height:auto; margin:0; font-size:11px; font-weight:500; line-height:1.4; color:#374151; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; background:#fff; background-image:none; box-shadow:none; outline:none; text-transform:none; appearance:none; -webkit-appearance:none; cursor:pointer; }
        #rm-toolbar-root .rm-menu-btn:hover { border-color:#d1d5db; background:#fff; }
        #rm-toolbar-root .rm-menu-btn:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        #rm-toolbar-root .rm-menu-btn[aria-expanded="true"] { border-color:#818cf8; }
        #rm-toolbar-root .rm-menu-chevron { width:10px; height:10px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; opacity:0.55; }
        #rm-toolbar-root .rm-menu-list { display:none; position:absolute; top:calc(100% + 4px); left:0; z-index:9984; min-width:100%; padding:4px; margin:0; list-style:none; background:#fff; border:1px solid #e5e7eb; border-radius:10px; box-shadow:0 10px 24px rgba(0,0,0,0.12); }
        #rm-toolbar-root .rm-menu-list.rm-menu-open { display:block; }
        #rm-toolbar-root .rm-menu-option { display:block; width:100%; margin:0; padding:6px 10px; font-size:11px; font-weight:500; line-height:1.4; color:#374151; text-align:left; border:none; border-radius:6px; background:transparent; background-image:none; box-shadow:none; cursor:pointer; appearance:none; -webkit-appearance:none; }
        #rm-toolbar-root .rm-menu-option:hover, #rm-toolbar-root .rm-menu-option:focus { background:#f3f4f6; outline:none; }
        #rm-toolbar-root .rm-menu-option-active { background:#eef2ff; color:#4338ca; }
        #rm-toolbar-root .rm-menu-compact .rm-menu-btn { font-size:10px; padding:2px 6px; border-radius:4px; color:#6b7280; }
        #rm-toolbar-root .rm-menu-compact .rm-menu-list, #rm-toolbar-root .rm-menu-list-compact { min-width:120px; right:0; left:auto; }
        #rm-toolbar-root .rm-menu-compact .rm-menu-option, #rm-toolbar-root .rm-menu-list-compact .rm-menu-option { font-size:10px; padding:5px 8px; }
        .rm-popup-el { font-size:11px; color:#9ca3af; font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1.4; }
        .rm-popup-text { font-size:12px; color:#6b7280; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px; line-height:1.4; }
        .rm-popup-actions { display:flex; align-items:center; gap:8px; margin-top:8px; }
        .rm-popup-actions .rm-count { font-size:10px; color:#d1d5db; margin-left:auto; font-variant-numeric:tabular-nums; }
        #rm-toolbar-root .rm-btn-cancel { padding:6px 12px; font-size:12px; color:#9ca3af; background:none; background-image:none; border:none; box-shadow:none; cursor:pointer; border-radius:8px; appearance:none; -webkit-appearance:none; }
        #rm-toolbar-root .rm-btn-cancel:hover { color:#6b7280; }
        #rm-toolbar-root .rm-btn-submit { padding:6px 16px; font-size:12px; font-weight:500; color:#fff; border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:none; appearance:none; -webkit-appearance:none; }
        #rm-toolbar-root .rm-btn-submit kbd { font-size:9px; opacity:0.6; font-family:sans-serif; }
        .rm-panel { display:none; position:fixed; z-index:9981; width:380px; max-width:calc(100vw - 48px); max-height:60vh; background:rgba(255,255,255,0.95); backdrop-filter:blur(12px); border-radius:16px; box-shadow:0 25px 50px rgba(0,0,0,0.1); border:1px solid rgba(229,231,235,0.8); flex-direction:column; }
        .rm-panel-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #f3f4f6; }
        .rm-panel-header h3 { font-size:14px; font-weight:600; color:#1f2937; }
        .rm-panel-count { min-width:20px; text-align:center; padding:2px 6px; font-size:10px; font-weight:600; border-radius:10px; }
        .rm-panel-close { padding:6px; color:#d1d5db; background:none; border:none; cursor:pointer; border-radius:8px; }
        .rm-panel-close:hover { color:#6b7280; }
        .rm-panel-close svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .rm-filter-chips { display:flex; gap:6px; padding:8px 16px; border-bottom:1px solid #f9fafb; }
        .rm-chip { padding:4px 8px; font-size:10px; font-weight:500; border-radius:10px; cursor:pointer; transition:all 0.15s; border:none; }
        .rm-chip-active { color:#fff; }
        .rm-chip-inactive { background:#f9fafb; color:#9ca3af; }
        .rm-chip-inactive:hover { color:#6b7280; }
        .rm-panel-list { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; }
        .rm-panel-footer { display:flex; align-items:center; gap:8px; padding:10px 16px; border-top:1px solid #f3f4f6; font-size:11px; color:#9ca3af; }
        .rm-status-dot { width:8px; height:8px; border-radius:50%; background:#d1d5db; }
        .rm-card { padding:12px; background:#fff; border-radius:8px; border:1px solid #f3f4f6; border-left:3px solid; cursor:pointer; transition:all 0.15s; }
        .rm-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.05); }
        .rm-card-top { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .rm-card-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .rm-card-id { font-size:10px; font-weight:600; color:#9ca3af; }
        .rm-card-badge { padding:2px 6px; font-size:10px; font-weight:500; border-radius:10px; }
        .rm-card-body { margin-top:6px; font-size:13px; line-height:1.5; color:#1f2937; }
        .rm-card-path { margin-top:4px; font-size:10px; color:#d1d5db; font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rm-card-thread { margin-top:8px; padding:8px; background:rgba(249,250,251,0.8); border-radius:8px; font-size:12px; color:#6b7280; border-left:2px solid; }
        .rm-card-thread-role { font-size:10px; font-weight:500; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; }
        .rm-empty { text-align:center; padding:32px 16px; color:#9ca3af; }
        .rm-empty-icon { font-size:32px; margin-bottom:8px; }
        .rm-empty-text { font-size:13px; }
        .rm-pin { position:absolute; display:flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; color:#fff; font-size:10px; font-weight:700; cursor:pointer; transition:transform 0.2s; z-index:9979; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
        .rm-pin:hover { transform:scale(1.25); }
        .rm-pin-active { animation:rm-pulse 2s ease-in-out infinite; }
        .rm-toast { padding:8px 12px; border-radius:8px; border:1px solid; font-size:12px; font-weight:500; box-shadow:0 2px 8px rgba(0,0,0,0.05); animation:rm-toast-in 0.3s ease; }
      `;
      document.head.appendChild(style);
    },
  });
