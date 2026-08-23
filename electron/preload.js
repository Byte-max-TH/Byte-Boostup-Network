"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("byteBoost", Object.freeze({
    platform: process.platform,
    getCapabilities: () => ipcRenderer.invoke("network:get-capabilities"),
    getStatus: () => ipcRenderer.invoke("network:get-status"),
    getTraffic: () => ipcRenderer.invoke("network:get-traffic"),
    runDiagnostics: () => ipcRenderer.invoke("network:run-diagnostics"),
    benchmarkDns: () => ipcRenderer.invoke("network:benchmark-dns"),
    testMtu: () => ipcRenderer.invoke("network:test-mtu"),
    scanInstalledGames: () => ipcRenderer.invoke("gaming:scan-installed"),
    analyzeGameConnections: (game) => ipcRenderer.invoke("gaming:analyze-connections", {
        installLocation: game?.installLocation,
        executable: game?.executable
    }),
    chooseGameExecutable: () => ipcRenderer.invoke("gaming:choose-executable"),
    applyDns: (server) => ipcRenderer.invoke("network:apply-dns", { server }),
    applyMtu: (mtu) => ipcRenderer.invoke("network:apply-mtu", { mtu }),
    repairNetwork: () => ipcRenderer.invoke("network:repair"),
    optimizeAdapter: () => ipcRenderer.invoke("network:optimize-adapter"),
    applyProfile: (profile) => ipcRenderer.invoke("network:apply-profile", { profile }),
    restoreBaseline: () => ipcRenderer.invoke("network:restore-baseline"),
    getHistory: () => ipcRenderer.invoke("network:get-history"),
    restartAsAdmin: () => ipcRenderer.invoke("app:restart-as-admin"),
    minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
    closeWindow: () => ipcRenderer.invoke("window:close")
}));
