"use strict";

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { fileURLToPath } = require("node:url");
const { app, BrowserWindow, dialog, ipcMain, session } = require("electron");
const { NetworkService } = require("./network-service");

let mainWindow;
let networkService;
const rendererPath = path.join(__dirname, "..", "index.html");
const isSmokeTest = process.env.BYTEBOOST_SMOKE_TEST === "1";
const isCaptureTest = process.env.BYTEBOOST_CAPTURE_TEST === "1";
const captureView = process.env.BYTEBOOST_CAPTURE_VIEW || "dashboard";

function writeSmokeReport(report) {
    if (!isSmokeTest) return;
    fs.writeFileSync(path.join(app.getPath("temp"), "byteboost-smoke.json"), JSON.stringify(report, null, 2));
}

app.enableSandbox();

function isTrustedSender(event) {
    const senderUrl = event.senderFrame?.url || "";
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== event.sender.mainFrame) return false;
    try {
        return path.normalize(fileURLToPath(senderUrl)) === path.normalize(rendererPath);
    } catch {
        return false;
    }
}

function trustedHandler(channel, handler) {
    ipcMain.handle(channel, async (event, payload) => {
        if (!isTrustedSender(event)) throw new Error("Untrusted IPC sender");
        return handler(payload);
    });
}

function registerIpc() {
    trustedHandler("network:get-capabilities", () => networkService.getCapabilities());
    trustedHandler("network:get-status", () => networkService.getStatus());
    trustedHandler("network:get-traffic", () => networkService.getTraffic());
    trustedHandler("network:run-diagnostics", () => networkService.runDiagnostics());
    trustedHandler("network:benchmark-dns", () => networkService.benchmarkDns());
    trustedHandler("network:test-mtu", () => networkService.testMtu());
    trustedHandler("gaming:scan-installed", () => networkService.scanInstalledGames());
    trustedHandler("gaming:analyze-connections", (payload) => networkService.analyzeGameConnections(payload));
    trustedHandler("gaming:choose-executable", async () => {
        const selection = await dialog.showOpenDialog(mainWindow, {
            title: "Select game executable",
            buttonLabel: "Add Game",
            properties: ["openFile", "dontAddToRecent"],
            filters: [{ name: "Windows Game", extensions: ["exe"] }]
        });
        if (selection.canceled || selection.filePaths.length !== 1) return { ok: true, data: { canceled: true } };
        const executable = path.resolve(selection.filePaths[0]);
        if (path.extname(executable).toLowerCase() !== ".exe" || executable.length > 1024) {
            return { ok: false, error: { code: "INVALID_GAME", message: "Select a valid Windows game executable." } };
        }
        try {
            const stat = await fs.promises.stat(executable);
            if (!stat.isFile()) throw new Error("The selected executable is not a file.");
        } catch (error) {
            return { ok: false, error: { code: "INVALID_GAME", message: error.message } };
        }
        const installLocation = path.dirname(executable);
        const name = path.basename(executable, path.extname(executable)).replaceAll("_", " ").trim();
        const id = crypto.createHash("sha256").update(executable.toLowerCase()).digest("hex").slice(0, 16);
        return { ok: true, data: { canceled: false, game: { id, name, source: "Manual", installLocation, executable, running: false } } };
    });
    trustedHandler("network:apply-dns", (payload) => networkService.applyDns(payload));
    trustedHandler("network:apply-mtu", (payload) => networkService.applyMtu(payload));
    trustedHandler("network:repair", () => networkService.repairNetwork());
    trustedHandler("network:optimize-adapter", () => networkService.optimizeAdapter());
    trustedHandler("network:apply-profile", (payload) => networkService.applyProfile(payload));
    trustedHandler("network:restore-baseline", () => networkService.restoreBaseline());
    trustedHandler("network:get-history", () => networkService.getHistory());

    trustedHandler("window:minimize", () => mainWindow?.minimize());
    trustedHandler("window:close", () => mainWindow?.close());
    trustedHandler("app:restart-as-admin", async () => {
        const result = await networkService.restartAsAdmin();
        if (result.ok) setTimeout(() => app.quit(), 250);
        return result;
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 299,
        height: 374,
        minWidth: 299,
        minHeight: 374,
        resizable: false,
        frame: false,
        show: false,
        backgroundColor: "#0A0A0A",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInWorker: false,
            nodeIntegrationInSubFrames: false,
            sandbox: true,
            webSecurity: true,
            webviewTag: false,
            allowRunningInsecureContent: false,
            spellcheck: false,
            devTools: !app.isPackaged
        }
    });

    mainWindow.once("ready-to-show", () => {
        if (!isSmokeTest && !isCaptureTest) mainWindow.show();
    });

    if (isSmokeTest) {
        mainWindow.webContents.on("render-process-gone", (_event, details) => {
            writeSmokeReport({ stage: "render-process-gone", details });
        });
        mainWindow.webContents.once("did-finish-load", async () => {
            try {
                const result = await mainWindow.webContents.executeJavaScript(`(async () => ({
                    title: document.title,
                    hasDashboard: Boolean(document.querySelector('.dashboard-view')),
                    hasNativeApi: Boolean(window.byteBoost),
                    capabilities: await window.byteBoost.getCapabilities()
                }))()`);
                writeSmokeReport({ stage: "complete", result });
                app.exit(result.hasDashboard && result.hasNativeApi && result.capabilities?.ok ? 0 : 1);
            } catch (error) {
                writeSmokeReport({ stage: "failed", error: error.stack || error.message });
                app.exit(1);
            }
        });
    }

    if (isCaptureTest) {
        mainWindow.webContents.once("did-finish-load", () => {
            setTimeout(async () => {
                try {
                    let interaction = null;
                    if (captureView.startsWith("settings")) {
                        interaction = await mainWindow.webContents.executeJavaScript(`(() => {
                            document.querySelector('.three-dot').click();
                            const language = ${JSON.stringify(captureView.split("-")[1] || "")};
                            if (language) {
                                const select = document.querySelector('.language-select');
                                select.value = language;
                                select.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            const settings = document.querySelector('.settings-window');
                            const rect = settings.getBoundingClientRect();
                            return {
                                settingsHidden: settings.hidden,
                                settingsDisplay: getComputedStyle(settings).display,
                                settingsRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                                settingsTitle: settings.querySelector('h1').textContent,
                                selectedLanguage: document.querySelector('.language-select').value,
                                dashboardFeatureText: document.querySelector('[data-i18n="feature"]').textContent,
                                language: document.documentElement.lang,
                                direction: document.documentElement.dir
                            };
                        })()`);
                        await new Promise((resolve) => setTimeout(resolve, 500));
                    } else if (captureView === "dashboard") {
                        interaction = await mainWindow.webContents.executeJavaScript(`(async () => {
                            const scan = runAutoScan();
                            await new Promise((resolve) => setTimeout(resolve, 50));
                            const duringScan = {
                                inert: document.querySelector('.main-app').inert,
                                ariaBusy: document.querySelector('.main-app').getAttribute('aria-busy'),
                                scanDisabled: document.querySelector('.scan-button').disabled,
                                activeAccentCount: document.querySelectorAll('.main-app.is-busy .mode-option.is-active').length
                            };
                            await scan;
                            return {
                                duringScan,
                                inertAfterScan: document.querySelector('.main-app').inert,
                                activeProfiles: document.querySelectorAll('.mode-option.is-active').length,
                                recentPlaceholder: document.querySelector('.recent-changes .is-empty')?.textContent
                            };
                        })()`);
                    } else if (captureView !== "dashboard") {
                        const allowedTools = new Set(["gaming", "dns", "repair", "mtu", "adapter", "diagnostics", "restore"]);
                        if (!allowedTools.has(captureView)) throw new Error("Unknown capture view");
                        await mainWindow.webContents.executeJavaScript(captureView === "gaming"
                            ? `document.querySelector('[data-profile="gaming"]').click()`
                            : `document.querySelector('[data-tool="${captureView}"]').click()`);
                        await new Promise((resolve) => setTimeout(resolve, 6000));
                        if (captureView === "gaming") {
                            await mainWindow.webContents.executeJavaScript(`document.querySelector('.game-option')?.click()`);
                            await new Promise((resolve) => setTimeout(resolve, 2500));
                            interaction = await mainWindow.webContents.executeJavaScript(`(() => ({
                                hasGamingApi: typeof window.byteBoost?.scanInstalledGames === 'function',
                                hasChooseGameApi: typeof window.byteBoost?.chooseGameExecutable === 'function',
                                state: document.querySelector('.tool-window-state')?.textContent,
                                title: document.querySelector('.tool-window-title')?.textContent,
                                note: document.querySelector('.tool-note')?.textContent,
                                gameCount: document.querySelectorAll('.game-option').length,
                                libraryActionCount: document.querySelectorAll('.game-library-actions button').length,
                                serverRefreshCount: document.querySelectorAll('.game-server-refresh').length,
                                selectedGame: document.querySelector('.game-option.is-selected strong')?.textContent,
                                actionDisabled: document.querySelector('.tool-primary-action')?.disabled,
                                serverStatus: document.querySelector('.game-server-status')?.textContent,
                                bodyRect: (() => { const r = document.querySelector('.tool-window-body')?.getBoundingClientRect(); return r ? { y: r.y, height: r.height, scrollHeight: document.querySelector('.tool-window-body').scrollHeight } : null; })(),
                                actionRect: (() => { const r = document.querySelector('.tool-primary-action')?.getBoundingClientRect(); return r ? { y: r.y, height: r.height, bottom: r.bottom } : null; })()
                            }))()`);
                        }
                    }
                    const layout = await mainWindow.webContents.executeJavaScript(`(() => {
                        const selectors = ["html", "body", ".main-app", ".panel-scroll", ".results-view", ".tool-window-body", ".settings-window"];
                        return {
                            viewport: { width: innerWidth, height: innerHeight },
                            nodes: selectors.map((selector) => {
                                const element = document.querySelector(selector);
                                if (!element) return { selector, missing: true };
                                const style = getComputedStyle(element);
                                return {
                                    selector,
                                    hidden: element.hidden || element.closest("[hidden]") !== null,
                                    clientWidth: element.clientWidth,
                                    scrollWidth: element.scrollWidth,
                                    overflowX: style.overflowX,
                                    overflowsHorizontally: element.scrollWidth > element.clientWidth
                                };
                            })
                        };
                    })()`);
                    layout.interaction = interaction;
                    const image = await mainWindow.capturePage();
                    const capturePath = path.join(app.getPath("temp"), `byteboost-ui-${captureView}.png`);
                    const layoutPath = path.join(app.getPath("temp"), `byteboost-layout-${captureView}.json`);
                    fs.writeFileSync(capturePath, image.toPNG());
                    fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 2));
                    app.exit(0);
                } catch {
                    app.exit(1);
                }
            }, 20000);
        });
    }

    mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
    mainWindow.loadFile(rendererPath);
}

app.whenReady().then(() => {
    writeSmokeReport({ stage: "ready" });
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    const scriptPath = app.isPackaged
        ? path.join(process.resourcesPath, "native", "ByteBoost.Network.ps1")
        : path.join(__dirname, "..", "native", "ByteBoost.Network.ps1");

    networkService = new NetworkService({
        scriptPath,
        stateDirectory: path.join(app.getPath("userData"), "state"),
        executablePath: process.execPath,
        appPath: app.getAppPath(),
        isPackaged: app.isPackaged
    });
    registerIpc();
    createWindow();
});

app.on("window-all-closed", () => app.quit());
