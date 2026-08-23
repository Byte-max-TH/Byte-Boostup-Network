"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const packageConfig = require("../package.json");

const outputDirectory = packageConfig.build?.directories?.output ?? "dist";
const electronPath = process.argv.includes("--packaged")
    ? path.join(__dirname, "..", outputDirectory, "win-unpacked", "BYTE BOOST.exe")
    : require("electron");

const result = spawnSync(electronPath, ["."], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, BYTEBOOST_SMOKE_TEST: "1" },
    encoding: "utf8",
    timeout: 30000
});

if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
