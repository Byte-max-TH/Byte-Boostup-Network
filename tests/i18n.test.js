"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadI18n(systemLanguage = "en-US") {
    const source = fs.readFileSync(path.join(__dirname, "..", "i18n.js"), "utf8");
    const sandbox = {
        window: {},
        navigator: { language: systemLanguage, languages: [systemLanguage] }
    };
    vm.runInNewContext(source, sandbox);
    return sandbox.window.byteBoostI18n;
}

test("ships a broad set of local language packs", () => {
    const i18n = loadI18n();
    assert.equal(i18n.languages.length, 18);
    assert.equal(i18n.translate("settings", "th"), "การตั้งค่า");
    assert.equal(i18n.translate("settings", "ar"), "الإعدادات");
});

test("system language resolves to a supported base locale", () => {
    const i18n = loadI18n("th-TH");
    assert.equal(i18n.resolve("system"), "th");
});

test("Chinese regional locales and unsupported locales have deterministic fallbacks", () => {
    const i18n = loadI18n();
    assert.equal(i18n.resolve("zh-HK"), "zh-TW");
    assert.equal(i18n.resolve("zh-SG"), "zh-CN");
    assert.equal(i18n.resolve("xx-YY"), "en");
});

test("accepts a validated custom BCP-47 language pack", () => {
    const i18n = loadI18n();
    i18n.addLanguagePack({ code: "he-IL", name: "עברית", strings: { settings: "הגדרות", unknown: "ignored" } });
    assert.equal(i18n.translate("settings", "he-IL"), "הגדרות");
    assert.equal(i18n.translate("language", "he-IL"), "Language");
    assert.equal(i18n.getDirection("he-IL"), "rtl");
});
