import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadSourceRegistry, validateSourceRegistry } from "../scripts/lib/source-policy.js";

test("official source registry is complete and allowlisted", async () => {
  const registry = validateSourceRegistry(await loadSourceRegistry());
  assert.ok(registry.sources.length >= 6);
  assert.ok(registry.sources.every((source) => source.url.startsWith("https://")));
});

test("public design documents explain why traffic collection is isolated from page views", async () => {
  const [readme, overview] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/project-overview.md", import.meta.url), "utf8")
  ]);

  assert.match(readme, /閲覧トラフィックを交通事業者のAPIやWebサーバーへ直接転送しません/);
  assert.match(overview, /旅行者の閲覧数と、交通事業者への取得回数を切り離す/);
  assert.match(overview, /直前の正常な静的ファイルを維持/);
  assert.match(overview, /常時起動するバックエンドや従量課金の地図APIを使わず/);
});

test("frontend quality floor is present", async () => {
  const [html, css, main, i18n, airports, terms] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/i18n.js", import.meta.url), "utf8"),
    readFile(new URL("../src/airport-registry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/terms.html", import.meta.url), "utf8")
  ]);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /:focus-visible|:focus-within/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(airports, /140\.3863, 35\.7720/);
  assert.match(airports, /code: "TAK"/);
  assert.match(airports, /code: "IBR"/);
  assert.match(airports, /code: "AKJ"/);
  assert.match(main, /latest-disaster\.json/);
  assert.match(main, /experimental_bvmap/);
  assert.match(main, /attribution: "国土地理院"/);
  assert.doesNotMatch(main, /development\/ichiran\.html[^\n]+>国土地理院<\/a>/);
  assert.match(terms, /https:\/\/maps\.gsi\.go\.jp\/development\/ichiran\.html/);
  assert.doesNotMatch(main, /development\/vt\.html/);
  assert.match(main, /setDOMContent/);
  assert.match(main, /style\.load/);
  assert.match(html, /id="language-select"/);
  assert.match(html, /id="airport-picker-button"[\s\S]*?aria-haspopup="dialog"/);
  assert.match(html, /id="airport-picker-dialog"/);
  assert.match(html, /id="airport-search"/);
  assert.match(html, /id="airport-search-results"/);
  assert.doesNotMatch(html, /id="airport-select"/);
  assert.doesNotMatch(html, /class="airport-control"/);
  assert.match(main, /airportTitle\.textContent = globalThis\.matchMedia/);
  assert.match(main, /airportTitle\.title = fullAirportName/);
  assert.match(main, /filterAirports/);
  assert.match(main, /renderAirportPickerResults/);
  assert.match(html, /NARITA ACCESS NOW/);
  assert.match(html, /id="current-situation"/);
  assert.match(html, /id="current-status-groups"/);
  assert.match(html, /class="control-dashboard"/);
  assert.match(html, /id="priority-incident"/);
  assert.match(html, /id="emergency-banner"[^>]*role="alert"/);
  assert.match(html, /id="phase-context"[^>]*role="status"/);
  assert.match(html, /id="source-trust-links"/);
  assert.match(html, /class="panel-heading is-warning"/);
  assert.match(html, /id="incident-feed" class="map-events-panel"/);
  assert.match(html, /id="municipal-support-links"/);
  assert.match(html, /class="journey-board journey-board-compact"/);
  assert.match(html, /id="transport-detail-disclosure" class="journey-disclosure journey-transport-disclosure"[^>]*hidden/);
  assert.match(html, /id="transport-detail-heading"/);
  assert.doesNotMatch(html, /id="journey-outcome"/);
  assert.doesNotMatch(html, /class="journey-next-panel"/);
  assert.doesNotMatch(html, /id="journey-step-list"/);
  assert.doesNotMatch(html, /id="open-map-transport-detail"/);
  assert.doesNotMatch(html, /data-journey="(?:arrival|departure)"/);
  assert.match(html, /tel:\+815038162787/);
  assert.match(main, /renderJourneyUi/);
  assert.match(main, /function scrollJourneyDetails\(\)/);
  assert.match(main, /renderCurrentSituation/);
  assert.match(main, /userFacingTransportStatus/);
  assert.match(main, /status-source-link\$\{visibleStatus \? "" : " is-primary"\}/);
  assert.match(main, /trustPartialDetail/);
  assert.match(css, /\.status-service\.is-reference/);
  assert.match(css, /\.transport-overview-source\.is-prominent/);
  assert.doesNotMatch(main, /confidence-badge|observationDecisionUnconfirmed/);
  assert.doesNotMatch(css, /\.confidence-badge/);
  assert.match(css, /--focus-yellow:/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /box-shadow:\s*0 0 0 6px var\(--focus-yellow\)/);
  assert.match(main, /renderPriorityIncident/);
  assert.match(main, /renderEmergencyBanner/);
  assert.match(main, /renderOperationalPhase/);
  assert.match(main, /focusTransportNetwork/);
  assert.match(main, /enableArrowKeyTabs/);
  assert.match(main, /renderTrustPanel/);
  assert.match(main, /isCurrentDataStale/);
  assert.doesNotMatch(html, /いま、空港まで動けるか。/);
  assert.match(i18n, /zh-CN/);
  assert.match(i18n, /zh-TW/);
  assert.doesNotMatch(main, /google\.maps|mapboxgl\.accessToken/i);
});

test("390 by 844 map-first screen combines a status ticker, semantic map and layer toggles", async () => {
  const [html, css, main, spec] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../docs/map-first-information-design.md", import.meta.url), "utf8")
  ]);
  assert.match(spec, /30秒以内の移動判断/);
  assert.match(spec, /移動方向の3選択、地図、交通状況の要点/);
  assert.match(html, /class="map-journey-switch"/);
  assert.match(html, /id="map-decision"/);
  assert.match(html, /id="status-ticker"/);
  assert.match(html, /id="status-ticker-track"/);
  assert.match(html, /id="status-ticker-context"/);
  assert.match(html, /id="status-ticker-toggle"/);
  assert.match(html, /id="live-mode-button"/);
  assert.match(html, /id="history-mode-button"/);
  assert.match(html, /id="sample-scenario-select"/);
  assert.match(html, /id="history-range-dialog"/);
  assert.match(html, /id="history-start-input"[^>]*type="datetime-local"/);
  assert.match(html, /id="history-end-input"[^>]*type="datetime-local"/);
  assert.match(html, /id="map-layer-toolbar"[^>]*data-control-purpose="layer-visibility"/);
  assert.match(html, /data-map-layer="railway"/);
  assert.match(html, /data-map-layer="bus"/);
  assert.match(html, /data-map-layer="road"/);
  assert.match(html, /data-map-layer="weather"/);
  assert.match(html, /class="layer-visibility-indicator"/);
  assert.match(html, /id="weather-map-legend"/);
  assert.match(html, /data-i18n="weatherLegendTitle"/);
  assert.match(html, /data-i18n="weatherLegendBoundary"/);
  assert.match(html, /id="map-decision-toggle"[^>]*aria-expanded="false"/);
  assert.match(html, /id="map-decision-body"[^>]*hidden/);
  assert.match(html, /id="travel-decision"[\s\S]*id="map-decision-body"/);
  assert.match(html, /class="map-transport-tabs"[^>]*role="tablist"[^>]*data-control-purpose="detail-selection"/);
  assert.match(html, /id="map-transport-tab-rail"[\s\S]*data-i18n="transportRail"/);
  assert.match(html, /id="map-transport-tab-bus"[\s\S]*data-i18n="transportBus"/);
  assert.match(html, /id="map-transport-tab-road"[\s\S]*data-i18n="mapLayerRoad"/);
  assert.match(html, /id="map-service-section"/);
  assert.match(html, /id="map-service-direction"/);
  assert.match(html, /id="map-service-reason"/);
  assert.match(html, /id="map-service-alternative"/);
  assert.match(html, /id="map-transport-panel"[\s\S]*?role="tabpanel"[\s\S]*?id="map-transport-services"[\s\S]*?role="group"/);
  assert.match(main, /panel\.setAttribute\("aria-labelledby", activeTabId\)/);
  assert.match(main, /container\.setAttribute\("aria-label", i18n\.t\(selectionKey\)\)/);
  assert.doesNotMatch(main, /setAttribute\("role", "listitem"\)/);
  assert.doesNotMatch(html, /class="map-sheet-handle"/);
  assert.match(html, /data-map-journey="arrival"/);
  assert.match(html, /data-map-journey="departure"/);
  assert.doesNotMatch(html, /class="utility-menu"/);
  assert.doesNotMatch(html, /id="accessibility-toggle"/);
  assert.doesNotMatch(main, /data\.contrast|JOURNEY_STORAGE_KEY/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(html, /data-map-journey="arrival" aria-pressed="false"/);
  assert.match(html, /data-map-journey="departure" aria-pressed="false"/);
  assert.match(html, /data-map-journey="stranded" aria-pressed="false"/);
  assert.match(html, /id="travel-decision"[^>]*hidden/);
  assert.doesNotMatch(html, /id="change-journey-mode"/);
  assert.doesNotMatch(html, /id="journey-selection-summary"/);
  assert.match(html, /STAY/);
  assert.match(html, /data-i18n="journeySupportHeading"/);
  assert.match(html, /id="emergency-support-disclosure"/);
  assert.match(html, /class="demo-guide"/);
  assert.match(html, /class="demo-guide-copy"/);
  assert.doesNotMatch(html, /class="mobile-first-actions"/);
  assert.doesNotMatch(html, /<span aria-hidden="true">HELP<\/span>/);
  assert.match(css, /D \/ Map-first top page/);
  assert.match(css, /C \+ I \/ Semantic access map with a progressive decision sheet/);
  assert.match(css, /height:\s*calc\(100svh - 116px\)/);
  assert.match(css, /\.map-decision-toggle\s*\{[\s\S]*?min-height:\s*74px/);
  assert.match(css, /\.map-service-official-link\s*\{[\s\S]*?min-height:\s*46px/);
  assert.match(css, /\.status-ticker-track/);
  assert.match(css, /\.status-ticker-context/);
  assert.match(css, /@keyframes status-ticker-scroll/);
  assert.match(css, /\.map-layer-toolbar/);
  assert.match(css, /\.map-layer-toolbar button\[aria-pressed="false"\]/);
  assert.match(css, /\.map-layer-toolbar button\[aria-pressed="true"\]/);
  assert.match(css, /\.layer-visibility-indicator/);
  assert.doesNotMatch(css, /\.map-layer-toolbar button::after\s*\{[\s\S]*?content:\s*"✓"/);
  assert.match(css, /\.status-ticker-toggle\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.map-decision\.is-stale-snapshot/);
  assert.match(main, /regionalTickerPrompt/);
  assert.match(main, /entry\.href/);
  assert.match(css, /\.weather-map-legend/);
  assert.match(css, /\.weather-map-legend\[hidden\]/);
  assert.match(main, /weatherLegend\.hidden = !visibility\.weather \|\| !hasWeatherArea/);
  assert.match(css, /\.semantic-map-marker\.is-airport/);
  assert.match(css, /\.semantic-map-marker\.is-station/);
  assert.match(css, /grid-template-columns:\s*repeat\(4/);
  assert.match(main, /new Marker/);
  assert.match(main, /addSemanticMapMarkers/);
  assert.match(main, /focusJourneyMap/);
  assert.match(main, /TOKYO_STATION/);
  assert.match(main, /ACCESS_NETWORK_BOUNDS/);
  assert.match(main, /Math\.min\(NARITA_AIRPORT\[0\], TOKYO_STATION\[0\]\)/);
  assert.match(main, /RAIL_OPERATOR_ITEMS/);
  assert.match(main, /renderStatusTicker/);
  assert.match(main, /status-ticker-item/);
  assert.match(main, /MAP_LAYER_ITEMS/);
  assert.match(main, /setMapLayerVisibility/);
  assert.match(main, /history-index\.json/);
  assert.match(main, /historyRangeToUrlValue/);
  assert.match(main, /replayIndicesForRange/);
  assert.match(main, /syncSharedNetworkLayers/);
  assert.match(main, /access-network-alert-patterns/);
  assert.match(main, /access-bus-alerts/);
  assert.match(main, /transport-mode-map-marker/);
  assert.match(main, /addTransportModeMarkers/);
  assert.match(main, /representativeTransportCoordinate/);
  assert.match(main, /line-gap-width/);
  assert.match(main, /line-dasharray/);
  assert.match(main, /animateTransportRoute/);
  assert.match(main, /prefers-reduced-motion: reduce/);
  assert.match(main, /RAIL_ROUTE_COLOR/);
  assert.match(main, /affected_route_ids/);
  assert.match(main, /東京駅（JR）/);
  assert.doesNotMatch(main, /eventData\?\.metadata\?\.sample_data[\s\S]{0,400}candidate\.properties\?\.category/);
  assert.match(main, /mapDecisionSampleNormal/);
  assert.match(main, /alternative_from_airport/);
  assert.doesNotMatch(css, /\.map-transport-service strong\s*\{[^}]*text-overflow:\s*ellipsis/);
  assert.doesNotMatch(css, /\.map-transport-service strong\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(main, /mapDecisionOfficialSecondary/);
  assert.doesNotMatch(main, /label:\s*"TRAIN"/);
  assert.doesNotMatch(main, /label:\s*"BUS"/);
  assert.doesNotMatch(main, /label:\s*"ROAD"/);
  assert.match(main, /selectedRailOperatorId/);
  assert.match(main, /dataset\.railOperator/);
  assert.doesNotMatch(main, /mapLastRecordedStatus/);
  assert.match(main, /routeIds:\s*\[\]/);
});

test("traveler task verification covers route selection and ten-second decisions", async () => {
  const [verifier, report] = await Promise.all([
    readFile(new URL("../scripts/verify-mobile-first-screen.js", import.meta.url), "utf8"),
    readFile(new URL("../docs/usability-10-second-task-test-2026-08-17.md", import.meta.url), "utf8")
  ]);
  assert.match(verifier, /serviceSelections/);
  assert.match(verifier, /semanticRole === "button"/);
  assert.match(verifier, /selection\.label === selection\.renderedTitle/);
  assert.match(verifier, /transportModesAreVisuallyEncoded/);
  assert.match(report, /計測型認知ウォークスルー/);
  assert.match(report, /到着[\s\S]*?2/);
  assert.match(report, /出発[\s\S]*?3/);
  assert.match(report, /空港滞在[\s\S]*?1/);
  assert.match(report, /日本語・英語・簡体字・繁体字・韓国語/);
});

test("official disaster UX research is traceable to the implemented patterns", async () => {
  const [research, css, main] = await Promise.all([
    readFile(new URL("../docs/disaster-service-ux-research-2026-08-15.md", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8")
  ]);
  assert.match(research, /東京都防災ホームページ/);
  assert.match(research, /東京都防災マップ/);
  assert.match(research, /デジタル庁 防災分野/);
  assert.match(research, /DADS 緊急時バナー/);
  assert.match(research, /防災DXサービスマップ/);
  assert.match(css, /\.emergency-banner/);
  assert.match(css, /\.phase-context\[data-phase="response"\]/);
  assert.match(css, /\.transport-overview-focus/);
  assert.match(main, /NON_DECISION_SOURCE_SCOPES/);
});

test("the compact lower section does not repeat a demo disclaimer", async () => {
  const [html, css, main] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="sample-demo-banner"[^>]*hidden/);
  assert.doesNotMatch(html, /id="journey-demo-callout"/);
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  assert.match(main, /sampleBanner\.hidden\s*=\s*!SAMPLE_DEMO/);
  assert.doesNotMatch(main, /journey-demo-callout|demoCallout/);
});

test("browser never calls traffic or AI APIs", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.doesNotMatch(main, /traininfo\.jreast|keisei\.co\.jp|gemini|generativelanguage/i);
});

test("transport themes are distinct from operating-status colors and remain accessible", async () => {
  const [css, main] = await Promise.all([
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8")
  ]);
  const expected = {
    rail: "#005a8b",
    bus: "#8a4b00",
    road: "#5b4b8a"
  };
  const luminance = (hex) => {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  for (const [mode, color] of Object.entries(expected)) {
    assert.match(css, new RegExp(`--transport-${mode}: ${color}`));
    assert.ok(1.05 / (luminance(color) + 0.05) >= 4.5, `${mode} must meet WCAG AA with white text`);
  }
  assert.equal(new Set(Object.values(expected)).size, 3);
  assert.match(main, /dataset\.transportTheme = mode/);
  assert.match(css, /green\/amber\/red remain reserved for[\s\S]*operating status/);
});
