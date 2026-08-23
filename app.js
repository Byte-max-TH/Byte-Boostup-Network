"use strict";

const nativeApi = window.byteBoost || null;
const i18n = window.byteBoostI18n;
const root = document.documentElement;
const themeToggle = document.querySelector(".toggle-theme");
const themeColor = document.querySelector('meta[name="theme-color"]');
const modeOptions = [...document.querySelectorAll(".mode-option")];
const dashboardView = document.querySelector(".dashboard-view");
const resultsView = document.querySelector(".results-view");
const backButton = document.querySelector(".back-button");
const optimizeButton = document.querySelector(".optimize-button");
const healthSummary = document.querySelector(".health-summary");
const scanButton = document.querySelector(".scan-button");
const scanState = document.querySelector(".scan-state");
const headerStatus = scanState.closest("small");
const lastScan = document.querySelector(".last-scan");
const profileMeta = document.querySelector(".profile-meta");
const currentProfile = document.querySelector(".current-profile");
const featurePanel = document.querySelector(".feature-panel");
const toolWindow = document.querySelector(".tool-window");
const toolWindowTitle = document.querySelector(".tool-window-title");
const toolWindowState = document.querySelector(".tool-window-state");
const toolWindowBody = document.querySelector(".tool-window-body");
const toolPrimaryAction = document.querySelector(".tool-primary-action");
const toolBack = document.querySelector(".tool-back");
const closeButton = document.querySelector(".x");
const settingsButton = document.querySelector(".three-dot");
const settingsWindow = document.querySelector(".settings-window");
const settingsBack = document.querySelector(".settings-back");
const languageSelect = document.querySelector(".language-select");
const languageImportButton = document.querySelector(".language-import-button");
const languageFileInput = document.querySelector(".language-file-input");
const mainApp = document.querySelector(".main-app");

function readAppliedProfile() {
    try {
        const profile = localStorage.getItem("activeProfile");
        return PROFILE_CONFIG?.[profile] ? profile : null;
    } catch {
        return null;
    }
}

const appState = {
    status: null,
    diagnostics: null,
    capabilities: null,
    scanId: 0,
    operationId: 0,
    activeTool: null,
    toolContext: {},
    trafficSample: null,
    trafficTimer: null,
    lastFocusedElement: null,
    settingsReturnFocus: null,
    activeProfile: null,
    busyReasons: new Set(),
    language: "system"
};

const PROFILE_CONFIG = {
    "1-click": { id: "1-click", nameKey: "profile1Click", descriptionKey: "profile1ClickDescription", shortName: "1 Click" },
    gaming: { id: "gaming", nameKey: "profileGaming", descriptionKey: "profileGamingDescription", shortName: "Gaming" },
    download: { id: "download", nameKey: "profileDownload", descriptionKey: "profileDownloadDescription", shortName: "Download" },
    streaming: { id: "streaming", nameKey: "profileStreaming", descriptionKey: "profileStreamingDescription", shortName: "Streaming" },
    balanced: { id: "balanced", nameKey: "profileBalanced", descriptionKey: "profileBalancedDescription", shortName: "Balanced" }
};

const TOOL_CONFIG = {
    gaming: {
        titleKey: "gamingCenter",
        descriptionKey: "gamingDescription",
        actionKey: "gamingAction",
        doneKey: "gamingDone",
        mutating: true
    },
    dns: {
        titleKey: "toolDns",
        descriptionKey: "toolDnsDescription",
        actionKey: "toolDnsAction",
        doneKey: "toolDnsDone",
        mutating: true
    },
    repair: {
        titleKey: "toolRepair",
        descriptionKey: "toolRepairDescription",
        actionKey: "toolRepairAction",
        doneKey: "toolRepairDone",
        mutating: true
    },
    mtu: {
        titleKey: "toolMtu",
        descriptionKey: "toolMtuDescription",
        actionKey: "toolMtuAction",
        doneKey: "toolMtuDone"
    },
    adapter: {
        titleKey: "toolAdapter",
        descriptionKey: "toolAdapterDescription",
        actionKey: "toolAdapterAction",
        doneKey: "toolAdapterDone",
        mutating: true
    },
    diagnostics: {
        titleKey: "toolDiagnostics",
        descriptionKey: "toolDiagnosticsDescription",
        actionKey: "toolDiagnosticsAction",
        doneKey: "toolDiagnosticsDone"
    },
    restore: {
        titleKey: "toolRestore",
        descriptionKey: "toolRestoreDescription",
        actionKey: "toolRestoreAction",
        doneKey: "toolRestoreDone",
        mutating: true,
        danger: true
    }
};

function t(key) {
    return i18n?.translate(key, appState.language) || key;
}

function readLanguage() {
    try {
        const stored = localStorage.getItem("language") || "system";
        return i18n.languages.some((language) => language.code === stored) ? stored : "system";
    } catch {
        return "system";
    }
}

function loadCustomLanguagePacks() {
    try {
        const packs = JSON.parse(localStorage.getItem("customLanguagePacks") || "[]");
        if (Array.isArray(packs)) packs.slice(0, 20).forEach((pack) => i18n.addLanguagePack(pack));
    } catch { }
}

function saveCustomLanguagePack(pack) {
    let packs = [];
    try {
        const saved = JSON.parse(localStorage.getItem("customLanguagePacks") || "[]");
        if (Array.isArray(saved)) packs = saved;
    } catch { }
    packs = packs.filter((item) => item?.code !== pack.code).slice(-19);
    packs.push(pack);
    localStorage.setItem("customLanguagePacks", JSON.stringify(packs));
}

function populateLanguageSelect() {
    languageSelect.replaceChildren();
    i18n.languages.forEach((language) => {
        const option = document.createElement("option");
        option.value = language.code;
        option.textContent = language.code === "system" ? t("systemLanguage") : language.name;
        languageSelect.append(option);
    });
    languageSelect.value = appState.language;
}

function applyLanguage(language) {
    appState.language = i18n.languages.some((item) => item.code === language) ? language : "system";
    const resolved = i18n.resolve(appState.language);
    root.lang = resolved;
    root.dir = resolved === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = t(element.dataset.i18n);
    });

    populateLanguageSelect();
    settingsWindow.setAttribute("aria-label", t("settings"));
    settingsButton.setAttribute("aria-label", t("openSettings"));
    settingsBack.setAttribute("aria-label", t("back"));
    toolBack.setAttribute("aria-label", t("back"));
    backButton.setAttribute("aria-label", t("back"));
    applyTheme(root.dataset.theme || readTheme());

    modeOptions.forEach((mode) => {
        const isSelected = mode.dataset.profile === appState.activeProfile;
        mode.classList.toggle("is-active", isSelected);
        mode.setAttribute("aria-pressed", String(isSelected));
        mode.querySelector(".status-label").textContent = t(isSelected ? "active" : "off");
    });
    const profile = PROFILE_CONFIG[appState.activeProfile];
    if (profile) {
        profileMeta.textContent = profile.shortName;
        currentProfile.querySelector("strong").textContent = t(profile.nameKey);
        currentProfile.querySelector("p").textContent = t(profile.descriptionKey);
    } else {
        profileMeta.textContent = "—";
        currentProfile.querySelector("strong").textContent = t("noActiveProfile");
        currentProfile.querySelector("p").textContent = t("chooseProfileHint");
    }
    if (appState.activeTool) {
        const tool = TOOL_CONFIG[appState.activeTool];
        toolWindowTitle.textContent = t(tool.titleKey);
        const intro = toolWindowBody.querySelector(".tool-intro");
        if (intro) intro.textContent = t(tool.descriptionKey);
        if (toolWindowState.dataset.stateKey === "ready") toolPrimaryAction.textContent = t(tool.actionKey);
        if (toolWindowState.dataset.stateKey === "complete") toolPrimaryAction.textContent = t(tool.doneKey);
    }
    if (appState.diagnostics) renderDiagnostics(appState.diagnostics);
    if (toolWindowState.dataset.stateKey) setToolState(toolWindowState.dataset.stateKey, toolWindowState.dataset.stateClass || "");
}

function readTheme() {
    try { return localStorage.getItem("theme") === "light" ? "light" : "dark"; }
    catch { return "dark"; }
}

function applyTheme(theme) {
    const isLight = theme === "light";
    root.dataset.theme = theme;
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.setAttribute("aria-label", t(isLight ? "darkTheme" : "lightTheme"));
    themeColor.setAttribute("content", isLight ? "#F4F4F4" : "#080b0f");
}

function setText(selector, value, scope = document) {
    const element = scope.querySelector(selector);
    if (element) element.textContent = value ?? "—";
}

function formatNumber(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return Number.isInteger(number) ? String(number) : number.toFixed(digits);
}

function getHealthLabel(score) {
    if (!Number.isFinite(Number(score))) return t("unavailable");
    if (score >= 95) return t("optimized");
    if (score >= 80) return t("good");
    if (score >= 50) return t("needsOptimization");
    return t("poor");
}

function getHealthClass(score) {
    if (!Number.isFinite(Number(score))) return "is-unknown";
    if (score >= 95) return "is-optimized";
    if (score >= 80) return "is-good";
    if (score >= 50) return "is-warning";
    return "is-error";
}

function setHeaderState(label, stateClass = "is-unknown") {
    scanState.textContent = label;
    headerStatus.className = stateClass;
}

function setCheck(name, label, stateClass) {
    const result = document.querySelector(`[data-check="${name}"] strong`);
    if (!result) return;
    result.textContent = label;
    result.className = stateClass;
}

function setScanning(isScanning) {
    setInteractionLock("network-scan", isScanning);
    scanButton.disabled = isScanning;
    scanButton.classList.toggle("is-scanning", isScanning);
    headerStatus.classList.toggle("is-scanning", isScanning);
    if (isScanning) {
        scanState.textContent = t("scanning");
        lastScan.textContent = t("scanning");
    }
}

function setInteractionLock(reason, locked) {
    if (locked) appState.busyReasons.add(reason);
    else appState.busyReasons.delete(reason);
    const isBusy = appState.busyReasons.size > 0;
    mainApp.inert = isBusy;
    mainApp.classList.toggle("is-busy", isBusy);
    mainApp.setAttribute("aria-busy", String(isBusy));
}

function renderConnectionStatus(status) {
    appState.status = status;
    const adapter = status?.adapter || {};
    const network = status?.network || {};
    setText('[data-live="type"]', adapter.connectionType);
    setText('[data-result="link"]', adapter.linkSpeedMbps);
    setText('[data-result="mtu"]', network.mtu);
}

function renderDiagnostics(diagnostics) {
    appState.diagnostics = diagnostics;
    const score = Number(diagnostics?.score);
    const issues = Array.isArray(diagnostics?.issues) ? diagnostics.issues : [];
    const healthClass = getHealthClass(score);
    const healthLabel = getHealthLabel(score);
    const status = appState.status || {};

    setText('[data-metric="ping"]', formatNumber(diagnostics?.internet?.averageMs));
    setText('[data-metric="jitter"]', formatNumber(diagnostics?.internet?.jitterMs));
    setText('[data-metric="loss"]', formatNumber(diagnostics?.internet?.packetLossPercent));
    setText('[data-metric="dns"]', formatNumber(diagnostics?.dns?.medianMs));
    setText('[data-result="ping"]', formatNumber(diagnostics?.internet?.averageMs));
    setText('[data-result="jitter"]', formatNumber(diagnostics?.internet?.jitterMs));
    setText('[data-result="loss"]', formatNumber(diagnostics?.internet?.packetLossPercent));
    setText('[data-result="dns"]', formatNumber(diagnostics?.dns?.medianMs));
    setText('[data-result="gateway"]', formatNumber(diagnostics?.gateway?.averageMs));
    setText('[data-result="route"]', diagnostics?.routeHops);
    setText('[data-result="mtu"]', diagnostics?.mtu ?? status.network?.mtu);
    setText('[data-result="link"]', status.adapter?.linkSpeedMbps);

    setCheck("dns", diagnostics?.dns?.available ? t("good") : t("unavailable"), diagnostics?.dns?.available ? "is-good" : "is-warning");
    setCheck("tcp", diagnostics?.tcp443 ? t("good") : t("unavailable"), diagnostics?.tcp443 ? "is-good" : "is-warning");
    setCheck("adapter", status.adapter?.status === "Up" ? t("good") : "Offline", status.adapter?.status === "Up" ? "is-good" : "is-error");
    setCheck("background", "Not measured", "is-unknown");
    setCheck("mtu", diagnostics?.mtu ? "Detected" : "Unavailable", diagnostics?.mtu ? "is-good" : "is-unknown");
    setCheck("stability", diagnostics?.internet?.packetLossPercent === 0 ? t("good") : t("needsOptimization"), diagnostics?.internet?.packetLossPercent === 0 ? "is-good" : "is-warning");

    const scoreText = Number.isFinite(score) ? `${score}%` : "—";
    document.querySelector(".health-score").textContent = scoreText;
    document.querySelector(".health-score").className = `health-score ${healthClass}`;
    healthSummary.querySelector("b").textContent = scoreText;
    healthSummary.querySelector("b").className = healthClass;
    healthSummary.querySelector("strong").textContent = issues.length === 0 ? "All measured checks passed" : `${issues.length} issue${issues.length === 1 ? "" : "s"} detected`;
    healthSummary.style.setProperty("--health-score", `${Math.max(0, Math.min(100, score || 0))}%`);

    const fixableIssues = issues.filter((issue) => issue.id === "dns-latency");
    optimizeButton.disabled = fixableIssues.length === 0;
    optimizeButton.textContent = fixableIssues.length > 0 ? `Optimize ${fixableIssues.length} Issue${fixableIssues.length === 1 ? "" : "s"}` : "No Safe Automatic Fixes";
    optimizeButton.dataset.fixable = fixableIssues.map((issue) => issue.id).join(",");
    setHeaderState(healthLabel, healthClass);
    lastScan.textContent = t("justNow");
}

function renderScanError(result) {
    const message = result?.error?.message || "Network data is unavailable.";
    setHeaderState(t("unavailable"), "is-error");
    lastScan.textContent = t("failed");
    healthSummary.querySelector("strong").textContent = message;
    healthSummary.querySelector("b").textContent = "—";
    healthSummary.style.setProperty("--health-score", "0%");
    optimizeButton.disabled = true;
    optimizeButton.textContent = "Diagnostics Unavailable";
}

function renderPreview() {
    const previewStatus = {
        adapter: { connectionType: "Preview", linkSpeedMbps: 1000, status: "Up", description: "Desktop backend unavailable" },
        network: { mtu: 1500, dnsServers: ["1.1.1.1"], gateway: "192.168.1.1" }
    };
    const previewDiagnostics = {
        score: 82,
        internet: { averageMs: 18, jitterMs: 3, packetLossPercent: 0 },
        gateway: { averageMs: 1 },
        dns: { medianMs: 11, available: true },
        tcp443: true,
        routeHops: 8,
        mtu: 1500,
        issues: [{ id: "preview", label: "Desktop backend unavailable" }]
    };
    renderConnectionStatus(previewStatus);
    renderDiagnostics(previewDiagnostics);
    setHeaderState("Preview", "is-unknown");
    lastScan.textContent = "Browser mode";
    setText('[data-live="download"]', "—");
    setText('[data-live="upload"]', "—");
}

async function runAutoScan() {
    const scanId = ++appState.scanId;
    setScanning(true);
    document.querySelectorAll("[data-metric]").forEach((metric) => { metric.textContent = "—"; });
    if (!nativeApi) {
        window.setTimeout(() => {
            if (scanId !== appState.scanId) return;
            renderPreview();
            setScanning(false);
        }, 350);
        return;
    }

    try {
        const capabilities = await nativeApi.getCapabilities();
        if (scanId !== appState.scanId) return;
        appState.capabilities = capabilities.data;
        if (!capabilities.ok || capabilities.data?.supported === false) {
            renderScanError(capabilities);
            return;
        }
        const statusResult = await nativeApi.getStatus();
        if (scanId !== appState.scanId) return;
        if (!statusResult.ok) {
            renderScanError(statusResult);
            return;
        }
        renderConnectionStatus(statusResult.data);
        const diagnosticsResult = await nativeApi.runDiagnostics();
        if (scanId !== appState.scanId) return;
        if (!diagnosticsResult.ok) {
            renderScanError(diagnosticsResult);
            return;
        }
        renderDiagnostics(diagnosticsResult.data);
        startLiveTraffic();
        loadNativeHistory();
    } catch (error) {
        if (scanId === appState.scanId) renderScanError({ error: { message: error.message } });
    } finally {
        if (scanId === appState.scanId) setScanning(false);
    }
}

async function updateLiveTraffic() {
    if (!nativeApi || document.hidden) return;
    const result = await nativeApi.getTraffic();
    if (!result.ok) return;
    const sample = result.data;
    const previous = appState.trafficSample;
    appState.trafficSample = sample;
    if (!previous) return;
    const elapsedSeconds = (Number(sample.timestamp) - Number(previous.timestamp)) / 1000;
    const receivedDelta = Number(sample.receivedBytes) - Number(previous.receivedBytes);
    const sentDelta = Number(sample.sentBytes) - Number(previous.sentBytes);
    if (elapsedSeconds <= 0 || receivedDelta < 0 || sentDelta < 0) return;
    setText('[data-live="download"]', ((receivedDelta * 8) / elapsedSeconds / 1_000_000).toFixed(2));
    setText('[data-live="upload"]', ((sentDelta * 8) / elapsedSeconds / 1_000_000).toFixed(2));
}

function startLiveTraffic() {
    if (appState.trafficTimer) return;
    updateLiveTraffic();
    appState.trafficTimer = window.setInterval(updateLiveTraffic, 2000);
}

function addRecentChange(label, value) {
    const changes = document.querySelector(".recent-changes ul");
    changes.querySelector(".is-empty")?.remove();
    const item = document.createElement("li");
    const name = document.createElement("span");
    const detail = document.createElement("b");
    name.textContent = label;
    detail.textContent = value;
    item.append(name, detail);
    changes.prepend(item);
    while (changes.children.length > 4) changes.lastElementChild.remove();
}

async function loadNativeHistory() {
    if (!nativeApi) return;
    const result = await nativeApi.getHistory();
    if (!result.ok || result.data.length === 0) return;
    const list = document.querySelector(".recent-changes ul");
    list.replaceChildren();
    result.data.slice(0, 4).forEach((entry) => {
        const changes = Array.isArray(entry.changed) ? entry.changed : [];
        const detail = changes.length > 0 ? changes.map((change) => `${change.setting}: ${change.after}`).join(", ") : entry.ok ? "Completed" : "Failed";
        addRecentChange(entry.action.replaceAll("-", " "), detail);
    });
}

function createToolGroup(className, rows) {
    const group = document.createElement("div");
    group.className = className;
    rows.forEach(([label, value, stateClass]) => {
        const row = document.createElement("div");
        const name = document.createElement("span");
        const result = document.createElement("strong");
        name.textContent = label;
        result.textContent = value ?? "—";
        if (stateClass) result.classList.add(stateClass);
        row.append(name, result);
        group.append(row);
    });
    return group;
}

function renderToolContent(toolKey, info, checks, noteText) {
    const tool = TOOL_CONFIG[toolKey];
    const intro = document.createElement("p");
    const note = document.createElement("p");
    intro.className = "tool-intro";
    intro.textContent = t(tool.descriptionKey);
    note.className = `tool-note${tool.danger ? " is-danger" : ""}`;
    note.textContent = noteText;
    toolWindowBody.className = "tool-window-body";
    toolWindowBody.replaceChildren(intro, createToolGroup("tool-info", info), createToolGroup("tool-checks", checks), note);
}

function setToolState(label, stateClass = "") {
    const stateKeys = {
        Ready: "ready", Loading: "loading", Running: "running", Complete: "complete",
        Error: "error", Failed: "failed", Preview: "unavailable", "Admin Required": "unavailable"
    };
    const knownKeys = new Set(["ready", "loading", "running", "complete", "error", "failed", "unavailable"]);
    const stateKey = stateKeys[label] || (knownKeys.has(label) ? label : "");
    toolWindowState.textContent = stateKey ? t(stateKey) : label;
    toolWindowState.className = `tool-window-state${stateClass ? ` ${stateClass}` : ""}`;
    toolWindowState.dataset.stateKey = stateKey;
    toolWindowState.dataset.stateClass = stateClass;
}

function getStatusToolRows() {
    const status = appState.status;
    if (!status) return [["Connection", "Unavailable"], ["Adapter", "Unavailable"]];
    return [
        ["Connection", status.adapter?.connectionType],
        ["Adapter", status.adapter?.description],
        ["Link Speed", status.adapter?.linkSpeedMbps ? `${status.adapter.linkSpeedMbps} Mbps` : "—"],
        ["Gateway", status.network?.gateway],
        ["DNS", status.network?.dnsServers?.join(", ") || "Automatic"],
        ["MTU", status.network?.mtu]
    ];
}

function readSavedGame() {
    try { return JSON.parse(localStorage.getItem("gamingGame") || "null"); }
    catch { return null; }
}

function readManualGames() {
    try {
        const games = JSON.parse(localStorage.getItem("manualGames") || "[]");
        if (!Array.isArray(games)) return [];
        return games.slice(0, 50).filter((game) =>
            game && typeof game.id === "string" && typeof game.name === "string" && game.name.length <= 160 &&
            typeof game.installLocation === "string" && game.installLocation.length <= 1024 &&
            typeof game.executable === "string" && game.executable.length <= 1024
        );
    } catch {
        return [];
    }
}

function saveManualGame(game) {
    const games = readManualGames().filter((item) => item.executable.toLowerCase() !== game.executable.toLowerCase());
    games.push(game);
    localStorage.setItem("manualGames", JSON.stringify(games.slice(-50)));
}

function mergeGameLists(detectedGames, manualGames) {
    const merged = new Map();
    [...detectedGames, ...manualGames].forEach((game) => {
        const key = (game.installLocation || game.executable || game.id).toLowerCase();
        if (!merged.has(key) || game.source !== "Manual") merged.set(key, game);
    });
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function analyzeSelectedGame(game, operationId) {
    const serverStatus = toolWindowBody.querySelector(".game-server-status");
    if (!serverStatus || !nativeApi) return;
    const refreshButton = toolWindowBody.querySelector(".game-server-refresh");
    const scanToken = (appState.toolContext.serverScanToken || 0) + 1;
    const busyReason = `game-server-${scanToken}`;
    appState.toolContext.serverScanToken = scanToken;
    serverStatus.textContent = t("scanning");
    if (refreshButton) refreshButton.disabled = true;
    setInteractionLock(busyReason, true);
    let result;
    try {
        result = await nativeApi.analyzeGameConnections(game);
    } catch (error) {
        result = { ok: false, error: { message: error?.message || t("unavailable") } };
    }
    setInteractionLock(busyReason, false);
    if (operationId !== appState.operationId || appState.activeTool !== "gaming" || scanToken !== appState.toolContext.serverScanToken) return;
    if (refreshButton) refreshButton.disabled = false;
    if (!result.ok) {
        serverStatus.textContent = result.error?.message || t("unavailable");
        return;
    }
    const nearest = result.data?.nearestObserved;
    if (nearest) {
        const endpoint = `${nearest.address}:${nearest.port}`;
        const latency = Number.isFinite(Number(nearest.latencyMs)) ? ` • ${formatNumber(nearest.latencyMs)} ms` : "";
        const process = nearest.processName ? ` • ${nearest.processName}` : "";
        serverStatus.textContent = `${endpoint}${latency} • ${nearest.protocol || "TCP"}${process}`;
    } else {
        serverStatus.textContent = result.data?.running ? t("udpRelayNotVisible") : t("noActiveServer");
    }
}

function renderGamingSelector(data, operationId) {
    const games = Array.isArray(data?.games) ? data.games : [];
    const saved = readSavedGame();
    renderToolContent("gaming", [[t("gamesFound"), games.length], [t("server"), t("gameManagedRouting")]], [], t("gamingRoutingNote"));

    const list = document.createElement("div");
    list.className = "game-list";
    const placeholder = toolWindowBody.querySelector(".tool-checks");
    placeholder.replaceWith(list);

    const actions = document.createElement("div");
    actions.className = "game-library-actions";
    const rescanButton = document.createElement("button");
    const addButton = document.createElement("button");
    rescanButton.type = "button";
    addButton.type = "button";
    rescanButton.textContent = `↻ ${t("findGames")}`;
    addButton.textContent = `＋ ${t("addGame")}`;
    rescanButton.addEventListener("click", () => openTool("gaming"));
    addButton.addEventListener("click", async () => {
        const result = await nativeApi?.chooseGameExecutable();
        if (!result || result.data?.canceled) return;
        if (!result.ok || !result.data?.game) {
            window.alert(result.error?.message || "The selected game could not be added.");
            return;
        }
        try { saveManualGame(result.data.game); }
        catch (error) { window.alert(error.message); return; }
        openTool("gaming");
    });
    actions.append(rescanButton, addButton);
    list.before(actions);

    if (games.length === 0) {
        const empty = document.createElement("p");
        empty.className = "game-empty";
        empty.textContent = t("noGamesFound");
        list.append(empty);
        toolPrimaryAction.disabled = true;
    } else {
        games.forEach((game) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "game-option";
            const copy = document.createElement("span");
            const name = document.createElement("strong");
            const source = document.createElement("small");
            const state = document.createElement("b");
            name.textContent = game.name;
            source.textContent = game.source === "Manual" ? t("manual") : game.source;
            state.textContent = t(game.running ? "running" : "installed");
            copy.append(name, source);
            button.append(copy, state);
            button.addEventListener("click", () => {
                list.querySelectorAll(".game-option").forEach((option) => option.classList.remove("is-selected"));
                button.classList.add("is-selected");
                appState.toolContext.selectedGame = game;
                toolPrimaryAction.disabled = false;
                analyzeSelectedGame(game, operationId);
            });
            list.append(button);
            if (saved?.id === game.id) button.click();
        });
    }

    const server = document.createElement("div");
    server.className = "game-server-panel";
    const serverLabel = document.createElement("strong");
    const serverStatus = document.createElement("span");
    const refreshServer = document.createElement("button");
    serverLabel.textContent = t("observedServer");
    serverStatus.className = "game-server-status";
    serverStatus.textContent = t("noActiveServer");
    refreshServer.type = "button";
    refreshServer.className = "game-server-refresh";
    refreshServer.textContent = `↻ ${t("checkServerAgain")}`;
    refreshServer.addEventListener("click", () => {
        const selected = appState.toolContext.selectedGame;
        if (selected) analyzeSelectedGame(selected, operationId);
    });
    server.append(serverLabel, serverStatus, refreshServer);
    actions.after(server);
    if (appState.toolContext.selectedGame) analyzeSelectedGame(appState.toolContext.selectedGame, operationId);
}

async function loadToolData(toolKey, operationId) {
    if (toolKey === "gaming") {
        if (!nativeApi) {
            renderToolContent(toolKey, [[t("gamesFound"), "—"]], [["Desktop backend", t("unavailable"), "is-warning"]], "Installed-game discovery requires the Windows desktop app.");
            toolPrimaryAction.disabled = true;
            setToolState("Preview", "is-warning");
            return;
        }
        const gameResult = await nativeApi.scanInstalledGames();
        if (operationId !== appState.operationId) return;
        if (!gameResult.ok) throw new Error(gameResult.error?.message || "Installed-game scan failed.");
        const games = mergeGameLists(Array.isArray(gameResult.data?.games) ? gameResult.data.games : [], readManualGames());
        renderGamingSelector({ ...gameResult.data, games }, operationId);
        setToolState("Ready");
        return;
    }
    const statusRows = getStatusToolRows();
    if (!nativeApi) {
        renderToolContent(toolKey, statusRows, [["Desktop backend", "Required", "is-warning"]], "Open BYTE BOOST with npm start to use real Windows tools.");
        toolPrimaryAction.disabled = true;
        setToolState("Preview", "is-warning");
        return;
    }

    let info = statusRows;
    let checks = [];
    let note = "Values are read from the active physical adapter. Changes require confirmation and a saved baseline.";
    let result;

    if (toolKey === "dns") {
        result = await nativeApi.benchmarkDns();
        if (operationId !== appState.operationId) return;
        if (!result.ok) throw new Error(result.error?.message || "DNS benchmark failed.");
        appState.toolContext.dnsRecommended = result.data.recommended;
        info = [["Current DNS", appState.status?.network?.dnsServers?.join(", ") || "Automatic"], ["Recommended", result.data.recommended || "Unavailable"], ["Managed Policy", result.data.managedPolicyDetected ? "Detected" : "None"]];
        checks = result.data.results.map((server) => [server.server, server.available ? `${server.medianMs} ms` : "Failed", server.available ? "" : "is-warning"]);
        if (result.data.managedPolicyDetected) {
            note = "Windows reports an effective NRPT policy. Automatic public-DNS replacement is disabled.";
            appState.toolContext.blockAction = true;
            toolPrimaryAction.disabled = true;
        }
    } else if (toolKey === "mtu") {
        result = await nativeApi.testMtu();
        if (operationId !== appState.operationId) return;
        if (!result.ok) throw new Error(result.error?.message || "MTU test failed.");
        appState.toolContext.mtu = result.data;
        info = [["Current MTU", result.data.current], ["Recommended", result.data.recommended], ["Target", result.data.target]];
        checks = [["Path MTU result", result.data.reliable ? "Reliable" : "Inconclusive", result.data.reliable ? "" : "is-warning"]];
        note = result.data.reliable ? "Path MTU is destination-specific. BYTE BOOST only offers a change when the test is conclusive." : "ICMP replies were insufficient, so BYTE BOOST will not change MTU automatically.";
        if (!result.data.reliable || result.data.recommended === result.data.current) {
            toolPrimaryAction.textContent = result.data.reliable ? "Current MTU Is Optimal" : "MTU Test Inconclusive";
            toolPrimaryAction.disabled = true;
        } else {
            toolPrimaryAction.textContent = `Apply MTU ${result.data.recommended}`;
            appState.toolContext.mtuCanApply = true;
        }
    } else if (toolKey === "diagnostics") {
        result = await nativeApi.runDiagnostics();
        if (operationId !== appState.operationId) return;
        if (!result.ok) throw new Error(result.error?.message || "Diagnostics failed.");
        appState.diagnostics = result.data;
        info = [["Health", `${result.data.score}%`], ["Measured", "Just now"], ["Issues", result.data.issues.length]];
        checks = [
            ["Gateway", result.data.gateway?.reachable ? `${formatNumber(result.data.gateway.averageMs)} ms` : "Unavailable", result.data.gateway?.reachable ? "" : "is-warning"],
            ["Internet", result.data.internet?.reachable || result.data.tcp443 ? "Online" : "Unavailable", result.data.internet?.reachable || result.data.tcp443 ? "" : "is-warning"],
            ["DNS", result.data.dns?.available ? `${formatNumber(result.data.dns.medianMs)} ms` : "Failed", result.data.dns?.available ? "" : "is-warning"],
            ["Packet Loss", `${formatNumber(result.data.internet?.packetLossPercent)}%`, result.data.internet?.packetLossPercent === 0 ? "" : "is-warning"],
            ["Route", result.data.routeHops == null ? "Unavailable" : `${result.data.routeHops} hops`]
        ];
        renderDiagnostics(result.data);
    } else if (toolKey === "repair") {
        checks = [["Clear DNS cache", "Ready"], ["Renew DHCP lease", "When supported"], ["Winsock/TCP reset", "Not automatic", "is-pending"]];
        note = "BYTE BOOST does not automatically run broad Winsock or TCP/IP resets because they can disrupt VPN and security drivers.";
    } else if (toolKey === "adapter") {
        checks = [["Physical adapter", appState.status?.adapter?.hardwareInterface ? "Confirmed" : "Unknown"], ["Receive Side Scaling", "Capability checked on apply"], ["Power settings", "Capability checked on apply"]];
        note = "Only settings reported as supported by this adapter are changed; checksum offload and IPv6 remain enabled.";
    } else if (toolKey === "restore") {
        const history = await nativeApi.getHistory();
        if (operationId !== appState.operationId) return;
        const count = history.ok ? history.data.filter((entry) => entry.ok).length : 0;
        info = [["Completed Changes", count], ["Restore Scope", "BYTE BOOST only"], ["Adapter", appState.status?.adapter?.description]];
        checks = [["DNS", "Saved baseline"], ["MTU", "Saved baseline"], ["Adapter settings", "Saved baseline"]];
        note = "This restores captured values, not guessed factory defaults. A restart may be required.";
    }

    renderToolContent(toolKey, info, checks, note);
    setToolState("Ready", TOOL_CONFIG[toolKey].danger ? "is-danger" : "");
}

async function openTool(toolKey) {
    const tool = TOOL_CONFIG[toolKey];
    const operationId = ++appState.operationId;
    appState.activeTool = toolKey;
    appState.toolContext = {};
    appState.lastFocusedElement = document.activeElement;
    toolWindow.dataset.activeTool = toolKey;
    toolWindowTitle.textContent = t(tool.titleKey);
    toolPrimaryAction.textContent = t(tool.actionKey);
    toolPrimaryAction.disabled = true;
    toolPrimaryAction.className = `tool-primary-action${tool.danger ? " is-danger" : ""}`;
    setToolState("Loading", "is-running");
    renderToolContent(toolKey, [["Status", "Loading..."]], [["Windows backend", "Reading..."]], "Please wait while BYTE BOOST reads the active connection.");
    featurePanel.hidden = true;
    toolWindow.hidden = false;
    toolBack.focus();

    try {
        await loadToolData(toolKey, operationId);
        if (operationId === appState.operationId && nativeApi && toolKey !== "mtu" && !appState.toolContext.blockAction && (toolKey !== "gaming" || appState.toolContext.selectedGame)) {
            toolPrimaryAction.disabled = false;
        }
    } catch (error) {
        if (operationId !== appState.operationId) return;
        setToolState("Error", "is-danger");
        renderToolContent(toolKey, getStatusToolRows(), [["Operation", "Unavailable", "is-warning"]], error.message);
        toolPrimaryAction.disabled = true;
    }
}

function closeTool() {
    appState.operationId++;
    appState.activeTool = null;
    toolWindow.hidden = true;
    featurePanel.hidden = false;
    appState.lastFocusedElement?.focus();
}

function openSettings() {
    appState.settingsReturnFocus = document.activeElement;
    settingsWindow.hidden = false;
    languageSelect.focus();
}

function closeSettings() {
    settingsWindow.hidden = true;
    appState.settingsReturnFocus?.focus();
}

async function requestAdministratorRestart(result) {
    if (!result?.requiresAdmin) return false;
    const shouldRestart = window.confirm("This action requires administrator permission. Restart BYTE BOOST as administrator?");
    if (!shouldRestart) {
        setHeaderState("Admin Required", "is-warning");
        setToolState("Admin Required", "is-warning");
        if (appState.activeTool) {
            toolPrimaryAction.textContent = t(TOOL_CONFIG[appState.activeTool].actionKey);
            toolPrimaryAction.disabled = false;
        }
        return true;
    }
    const restartResult = await nativeApi.restartAsAdmin();
    if (!restartResult.ok) window.alert(restartResult.error?.message || "Administrator restart was cancelled.");
    return true;
}

function renderAppliedChanges(tool, result) {
    const changes = Array.isArray(result.data?.changed) ? result.data.changed : [];
    const checks = changes.length > 0 ? changes.map((change) => [change.setting, `${change.before} → ${change.after}`]) : [["Verified changes", "No change needed"]];
    const restartNote = result.data?.requiresRestart ? "Windows or the network adapter may need to restart before every change takes effect." : "Windows confirmed the completed operation.";
    renderToolContent(appState.activeTool, getStatusToolRows(), checks, restartNote);
    toolWindowBody.classList.add("is-complete");
    setToolState("Complete");
    toolPrimaryAction.textContent = t(tool.doneKey);
    toolPrimaryAction.disabled = true;
    changes.forEach((change) => addRecentChange(change.setting, `${change.before} → ${change.after}`));
}

async function executeToolAction() {
    if (!nativeApi || !appState.activeTool) return;
    const toolKey = appState.activeTool;
    const tool = TOOL_CONFIG[toolKey];
    const operationId = ++appState.operationId;
    if (tool.mutating) {
        const confirmed = window.confirm(`${t(tool.titleKey)}\n\n${t(tool.descriptionKey)}\n\nBYTE BOOST will save a baseline before changing Windows. Continue?`);
        if (!confirmed) return;
    }
    toolPrimaryAction.disabled = true;
    toolPrimaryAction.textContent = toolKey === "diagnostics" || toolKey === "mtu" ? "Testing..." : "Applying...";
    setToolState("Running", "is-running");

    try {
        let result;
        if (toolKey === "gaming") result = appState.toolContext.selectedGame ? await nativeApi.applyProfile("gaming") : { ok: false, error: { message: "Select a game first." } };
        else if (toolKey === "dns") result = appState.toolContext.dnsRecommended ? await nativeApi.applyDns(appState.toolContext.dnsRecommended) : { ok: false, error: { message: "No reliable DNS recommendation is available." } };
        else if (toolKey === "repair") result = await nativeApi.repairNetwork();
        else if (toolKey === "mtu") result = appState.toolContext.mtuCanApply ? await nativeApi.applyMtu(appState.toolContext.mtu.recommended) : await nativeApi.testMtu();
        else if (toolKey === "adapter") result = await nativeApi.optimizeAdapter();
        else if (toolKey === "diagnostics") result = await nativeApi.runDiagnostics();
        else if (toolKey === "restore") result = await nativeApi.restoreBaseline();

        if (operationId !== appState.operationId || appState.activeTool !== toolKey) return;
        if (!result.ok) {
            if (await requestAdministratorRestart(result)) return;
            throw new Error(result.error?.message || "The Windows operation failed.");
        }
        if (toolKey === "diagnostics") {
            renderDiagnostics(result.data);
            await loadToolData(toolKey, operationId);
            toolPrimaryAction.textContent = t(tool.doneKey);
            toolPrimaryAction.disabled = false;
            setToolState("Complete");
        } else if (toolKey === "mtu" && !appState.toolContext.mtuCanApply) {
            await loadToolData(toolKey, operationId);
        } else {
            if (toolKey === "restore") clearActiveProfile();
            if (toolKey === "gaming") {
                try { localStorage.setItem("gamingGame", JSON.stringify(appState.toolContext.selectedGame)); } catch { }
                const gamingOption = modeOptions.find((option) => option.dataset.profile === "gaming");
                if (gamingOption) selectProfile(gamingOption);
            }
            renderAppliedChanges(tool, result);
            runAutoScan();
            loadNativeHistory();
        }
    } catch (error) {
        if (operationId !== appState.operationId) return;
        setToolState("Failed", "is-danger");
        toolPrimaryAction.textContent = "Try Again";
        toolPrimaryAction.disabled = false;
        const note = document.createElement("p");
        note.className = "tool-note is-danger";
        note.textContent = error.message;
        toolWindowBody.append(note);
    }
}

function selectProfile(option) {
    const profile = PROFILE_CONFIG[option.dataset.profile];
    const selectedName = t(profile.nameKey);
    modeOptions.forEach((mode) => {
        const isSelected = mode === option;
        mode.classList.toggle("is-active", isSelected);
        mode.setAttribute("aria-pressed", String(isSelected));
        mode.querySelector(".status-label").textContent = t(isSelected ? "active" : "off");
    });
    appState.activeProfile = profile.id;
    try { localStorage.setItem("activeProfile", profile.id); } catch { }
    profileMeta.textContent = profile.shortName;
    currentProfile.querySelector("strong").textContent = selectedName;
    currentProfile.querySelector("p").textContent = t(profile.descriptionKey);
}

function clearActiveProfile() {
    appState.activeProfile = null;
    try { localStorage.removeItem("activeProfile"); } catch { }
    modeOptions.forEach((mode) => {
        mode.classList.remove("is-active");
        mode.setAttribute("aria-pressed", "false");
        mode.querySelector(".status-label").textContent = t("off");
    });
    profileMeta.textContent = "—";
    currentProfile.querySelector("strong").textContent = t("noActiveProfile");
    currentProfile.querySelector("p").textContent = t("chooseProfileHint");
}

async function applyProfile(option) {
    const profile = PROFILE_CONFIG[option.dataset.profile];
    const selectedName = t(profile.nameKey);
    const previous = modeOptions.find((mode) => mode.classList.contains("is-active"));
    if (!nativeApi) {
        selectProfile(option);
        addRecentChange("Preview", `${selectedName} selected; no Windows change was made`);
        return;
    }
    if (!window.confirm(`Apply ${selectedName}?\n\n${t(profile.descriptionKey)}\n\nA baseline will be saved before supported Windows settings are changed.`)) return;
    option.disabled = true;
    setHeaderState("Applying...", "is-warning");
    const result = await nativeApi.applyProfile(profile.id);
    option.disabled = false;
    if (!result.ok) {
        if (await requestAdministratorRestart(result)) return;
        window.alert(result.error?.message || "The profile could not be applied.");
        if (previous) selectProfile(previous);
        runAutoScan();
        return;
    }
    selectProfile(option);
    const changes = Array.isArray(result.data?.changed) ? result.data.changed : [];
    addRecentChange("Profile", changes.length > 0 ? `${selectedName}: ${changes.length} supported changes` : `${selectedName}: no change needed`);
    runAutoScan();
}

loadCustomLanguagePacks();
appState.activeProfile = readAppliedProfile();
applyLanguage(readLanguage());
themeToggle.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    try { localStorage.setItem("theme", nextTheme); } catch { }
});
settingsButton.addEventListener("click", () => {
    if (settingsWindow.hidden) openSettings();
    else closeSettings();
});
settingsBack.addEventListener("click", closeSettings);
languageSelect.addEventListener("change", () => {
    applyLanguage(languageSelect.value);
    try { localStorage.setItem("language", appState.language); } catch { }
});
languageImportButton.addEventListener("click", () => languageFileInput.click());
languageFileInput.addEventListener("change", async () => {
    const file = languageFileInput.files?.[0];
    languageFileInput.value = "";
    if (!file) return;
    try {
        if (file.size > 200 * 1024) throw new Error("Language pack must be smaller than 200 KB.");
        const rawPack = JSON.parse(await file.text());
        const pack = i18n.addLanguagePack(rawPack);
        saveCustomLanguagePack(pack);
        applyLanguage(pack.code);
        localStorage.setItem("language", pack.code);
    } catch (error) {
        window.alert(error.message || "The language pack is invalid.");
    }
});
modeOptions.forEach((option) => option.addEventListener("click", () => {
    if (option.dataset.profile === "gaming") openTool("gaming");
    else applyProfile(option);
}));
document.querySelectorAll(".tool-item").forEach((item) => item.addEventListener("click", () => openTool(item.dataset.tool)));
toolBack.addEventListener("click", closeTool);
toolPrimaryAction.addEventListener("click", executeToolAction);
scanButton.addEventListener("click", runAutoScan);

healthSummary.addEventListener("click", () => {
    appState.lastFocusedElement = document.activeElement;
    dashboardView.hidden = true;
    resultsView.hidden = false;
    backButton.focus();
});
backButton.addEventListener("click", () => {
    resultsView.hidden = true;
    dashboardView.hidden = false;
    appState.lastFocusedElement?.focus();
});

optimizeButton.addEventListener("click", async () => {
    if (!nativeApi || !optimizeButton.dataset.fixable.includes("dns-latency")) return;
    if (!window.confirm("Benchmark DNS providers and apply the fastest reliable result?")) return;
    optimizeButton.disabled = true;
    optimizeButton.textContent = "Benchmarking DNS...";
    const benchmark = await nativeApi.benchmarkDns();
    if (!benchmark.ok || !benchmark.data.recommended || benchmark.data.managedPolicyDetected) {
        window.alert(benchmark.error?.message || "No safe automatic DNS change is available.");
        runAutoScan();
        return;
    }
    const result = await nativeApi.applyDns(benchmark.data.recommended);
    if (!result.ok) {
        if (await requestAdministratorRestart(result)) return;
        window.alert(result.error?.message || "DNS optimization failed.");
    }
    runAutoScan();
});

closeButton.addEventListener("click", () => nativeApi?.closeWindow());
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!settingsWindow.hidden) closeSettings();
    else if (!toolWindow.hidden) closeTool();
    else if (!resultsView.hidden) backButton.click();
});
window.addEventListener("beforeunload", () => {
    if (appState.trafficTimer) window.clearInterval(appState.trafficTimer);
});

runAutoScan();
