"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const electronPath = require("electron");
const allowedViews = new Set(["dashboard", "gaming", "dns", "repair", "mtu", "adapter", "diagnostics", "restore", "settings", "settings-th", "settings-ar"]);
const view = process.argv[2] || "dashboard";

if (!allowedViews.has(view)) {
    process.stderr.write("Unknown capture view.\n");
    process.exit(1);
}

const result = spawnSync(electronPath, ["."], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, BYTEBOOST_CAPTURE_TEST: "1", BYTEBOOST_CAPTURE_VIEW: view },
    encoding: "utf8",
    timeout: 45000
});

if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
}
process.exit(result.status ?? 1);
