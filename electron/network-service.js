"use strict";

const { spawn } = require("node:child_process");
const { promises: fs } = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const MAX_OUTPUT_BYTES = 1024 * 1024;
const VALID_PROFILES = new Set(["1-click", "gaming", "download", "streaming", "balanced"]);
const MUTATING_ACTIONS = new Set([
    "apply-dns",
    "apply-mtu",
    "repair-network",
    "optimize-adapter",
    "apply-profile",
    "restore-snapshot"
]);

class NetworkService {
    constructor(options) {
        this.scriptPath = path.resolve(options.scriptPath);
        this.stateDirectory = path.resolve(options.stateDirectory);
        this.executablePath = path.resolve(options.executablePath);
        this.appPath = path.resolve(options.appPath);
        this.isPackaged = Boolean(options.isPackaged);
        this.baselinePath = path.join(this.stateDirectory, "baseline.json");
        this.historyPath = path.join(this.stateDirectory, "history.jsonl");
        this.activeMutation = null;
    }

    async getCapabilities() {
        if (process.platform !== "win32") {
            return {
                ok: true,
                data: { supported: false, isAdmin: false, reason: "BYTE BOOST native tools require Windows." }
            };
        }
        return this.invoke("get-capabilities");
    }

    getStatus() {
        return this.invoke("get-status");
    }

    getTraffic() {
        return this.invoke("get-traffic");
    }

    runDiagnostics() {
        return this.invoke("run-diagnostics", {}, { timeoutMs: 30000 });
    }

    benchmarkDns() {
        return this.invoke("benchmark-dns", {}, { timeoutMs: 30000 });
    }

    testMtu() {
        return this.invoke("test-mtu", {}, { timeoutMs: 30000 });
    }

    scanInstalledGames() {
        return this.invoke("scan-installed-games", {}, { timeoutMs: 30000 });
    }

    analyzeGameConnections(payload) {
        const installLocation = String(payload?.installLocation || "");
        if (installLocation.length > 1024 || /[\u0000-\u001f]/.test(installLocation) || !/^[A-Za-z]:\\/.test(installLocation) || !path.win32.isAbsolute(installLocation)) {
            return this.invalid("A valid local game installation path is required.");
        }
        const normalizedRoot = path.win32.normalize(installLocation);
        const executable = String(payload?.executable || "");
        let normalizedExecutable = "";
        if (executable) {
            normalizedExecutable = path.win32.normalize(executable);
            const rootPrefix = normalizedRoot.replace(/[\\]+$/, "") + "\\";
            if (executable.length > 1024 || /[\u0000-\u001f]/.test(executable) || !/^[A-Za-z]:\\/.test(executable) ||
                !path.win32.isAbsolute(executable) || path.win32.extname(executable).toLowerCase() !== ".exe" ||
                !normalizedExecutable.toLowerCase().startsWith(rootPrefix.toLowerCase())) {
                return this.invalid("A valid game executable inside the installation folder is required.");
            }
        }
        return this.invoke("analyze-game-connections", { installLocation: normalizedRoot, executable: normalizedExecutable }, { timeoutMs: 30000 });
    }

    async applyDns(payload) {
        if (!payload || net.isIP(payload.server) !== 4) return this.invalid("A valid IPv4 DNS server is required.");
        return this.mutate("apply-dns", { server: payload.server });
    }

    async applyMtu(payload) {
        const mtu = Number(payload?.mtu);
        if (!Number.isInteger(mtu) || mtu < 576 || mtu > 9000) {
            return this.invalid("MTU must be an integer from 576 to 9000.");
        }
        return this.mutate("apply-mtu", { mtu });
    }

    repairNetwork() {
        return this.mutate("repair-network");
    }

    optimizeAdapter() {
        return this.mutate("optimize-adapter");
    }

    async applyProfile(payload) {
        const profile = String(payload?.profile || "");
        if (!VALID_PROFILES.has(profile)) return this.invalid("Unknown optimization profile.");
        return this.mutate("apply-profile", { profile });
    }

    async restoreBaseline() {
        let snapshot;
        try {
            snapshot = JSON.parse(await fs.readFile(this.baselinePath, "utf8"));
        } catch {
            return {
                ok: false,
                error: { code: "NO_BASELINE", message: "No BYTE BOOST baseline snapshot is available." }
            };
        }
        return this.mutate("restore-snapshot", { snapshot }, { skipSnapshot: true });
    }

    async getHistory() {
        try {
            const lines = (await fs.readFile(this.historyPath, "utf8")).trim().split(/\r?\n/).filter(Boolean);
            return { ok: true, data: lines.slice(-50).reverse().map((line) => JSON.parse(line)) };
        } catch (error) {
            if (error.code === "ENOENT") return { ok: true, data: [] };
            return { ok: false, error: { code: "HISTORY_ERROR", message: error.message } };
        }
    }

    async restartAsAdmin() {
        if (process.platform !== "win32") return this.invalid("Administrator restart is only supported on Windows.");
        if (!this.isPackaged) {
            return {
                ok: false,
                error: {
                    code: "DEV_ELEVATION_DISABLED",
                    message: "Automatic elevation is disabled in development. Launch the development app from an administrator terminal to test changes."
                }
            };
        }
        const helperPath = path.join(path.dirname(this.scriptPath), "Restart-ByteBoostAsAdmin.ps1");
        const args = [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-File",
            helperPath,
            "-ExecutablePath",
            this.executablePath,
            "-AppPath",
            this.appPath,
            "-Packaged",
            String(this.isPackaged)
        ];
        return new Promise((resolve) => {
            const child = spawn("powershell.exe", args, { windowsHide: true, shell: false, stdio: "ignore" });
            child.once("error", (error) => resolve({ ok: false, error: { code: "ELEVATION_FAILED", message: error.message } }));
            child.once("exit", (code) => resolve(code === 0
                ? { ok: true, data: { launched: true } }
                : { ok: false, error: { code: "ELEVATION_CANCELLED", message: "Administrator restart was cancelled." } }));
        });
    }

    invalid(message) {
        return Promise.resolve({ ok: false, error: { code: "INVALID_ARGUMENT", message } });
    }

    async mutate(action, payload = {}, options = {}) {
        if (this.activeMutation) {
            return { ok: false, error: { code: "BUSY", message: `Another change is running: ${this.activeMutation}` } };
        }

        this.activeMutation = action;
        const startedAt = Date.now();
        try {
            const capabilities = await this.invoke("get-capabilities");
            if (!capabilities.ok) return capabilities;
            if (!capabilities.data.isAdmin) {
                return {
                    ok: false,
                    requiresAdmin: true,
                    error: { code: "ADMIN_REQUIRED", message: "This change requires administrator permission." }
                };
            }

            if (!options.skipSnapshot) {
                const snapshotResult = await this.ensureBaseline();
                if (!snapshotResult.ok) return snapshotResult;
            }

            const result = await this.invoke(action, payload, { timeoutMs: action === "repair-network" ? 90000 : 45000 });
            await this.appendHistory({
                timestamp: new Date().toISOString(),
                action,
                ok: result.ok,
                durationMs: Date.now() - startedAt,
                requiresRestart: Boolean(result.data?.requiresRestart),
                changed: result.data?.changed || []
            });
            return result;
        } finally {
            this.activeMutation = null;
        }
    }

    async ensureBaseline() {
        try {
            await fs.access(this.baselinePath);
            return { ok: true };
        } catch {
            const result = await this.invoke("create-snapshot");
            if (!result.ok) return result;
            await fs.mkdir(this.stateDirectory, { recursive: true });
            const tempPath = `${this.baselinePath}.tmp`;
            await fs.writeFile(tempPath, JSON.stringify(result.data, null, 2), { encoding: "utf8", mode: 0o600 });
            await fs.rename(tempPath, this.baselinePath);
            return { ok: true };
        }
    }

    async appendHistory(entry) {
        await fs.mkdir(this.stateDirectory, { recursive: true });
        await fs.appendFile(this.historyPath, `${JSON.stringify(entry)}\n`, "utf8");
    }

    async invoke(action, payload = {}, options = {}) {
        if (process.platform !== "win32") {
            return { ok: false, error: { code: "UNSUPPORTED_PLATFORM", message: "Native network tools require Windows." } };
        }
        if (![...MUTATING_ACTIONS, "get-capabilities", "get-status", "get-traffic", "run-diagnostics", "benchmark-dns", "test-mtu", "scan-installed-games", "analyze-game-connections", "create-snapshot"].includes(action)) {
            return { ok: false, error: { code: "INVALID_ACTION", message: "Action is not allowed." } };
        }

        const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
        const args = [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-File",
            this.scriptPath,
            "-Action",
            action,
            "-PayloadBase64",
            payloadBase64
        ];

        return new Promise((resolve) => {
            const child = spawn("powershell.exe", args, {
                cwd: path.dirname(this.scriptPath),
                windowsHide: true,
                shell: false,
                env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR, PATH: process.env.PATH }
            });
            let stdout = "";
            let stderr = "";
            let exceededOutput = false;
            const timeout = setTimeout(() => {
                child.kill();
                resolve({ ok: false, error: { code: "TIMEOUT", message: "The Windows network operation timed out." } });
            }, options.timeoutMs || 15000);

            child.stdout.on("data", (chunk) => {
                if (stdout.length + chunk.length > MAX_OUTPUT_BYTES) {
                    exceededOutput = true;
                    child.kill();
                    return;
                }
                stdout += chunk.toString("utf8");
            });
            child.stderr.on("data", (chunk) => {
                if (stderr.length < 8192) stderr += chunk.toString("utf8");
            });
            child.once("error", (error) => {
                clearTimeout(timeout);
                resolve({ ok: false, error: { code: "POWERSHELL_START_FAILED", message: error.message } });
            });
            child.once("close", () => {
                clearTimeout(timeout);
                if (exceededOutput) {
                    resolve({ ok: false, error: { code: "OUTPUT_LIMIT", message: "The native helper returned too much data." } });
                    return;
                }
                try {
                    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
                    const result = JSON.parse(lines.at(-1) || "{}");
                    resolve(result.ok === true || result.ok === false
                        ? result
                        : { ok: false, error: { code: "INVALID_NATIVE_RESPONSE", message: "The native helper returned an invalid response." } });
                } catch {
                    resolve({
                        ok: false,
                        error: {
                            code: "NATIVE_ERROR",
                            message: stderr.trim() || "The Windows network helper failed."
                        }
                    });
                }
            });
        });
    }
}

module.exports = { NetworkService };
