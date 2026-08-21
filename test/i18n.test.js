import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SUPPORTED_LOCALES,
  createI18n,
  detectLocale,
  localizedProperty,
  messages,
  normalizeLocale,
  usesJapaneseFallback
} from "../src/i18n.js";

test("browser language variants resolve to one of the five supported locales", () => {
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("zh-Hans-SG"), "zh-CN");
  assert.equal(normalizeLocale("zh-Hant-HK"), "zh-TW");
  assert.equal(normalizeLocale("ko-KR"), "ko");
  assert.equal(normalizeLocale("fr-FR"), "ja");
  assert.equal(detectLocale({ storedLocale: "zh-TW", browserLanguages: ["en-US"] }), "zh-TW");
  assert.equal(detectLocale({ browserLanguages: ["fr-FR", "en-GB"] }), "en");
});

test("every UI locale has exactly the Japanese catalog keys", () => {
  const expected = Object.keys(messages.ja).sort();
  assert.deepEqual([...SUPPORTED_LOCALES].sort(), ["en", "ja", "ko", "zh-CN", "zh-TW"].sort());
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(messages[locale]).sort(), expected, `${locale} catalog drift`);
    assert.ok(Object.values(messages[locale]).every((value) => typeof value === "string" && value.trim() !== ""));
  }
});

test("localized UI copy does not expose the internal unconfirmed state", () => {
  const internalTerms = /未確認|未确认|미확인|\bunconfirmed\b/i;
  for (const locale of SUPPORTED_LOCALES) {
    assert.doesNotMatch(Object.values(messages[locale]).join("\n"), internalTerms, locale);
  }
});

test("historical replay prioritizes the event instead of an internal verification badge", async () => {
  const [html, main] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(html, /replay-evidence-badge/);
  assert.doesNotMatch(main, /historicalEvidenceBadge|replay-evidence-badge/);
  assert.match(html, /id="replay-headline"/);
  assert.match(html, /id="replay-source-link"/);
  assert.match(html, /id="replay-safety-note"/);
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(messages[locale].historySafetyNotice);
    assert.doesNotMatch(messages[locale].historySafetyNotice, /verified|検証済み|已验证|已驗證|검증된/i);
  }
});

test("all static HTML translation keys exist in every locale", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const keys = [...html.matchAll(/data-i18n(?:-aria-label|-content)?="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(keys.length >= 20);
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of keys) assert.ok(messages[locale][key], `${locale}.${key} is missing`);
  }
});

test("translated events localize and live Japanese text falls back explicitly", () => {
  const translated = {
    title: "日本語",
    translations: { en: { title: "English" } }
  };
  const liveJapaneseOnly = { title: "公式日本語" };
  assert.equal(localizedProperty(translated, "title", "en"), "English");
  assert.equal(localizedProperty(liveJapaneseOnly, "title", "en"), "公式日本語");
  assert.equal(usesJapaneseFallback(translated, "en"), false);
  assert.equal(usesJapaneseFallback(liveJapaneseOnly, "en"), true);
  assert.equal(createI18n("ko").t("category.railway"), "철도");
});
