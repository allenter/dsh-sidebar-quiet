# dsh-sidebar-quiet

A tiny [DSH](https://www.npmjs.com/package/@deepseek-ai/dsh) plugin that collapses the **left sidebar footer**
(Daily spend, chat import, memory, remote access, logout, …) into **one line**, expanding on hover or click —
so the workspace and session list get the vertical space back.

Measured on DSH `0.2.0-rc.2`: the footer slot is `302px` tall and drops to `32px` when collapsed.

## Install

```bash
# in your DSH profile directory (the folder with package.json / dsh.profile.bundles)
pnpm add dsh-sidebar-quiet
```

Then append `"dsh-sidebar-quiet"` to `dsh.profile.bundles` in that `package.json` and **restart the DSH kernel**
(bundles are composed once, at boot). Reload the GUI afterwards.

Installing from a tarball or a checkout instead:

```bash
pnpm add file:/path/to/dsh-sidebar-quiet-0.1.0.tgz     # or:  pnpm add file:/path/to/dsh-sidebar-quiet
node  node_modules/dsh-sidebar-quiet/tools/install.mjs # if there is no pnpm, this wires it up for you
```

`tools/install.mjs` auto-detects `$DSH_HOME/profiles/*`, creates the `node_modules` link, writes the `link:` dependency
and the bundles entry (with a backup), and supports `--profile`, `--copy`, `--dsh-home`, `--uninstall`.

## Configure

Edit the `config` block of the plugin row (`id: sidebar-quiet`) in your profile's `cordis.patch.yml`,
or through the GUI config editor. **Changes apply on page reload (F5)** — no kernel restart needed.

```yaml
- id: sidebar-quiet
  name: dsh-sidebar-quiet
  config:
    enabled: true          # master switch; false = stay out of the way
    keepVisible: 1         # how many footer items stay visible (1..7)
    collapsedHeight: 40    # collapsed height in px (24..320)
    expandOn: both         # hover | click | both
    showHint: true         # the "⋯" affordance in the collapsed corner
    extraCss: ""           # extra CSS appended verbatim
```

## How it works

The sidebar footer items all register into the official slot `sidebar.footer.action`. This plugin adds no UI of its own:

- the host half (`lib/index.js`) exposes the resolved config over `GET /sidebar-quiet/config` and has **zero imports**;
- the client half (`lib/client.js`) fetches that config, then injects a single `<style id="dsh-sidebar-quiet-style">`
  that collapses the slot with `:not(:hover):not(:focus-within)` (and, in `click` mode, a `data-dsh-sq-open` attribute).

Because the collapse only applies while the pointer is elsewhere, other plugins that measure this row
(such as `dsh-chat-import`) keep their normal layout while hovered.

## Uninstall

```bash
node node_modules/dsh-sidebar-quiet/tools/install.mjs --uninstall   # link-based installs
pnpm remove dsh-sidebar-quiet                                        # pnpm installs
```

Then remove `"dsh-sidebar-quiet"` from `dsh.profile.bundles` and restart.

## 中文说明

见 [README.zh.md](README.zh.md)。

## License

MIT
