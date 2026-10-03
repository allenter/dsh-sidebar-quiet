/**
 * dsh-sidebar-quiet — host half.
 *
 * The whole feature is CSS: the client half collapses the left sidebar's
 * `sidebar.footer.action` slot into one row and expands it on hover/click.
 * The host half exists only so those knobs are configurable, and it exposes
 * the resolved options to the client over one same-origin GET route.
 *
 * Knobs come from this row's `config` block — the profile's cordis.patch.yml
 * (`- id: sidebar-quiet` → `config:`) or the GUI's config editor:
 *
 *   config:
 *     enabled: true          # 总开关
 *     keepVisible: 1         # 收起时保留前几项
 *     collapsedHeight: 40    # 收起高度(px)
 *     expandOn: both         # hover | click | both
 *     showHint: true         # 折叠角上的 "⋯"
 *     extraCss: ""           # 追加自写 CSS
 *
 * Deliberately dependency-free: the plugin is mounted as a junction, so a bare
 * import here would resolve from the junction's realpath (outside the profile)
 * and fail; every knob therefore carries its default in `normalize()`.
 *
 * @module dsh-sidebar-quiet
 */

export const name = "dsh-sidebar-quiet";

/** The plugin registers one HTTP route and needs nothing else. */
export const inject = ["webServer"];

export const DEFAULTS = {
  enabled: true,
  keepVisible: 1,
  collapsedHeight: 40,
  expandOn: "both",
  showHint: true,
  extraCss: ""
};

const ROUTE = "/sidebar-quiet";
const CONFIG_PATH = "/sidebar-quiet/config";

function intOf(value, fallback, min, max) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

/** Fill every knob with its documented default and clamp the numbers. */
export function normalize(config) {
  const raw = config ?? {};
  return {
    enabled: raw.enabled !== false,
    keepVisible: intOf(raw.keepVisible, DEFAULTS.keepVisible, 1, 7),
    collapsedHeight: intOf(raw.collapsedHeight, DEFAULTS.collapsedHeight, 24, 320),
    expandOn: raw.expandOn === "hover" || raw.expandOn === "click" ? raw.expandOn : "both",
    showHint: raw.showHint !== false,
    extraCss: typeof raw.extraCss === "string" ? raw.extraCss : ""
  };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

export function apply(ctx, config) {
  const resolved = normalize(config);
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: ROUTE,
    handler: (req, res) => {
      const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
      if (req.method === "GET" && pathname === CONFIG_PATH) {
        sendJson(res, 200, { ok: true, config: resolved });
        return;
      }
      sendJson(res, 404, { ok: false, error: { code: "not-found", message: `unknown ${ROUTE} path` } });
    }
  }));
}
