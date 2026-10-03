#!/usr/bin/env node
/**
 * dsh-sidebar-quiet installer (cross-platform, no dependencies).
 *
 *   node tools/install.mjs                       # auto-detect the profile, link this folder
 *   node tools/install.mjs --profile <dir>       # explicit profile directory
 *   node tools/install.mjs --copy                # copy instead of creating a junction
 *   node tools/install.mjs --dsh-home <dir>      # explicit DSH home (default $DSH_HOME or ~/.dsh)
 *   node tools/install.mjs --uninstall           # remove the link/copy + package.json entries
 *
 * What it does:
 *   1. links (or copies) this plugin folder into <profile>/node_modules/dsh-sidebar-quiet
 *   2. adds  "dsh-sidebar-quiet": "link:<this folder>"  to <profile>/package.json dependencies
 *   3. appends "dsh-sidebar-quiet" to dsh.profile.bundles
 *   4. validates the result; restart the DSH kernel afterwards to compose the new row
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "dsh-sidebar-quiet";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);            // the plugin folder

function arg(flag, fallback = undefined) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
  return value;
}
const has = (flag) => process.argv.includes(flag);

function log(message) { console.log(message); }
function die(message) { console.error(`install.mjs: ${message}`); process.exit(1); }

const dshHome = path.resolve(arg("--dsh-home", process.env.DSH_HOME ?? path.join(os.homedir(), ".dsh")));
if (!fs.existsSync(dshHome)) die(`DSH home not found: ${dshHome} (pass --dsh-home)`);

function findProfiles() {
  const profilesDir = path.join(dshHome, "profiles");
  if (!fs.existsSync(profilesDir)) die(`no profiles directory under ${dshHome}`);
  return fs.readdirSync(profilesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(profilesDir, entry.name, "package.json")))
    .map((entry) => path.join(profilesDir, entry.name));
}

let profile = arg("--profile");
if (profile === undefined) {
  const found = findProfiles();
  if (found.length === 0) die(`no profile with a package.json under ${path.join(dshHome, "profiles")}`);
  if (found.length > 1) die(`several profiles found, pass --profile <dir>:\n  ${found.join("\n  ")}`);
  profile = found[0];
}
profile = path.resolve(profile);
const pkgPath = path.join(profile, "package.json");
if (!fs.existsSync(pkgPath)) die(`no package.json in ${profile}`);
const linkPath = path.join(profile, "node_modules", NAME);
// BOM-tolerant reader: PowerShell's Set-Content -Encoding UTF8 writes a BOM, JSON.parse rejects it.
const readPkg = () => fs.readFileSync(pkgPath, "utf8").replace(/^\uFEFF/, "");
const writePkg = (text) => fs.writeFileSync(pkgPath, text, "utf8");
if (!fs.existsSync(path.join(ROOT, "package.json"))) die(`this does not look like the plugin folder: ${ROOT}`);
log(`plugin  : ${ROOT}`);
log(`profile : ${profile}`);

/* ---------------------------------------------------------------- uninstall */
if (has("--uninstall")) {
  const original = readPkg();
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  fs.writeFileSync(`${pkgPath}.bak-uninstall-${stamp}`, original, "utf8");
  const data = JSON.parse(original);
  if (data.dependencies !== undefined) delete data.dependencies[NAME];
  if (Array.isArray(data.dsh?.profile?.bundles)) {
    data.dsh.profile.bundles = data.dsh.profile.bundles.filter((entry) => entry !== NAME);
  }
  writePkg(`${JSON.stringify(data, null, 2)}\n`);
  const parsed = JSON.parse(readPkg());
  if ((parsed?.dsh?.profile?.bundles ?? []).includes(NAME)) die("bundles entry survived");
  if (parsed?.dependencies?.[NAME] !== undefined) die("dependencies entry survived");
  log(`package.json: entries removed (backup ${path.basename(pkgPath)}.bak-uninstall-${stamp})`);
  if (fs.existsSync(linkPath)) {
    fs.rmSync(linkPath, { force: false });
    log("node_modules: link removed");
  }
  log("done -- restart the DSH kernel");
  process.exit(0);
}

/* ------------------------------------------------------------------ install */
const copy = has("--copy");
if (fs.existsSync(linkPath)) {
  const stat = fs.lstatSync(linkPath);
  if (!stat.isSymbolicLink() && !copy) {
    die(`${linkPath} already exists and is not a link - remove it yourself, or pass --copy`);
  }
  fs.rmSync(linkPath, { force: false });
  log("node_modules: previous entry replaced");
}
fs.mkdirSync(path.dirname(linkPath), { recursive: true });
if (copy) {
  fs.cpSync(ROOT, linkPath, { recursive: true });
  log("node_modules: folder copied");
} else {
  fs.symlinkSync(ROOT, linkPath, "junction");
  log("node_modules: junction created");
}

const before = readPkg();
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
fs.writeFileSync(`${pkgPath}.bak-sidebarquiet-${stamp}`, before, "utf8");
const data = JSON.parse(before);
data.dependencies ??= {};
data.dependencies[NAME] = `link:${ROOT.split(path.sep).join("/")}`;
data.dsh ??= {};
data.dsh.profile ??= {};
data.dsh.profile.bundles ??= [];
if (!data.dsh.profile.bundles.includes(NAME)) data.dsh.profile.bundles.push(NAME);
writePkg(`${JSON.stringify(data, null, 2)}\n`);

const parsed = JSON.parse(readPkg());
if (parsed.dependencies[NAME] === undefined) die("dependency entry missing after write");
if (!parsed.dsh.profile.bundles.includes(NAME)) die("bundles entry missing after write");
log(`package.json: dependency + bundles(${parsed.dsh.profile.bundles.length}, last=${parsed.dsh.profile.bundles[parsed.dsh.profile.bundles.length - 1]}) written`);
log(`backup: ${path.basename(pkgPath)}.bak-sidebarquiet-${stamp}`);
log("");
log("next: restart the DSH kernel so the new row is composed, then reload the GUI (F5).");
