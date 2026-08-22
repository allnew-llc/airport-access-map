import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL(`../${path}`, import.meta.url);

test("demo introduction requires explicit terms consent before opening the app", async () => {
  const [intro, script, guard, packageDocument] = await Promise.all([
    readFile(projectFile("public/demo-intro.html"), "utf8"),
    readFile(projectFile("public/demo-intro-v6.js"), "utf8"),
    readFile(projectFile("public/demo-app-guard-v3.js"), "utf8"),
    readFile(projectFile("package.json"), "utf8").then(JSON.parse)
  ]);

  assert.match(intro, /id="demo-consent-check"[^>]*required/);
  assert.match(intro, /id="demo-consent-submit"[^>]*disabled[^>]*data-copy="agree">同意<\/button>/);
  assert.match(intro, /href="\.\/terms\.html"/);
  assert.match(script, /localStorage\.setItem\(CONSENT_KEY/);
  assert.match(script, /airport-access-demo-terms-v4/);
  assert.match(script, /version: 4/);
  assert.match(guard, /airport-access-demo-terms-v4/);
  assert.match(script, /destinationUrl\.searchParams\.set\("lang"/);
  assert.match(script, /requestedLocale \?\? storedLocale \?\? navigator\.language/);
  assert.match(script, /location\.assign\(destinationUrl\)/);
  assert.match(guard, /location\.replace\("\.\/"\)/);
  assert.match(packageDocument.scripts["build:demo"], /prepare-demo-entry\.js/);
  assert.match(await readFile(projectFile("scripts/prepare-demo-entry.js"), "utf8"), /<base href=/);
});

test("demo introduction explains the one-view value before consent", async () => {
  const [intro, script, mapPreview] = await Promise.all([
    readFile(projectFile("public/demo-intro.html"), "utf8"),
    readFile(projectFile("public/demo-intro-v6.js"), "utf8"),
    readFile(projectFile("public/demo-map-narita-v1.webp"))
  ]);

  assert.match(intro, /data-copy="title">空港周辺の交通・気象情報をまとめて確認/);
  assert.match(intro, /data-copy="lead">鉄道・バス・道路の運行・規制と気象情報を、空港ごとに確認できるオープンソースWebアプリです。/);
  assert.match(script, /title: "Airport transport and weather in one view"/);
  assert.match(intro, /data-copy="problemLabel">これまで（複数の公式サイト）/);
  assert.match(intro, /class="developer-story"/);
  assert.match(intro, /data-copy="storyTitle">情報を探し回った経験から始まりました/);
  assert.match(script, /公共交通機関の乱れに遭遇した際/);
  assert.match(script, /This OSS is published as a practical starting point/);
  assert.match(intro, /class="source-card source-rail"/);
  assert.match(intro, /class="unified-card"/);
  assert.match(intro, /class="unified-map-base" src="\.\/demo-map-narita-v1\.webp"/);
  assert.doesNotMatch(intro, /class="map-line/);
  assert.ok(mapPreview.byteLength > 20_000, "the integrated map preview must retain geographic detail");
  assert.match(intro, /<dt><strong>33<\/strong><span data-copy="proofAirports">空港/);
  assert.match(intro, /<dt><strong>5<\/strong><span data-copy="proofLanguages">言語/);
  assert.match(intro, /<strong>1<\/strong><span data-copy="proofHistory">週間のデモ履歴/);
  assert.match(script, /impactText: "移動への影響：一部あり"/);
});

test("sample demo exposes normal and disruption scenarios in one select", async () => {
  const [html, main, translations] = await Promise.all([
    readFile(projectFile("index.html"), "utf8"),
    readFile(projectFile("src/main.js"), "utf8"),
    readFile(projectFile("src/i18n.js"), "utf8")
  ]);

  assert.match(html, /id="sample-scenario-select"/);
  assert.match(html, /option value="live" data-i18n="sampleNormalMode">平常時/);
  assert.match(html, /option value="history" data-i18n="sampleDisruptionMode">交通障害時（デモ）/);
  assert.match(main, /openSampleDisruptionScenario/);
  assert.match(main, /observed_at\?\.slice\(8, 10\) === "10"/);
  assert.match(translations, /sampleNormalMode: "平常時"/);
  assert.match(translations, /sampleDisruptionMode: "交通障害時（デモ）"/);
});

test("demo page explains what users can check before the footer", async () => {
  const [html, main, translations] = await Promise.all([
    readFile(projectFile("index.html"), "utf8"),
    readFile(projectFile("src/main.js"), "utf8"),
    readFile(projectFile("src/i18n.js"), "utf8")
  ]);
  assert.match(html, /class="demo-guide"[\s\S]*data-i18n="demoGuideOverview"[\s\S]*data-i18n="demoGuideScenario"[\s\S]*data-i18n="demoGuideStay"/);
  assert.match(html, /id="demo-guide-close"[\s\S]*data-i18n-aria-label="demoGuideClose"/);
  assert.match(html, /この画面でできること/);
  assert.ok(html.indexOf('class="demo-guide"') < html.indexOf('class="footer"'));
  assert.match(main, /DEMO_GUIDE_DISMISS_AFTER_MS = 10_000/);
  assert.match(main, /sessionStorage\?\.setItem\(DEMO_GUIDE_SESSION_KEY/);
  assert.match(main, /dismissDemoGuide\("timeout"\)/);
  assert.match(main, /button\.id === "demo-guide-close" \? "close" : "interaction"/);
  assert.match(translations, /demoGuideClose: "説明を閉じる"/);
});

test("demo legal documents match the implementation and avoid blanket waivers", async () => {
  const [terms, privacy] = await Promise.all([
    readFile(projectFile("public/terms.html"), "utf8"),
    readFile(projectFile("public/privacy.html"), "utf8")
  ]);

  assert.equal((terms.match(/data-legal-locale=/g) ?? []).length, 5);
  assert.equal((privacy.match(/data-legal-locale=/g) ?? []).length, 5);
  assert.match(terms, /すべて機能確認用に作成した架空のサンプル/);
  assert.match(terms, /過去の実際の災害や運行記録を再現したものではありません/);
  assert.match(terms, /MIT License の対象はリポジトリ内のソフトウェア/);
  assert.match(terms, /https:\/\/maps\.gsi\.go\.jp\/development\/ichiran\.html/);
  assert.match(terms, /OpenStreetMap／ODbLの条件/);
  assert.match(terms, /生命・身体に生じた損害、当社の故意または重大な過失/);
  assert.match(terms, /改定後の規約への同意を改めて求めます/);
  assert.match(terms, /本条は当社が法令上負う責任をすべて免除するものではありません/);
  assert.match(privacy, /規約同意の版番号と同意日時/);
  assert.match(privacy, /sessionStorage/);
  assert.match(privacy, /Cloudflare と Vercel/);
  assert.match(privacy, /国土地理院の配信サーバーへ地図タイルと文字データ/);
  assert.match(privacy, /OpenStreetMapへ通信するものではありません/);
  assert.match(privacy, /代表者：植野正徳/);
  assert.doesNotMatch(terms, /一切の責任を負いません/);
  assert.doesNotMatch(privacy, /選択した言語と「到着後／出発前」の表示設定だけ/);
});
