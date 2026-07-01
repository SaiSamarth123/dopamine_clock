const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

describe("extension integrity", () => {
  it("manifest references existing files", () => {
    const manifest = readJson("manifest.json");
    assert.equal(manifest.manifest_version, 3);

    const required = [
      manifest.chrome_url_overrides.newtab,
      manifest.background.service_worker,
    ];

    for (const size of Object.keys(manifest.icons)) {
      required.push(manifest.icons[size]);
    }
    for (const size of Object.keys(manifest.action.default_icon)) {
      required.push(manifest.action.default_icon[size]);
    }

    for (const rel of required) {
      assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
    }
  });

  it("entry pages load shared utilities and scripts", () => {
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    assert.match(html, /shared\.js/);
    assert.match(html, /app\.js/);
    assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  });

  it("manifest uses minimal permissions for store review", () => {
    const manifest = readJson("manifest.json");
    assert.deepEqual(manifest.permissions, ["storage", "alarms"]);
    assert.ok(!manifest.permissions.includes("declarativeNetRequest"));
    assert.equal(manifest.version, "0.0.0.1");
  });

  it("bundled fonts ship with the extension", () => {
    assert.ok(fs.existsSync(path.join(root, "fonts/inter-400-latin.woff2")));
    assert.ok(fs.existsSync(path.join(root, "fonts/jetbrains-mono-400-latin.woff2")));
    assert.ok(fs.existsSync(path.join(root, "fonts/space-grotesk-400-latin.woff2")));
    const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
    assert.match(css, /@font-face/);
    assert.match(css, /fonts\/inter-400-latin\.woff2/);
  });

  it("privacy policy and store docs exist", () => {
    assert.ok(fs.existsSync(path.join(root, "docs/privacy-policy.md")));
    assert.ok(fs.existsSync(path.join(root, "docs/index.html")));
    assert.ok(fs.existsSync(path.join(root, "docs/STORE_LISTING.md")));
  });
});
