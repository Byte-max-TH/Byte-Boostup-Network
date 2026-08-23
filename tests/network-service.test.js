"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { NetworkService } = require("../electron/network-service");

function createService() {
    return new NetworkService({
        scriptPath: path.join(__dirname, "fixture.ps1"),
        stateDirectory: path.join(__dirname, ".state"),
        executablePath: process.execPath,
        appPath: path.join(__dirname, ".."),
        isPackaged: false
    });
}

test("rejects DNS command-injection strings before invoking PowerShell", async () => {
    const service = createService();
    let invoked = false;
    service.invoke = async () => { invoked = true; return { ok: true }; };

    const result = await service.applyDns({ server: "1.1.1.1; Start-Process calc" });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "INVALID_ARGUMENT");
    assert.equal(invoked, false);
});

test("rejects non-integer and out-of-range MTU values", async () => {
    const service = createService();

    assert.equal((await service.applyMtu({ mtu: "1500 & calc" })).ok, false);
    assert.equal((await service.applyMtu({ mtu: 575 })).ok, false);
    assert.equal((await service.applyMtu({ mtu: 9001 })).ok, false);
});

test("rejects unknown profile identifiers", async () => {
    const service = createService();
    const result = await service.applyProfile({ profile: "gaming;calc" });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "INVALID_ARGUMENT");
});

test("rejects forged or remote game installation paths", async () => {
    const service = createService();
    let invoked = false;
    service.invoke = async () => { invoked = true; return { ok: true }; };

    assert.equal((await service.analyzeGameConnections({ installLocation: "..\\Windows" })).ok, false);
    assert.equal((await service.analyzeGameConnections({ installLocation: "\\\\server\\games\\Demo" })).ok, false);
    assert.equal((await service.analyzeGameConnections({ installLocation: "C:\\Games\\Demo\u0000bad" })).ok, false);
    assert.equal(invoked, false);
});

test("allows a normalized local game path for read-only connection analysis", async () => {
    const service = createService();
    service.invoke = async (action, payload) => ({ ok: true, data: { action, payload } });

    const result = await service.analyzeGameConnections({ installLocation: "D:\\Games\\Demo\\..\\Demo", executable: "D:\\Games\\Demo\\Demo.exe" });

    assert.equal(result.ok, true);
    assert.equal(result.data.action, "analyze-game-connections");
    assert.equal(result.data.payload.installLocation, "D:\\Games\\Demo");
    assert.equal(result.data.payload.executable, "D:\\Games\\Demo\\Demo.exe");
});

test("rejects a game executable outside its installation folder", async () => {
    const service = createService();
    let invoked = false;
    service.invoke = async () => { invoked = true; return { ok: true }; };

    const result = await service.analyzeGameConnections({ installLocation: "D:\\Games\\Demo", executable: "D:\\Other\\Demo.exe" });

    assert.equal(result.ok, false);
    assert.equal(invoked, false);
});

test("allows a validated DNS action through the mutation gate", async () => {
    const service = createService();
    const actions = [];
    service.ensureBaseline = async () => ({ ok: true });
    service.appendHistory = async () => {};
    service.invoke = async (action, payload) => {
        actions.push({ action, payload });
        if (action === "get-capabilities") return { ok: true, data: { isAdmin: true } };
        return { ok: true, data: { changed: [] } };
    };

    const result = await service.applyDns({ server: "1.1.1.1" });

    assert.equal(result.ok, true);
    assert.deepEqual(actions.at(-1), { action: "apply-dns", payload: { server: "1.1.1.1" } });
});

test("blocks a second concurrent mutation", async () => {
    const service = createService();
    service.activeMutation = "apply-dns";

    const result = await service.optimizeAdapter();

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "BUSY");
});
