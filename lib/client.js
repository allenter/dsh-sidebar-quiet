/**
 * dsh-sidebar-quiet — client half.
 *
 * Hand-written module-loader entry (no bundler): collapses the left sidebar's
 * `sidebar.footer.action` slot to `keepVisible` rows and expands it on hover /
 * click, so the workspace + session list gets the vertical space back.
 *
 * Options are fetched once from the host half at `/sidebar-quiet/config`.
 *
 * @module dsh-sidebar-quiet/client
 */
window.__ModuleLoader__.load({
  id: "dsh-sidebar-quiet",
  factory: () => {
    var module = { exports: {} };
    var exports = module.exports;

    var STYLE_ID = "dsh-sidebar-quiet-style";
    var OPEN_ATTR = "data-dsh-sq-open";
    var SLOT_SEL = '[data-slot="sidebar.footer.action"]';
    var CONFIG_URL = "/sidebar-quiet/config";
    var REATTACH_MS = 1500;

    var DEFAULTS = {
      enabled: true,
      keepVisible: 1,
      collapsedHeight: 40,
      expandOn: "both",
      showHint: true,
      extraCss: ""
    };

    /** Compose the stylesheet for one resolved config. */
    function buildCss(cfg) {
      var suffix = "";
      if (cfg.expandOn === "hover" || cfg.expandOn === "both") suffix += ":not(:hover):not(:focus-within)";
      if (cfg.expandOn === "click" || cfg.expandOn === "both") suffix += ":not([" + OPEN_ATTR + "])";
      var collapsed = SLOT_SEL + suffix;
      var keep = cfg.keepVisible + 1;
      var lines = [
        "/* dsh-sidebar-quiet */",
        SLOT_SEL + "{position:relative;transition:max-height .18s ease}",
        collapsed + "{max-height:" + cfg.collapsedHeight + "px;overflow:hidden;flex-wrap:nowrap}",
        collapsed + ">*{flex:0 0 auto!important}",
        collapsed + ">:nth-child(n+" + keep + "){display:none!important}",
        collapsed + " .cm-footer-stack>*:nth-child(n+" + keep + "){display:none!important}"
      ];
      if (cfg.showHint) {
        lines.push(collapsed + '::after{content:"\u22ef";position:absolute;right:7px;top:9px;opacity:.45;font-size:13px;line-height:1;pointer-events:none}');
      }
      if (cfg.extraCss) lines.push(String(cfg.extraCss));
      return lines.join("\n");
    }

    function removeStyle() {
      var el = document.getElementById(STYLE_ID);
      if (el !== null && el.parentNode !== null) el.parentNode.removeChild(el);
    }

    function apply(ctx) {
      void ctx;

      var disposed = false;
      var cfg = DEFAULTS;
      var clickMode = false;
      var started = false;
      var timer = null;
      var bound = null;

      function onClick(event) {
        if (!clickMode || bound === null) return;
        if (bound.hasAttribute(OPEN_ATTR)) return;
        bound.setAttribute(OPEN_ATTR, "1");
        event.preventDefault();
        event.stopPropagation();
      }

      function onDocumentClick(event) {
        if (bound === null || !bound.hasAttribute(OPEN_ATTR)) return;
        if (!bound.contains(event.target)) bound.removeAttribute(OPEN_ATTR);
      }

      function onKeyDown(event) {
        if (event.key === "Escape" && bound !== null) bound.removeAttribute(OPEN_ATTR);
      }

      /** (Re)bind when the shell re-creates the footer element. */
      function bind() {
        var slot = document.querySelector(SLOT_SEL);
        if (slot === bound) return;
        if (bound !== null) bound.removeEventListener("click", onClick, true);
        bound = slot;
        if (bound !== null) bound.addEventListener("click", onClick, true);
      }

      function start() {
        if (started || disposed) return;
        started = true;
        var style = document.getElementById(STYLE_ID);
        if (style === null) {
          style = document.createElement("style");
          style.id = STYLE_ID;
          document.head.appendChild(style);
        }
        style.textContent = buildCss(cfg);
        document.addEventListener("click", onDocumentClick, true);
        document.addEventListener("keydown", onKeyDown, true);
        bind();
        timer = setInterval(bind, REATTACH_MS);
      }

      fetch(CONFIG_URL, { headers: { accept: "application/json" }, credentials: "same-origin" })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (envelope) {
          if (disposed) return;
          var incoming = envelope !== null && typeof envelope === "object" ? envelope.config : null;
          if (incoming !== null && typeof incoming === "object") {
            for (var key in DEFAULTS) {
              if (Object.prototype.hasOwnProperty.call(incoming, key)) cfg[key] = incoming[key];
            }
          }
          if (cfg.enabled === false) return;
          clickMode = cfg.expandOn === "click" || cfg.expandOn === "both";
          start();
        })
        .catch(function () {
          // Host route unreachable: leave the sidebar untouched rather than
          // guessing at options.
        });

      return function dispose() {
        disposed = true;
        if (timer !== null) clearInterval(timer);
        document.removeEventListener("click", onDocumentClick, true);
        document.removeEventListener("keydown", onKeyDown, true);
        if (bound !== null) {
          bound.removeEventListener("click", onClick, true);
          bound.removeAttribute(OPEN_ATTR);
          bound = null;
        }
        removeStyle();
      };
    }

    exports.name = "dsh-sidebar-quiet";
    exports.inject = [];
    exports.apply = apply;
    return module.exports;
  }
});
