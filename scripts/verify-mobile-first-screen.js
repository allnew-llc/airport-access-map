import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AIRPORTS } from "../src/airport-registry.js";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const port = Number(args.get("--port") ?? 9225);
const targetUrl = args.get("--url") ?? "http://127.0.0.1:5173/";
const screenshotPath = args.get("--screenshot");
const screenshotState = args.get("--screenshot-state") ?? "initial";
const reportPath = args.get("--report");
const searchQuery = args.get("--search-query");
const viewport = Object.freeze({ width: 390, height: 844 });
const airportId = new URL(targetUrl).searchParams.get("airport") ?? "nrt";
const isRegionalAirport = airportId !== "nrt";
const railAccess = AIRPORTS[airportId]?.railAccess ?? "none";
const hasDirectRail = railAccess === "direct";

async function findPageTarget() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`Chrome target discovery failed: HTTP ${response.status}`);
  const targets = await response.json();
  return targets.find((target) => target.type === "page" && target.url.startsWith(targetUrl))
    ?? targets.find((target) => target.type === "page");
}

function connect(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    let nextId = 0;
    socket.addEventListener("open", () => resolve({
      send(method, params = {}) {
        const id = ++nextId;
        socket.send(JSON.stringify({ id, method, params }));
        return new Promise((commandResolve, commandReject) => pending.set(id, { commandResolve, commandReject }));
      },
      close() { socket.close(); }
    }));
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { commandResolve, commandReject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) commandReject(new Error(message.error.message));
      else commandResolve(message.result);
    });
    socket.addEventListener("error", () => reject(new Error("Chrome DevTools connection failed")));
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  return result.result.value;
}

async function waitForMapDecision(client) {
  const deadline = Date.now() + 15000;
  let lastReady;
  while (Date.now() < deadline) {
    const ready = await evaluate(client, `(() => ({
      map: Boolean(document.querySelector("#map .maplibregl-canvas")),
      decision: document.querySelector("#map-decision")?.classList.contains("is-loading") === false,
      choices: document.querySelectorAll(".map-journey-switch [data-map-journey]").length,
      layerToggles: document.querySelectorAll("[data-map-layer]").length,
      tickerItems: document.querySelectorAll(".status-ticker-item").length,
      semanticMarkers: document.querySelectorAll(".semantic-map-marker").length,
      airportId: document.querySelector("#airport-picker-button")?.dataset.airportId ?? "",
      error: document.querySelector("#map-error")?.textContent?.trim() ?? ""
    }))()`);
    lastReady = ready;
    if (ready.map && ready.decision && ready.choices === 3 && ready.layerToggles === 4 && ready.tickerItems >= 1 && ready.semanticMarkers === 2 && ready.airportId === airportId) return;
    await delay(250);
  }
  throw new Error(`Map-first decision view did not finish rendering within 15 seconds: ${JSON.stringify(lastReady)}`);
}

const target = await findPageTarget();
if (!target?.webSocketDebuggerUrl) throw new Error("No debuggable Chrome page target found");

const client = await connect(target.webSocketDebuggerUrl);
try {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
  await evaluate(client, `sessionStorage.removeItem("airport-access-demo-guide-dismissed-v1")`);
  await client.send("Page.navigate", { url: targetUrl });
  await waitForMapDecision(client);

  const measurement = await evaluate(client, `(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        top: Math.round(box.top * 10) / 10,
        right: Math.round(box.right * 10) / 10,
        bottom: Math.round(box.bottom * 10) / 10,
        left: Math.round(box.left * 10) / 10,
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        display: style.display,
        visibility: style.visibility
      };
    };
    const decisionToggle = document.querySelector("#map-decision-toggle")?.getBoundingClientRect();
    const journeyChoices = [...document.querySelectorAll(".map-journey-switch [data-map-journey]")]
      .map((element) => element.getBoundingClientRect());
    const visibleLayerToggleNodes = [...document.querySelectorAll("[data-map-layer]")]
      .filter((element) => !element.hidden);
    const layerToggles = visibleLayerToggleNodes
      .map((element) => element.getBoundingClientRect());
    const tickerRailButtons = [...document.querySelectorAll(".status-ticker-item[data-rail-operator]")]
      .map((element) => element.getBoundingClientRect());
    const hiddenSelectors = [".weather-badge", ".map-readback", ".airport-info-link", ".map-legend", ".map-events-panel"];
    const networkData = globalThis.__NARITA_MAP__?.getSource("access-network-guide")?._data;
    const activeMap = globalThis.__NARITA_MAP__;
    const operationalNetworkAlerts = networkData?.features?.filter((feature) => ["warning", "suspended"].includes(feature.properties?.alert_status)).length ?? 0;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      },
      boxes: {
        header: rect(".topbar"),
        airportSelector: rect(".airport-title-control"),
        languageSelector: rect("#language-select"),
        sampleBanner: rect("#sample-demo-banner"),
        ticker: rect("#status-ticker"),
        tickerToggle: rect("#status-ticker-toggle"),
        tickerContext: rect("#status-ticker-context"),
        map: rect(".map-command"),
        journey: rect(".map-journey-switch"),
        layerToolbar: rect("#map-layer-toolbar"),
        airport: rect(".semantic-map-marker.is-airport"),
        tokyoStation: rect(".semantic-map-marker.is-station"),
        decision: rect("#map-decision")
      },
      choiceCount: journeyChoices.length,
      viewMode: document.documentElement.dataset.viewMode ?? "live",
      sampleDemo: document.documentElement.dataset.sampleDemo === "true",
      sampleBannerText: document.querySelector("#sample-demo-banner")?.textContent?.trim() ?? "",
      airportSelectorIntegrated: Boolean(
        document.querySelector(".brand-block #airport-picker-button.airport-title-control")
        && document.querySelector("#airport-picker-dialog")
        && document.querySelector("#airport-search")
        && document.querySelector("#airport-search-results")
      ),
      airportTitleText: document.querySelector("#airport-title-text")?.textContent?.trim() ?? "",
      airportTitleFullText: document.querySelector("#airport-title-text")?.title?.trim() ?? "",
      airportTitleFullyVisible: (() => {
        const title = document.querySelector("#airport-title-text");
        return Boolean(title && title.scrollWidth <= title.clientWidth + 1);
      })(),
      airportPickerCurrentId: document.querySelector("#airport-picker-button")?.dataset.airportId ?? "",
      choiceMinHeight: Math.min(...journeyChoices.map((box) => box.height)),
      decisionToggleHeight: decisionToggle?.height ?? 0,
      decisionToggleHidden: document.querySelector("#map-decision-toggle")?.hidden ?? false,
      decisionToggleExpanded: document.querySelector("#map-decision-toggle")?.getAttribute("aria-expanded") === "true",
      journeyBoardHidden: document.querySelector("#travel-decision")?.hidden ?? false,
      journeyPressedStates: [...document.querySelectorAll("[data-map-journey]")].map((button) => button.getAttribute("aria-pressed")),
      utilityMenuPresent: Boolean(document.querySelector(".utility-menu, #accessibility-toggle")),
      layerToggleCount: layerToggles.length,
      layerToggleMinHeight: Math.min(...layerToggles.map((box) => box.height)),
      tickerItemCount: document.querySelectorAll(".status-ticker-sequence:not([aria-hidden='true']) .status-ticker-item").length,
      tickerOfficialLinkCount: [...document.querySelectorAll(".status-ticker-sequence:not([aria-hidden='true']) a.status-ticker-item")]
        .filter((link) => link.href.startsWith("https://")).length,
      tickerPrompt: document.querySelector("#status-ticker-context")?.textContent?.trim() ?? "",
      tickerContextDateTime: document.querySelector("#status-ticker-context")?.dateTime ?? "",
      sampleGeneratedAt: document.documentElement.dataset.sampleGeneratedAt ?? "",
      staleTicker: document.querySelector("#status-ticker")?.classList.contains("is-stale-snapshot") ?? false,
      tickerRailButtonCount: tickerRailButtons.length,
      layerIndicatorCount: visibleLayerToggleNodes.filter((button) => button.querySelector(".layer-visibility-indicator")).length,
      layerIndicatorText: visibleLayerToggleNodes.map((button) => button.querySelector(".layer-visibility-indicator")?.textContent.trim() ?? ""),
      decisionState: [...document.querySelector("#map-decision").classList],
      decisionKicker: document.querySelector("#map-decision-kicker").textContent.trim(),
      decisionTime: document.querySelector("#map-decision-time").textContent.trim(),
      decisionTitle: document.querySelector("#map-decision-title").textContent.trim(),
      recordedStatusTickerCount: document.querySelectorAll(".status-ticker-item.is-normal, .status-ticker-item.is-warning, .status-ticker-item.is-suspended").length,
      internalStatusVisible: /未確認|未确认|미확인|unconfirmed/i.test(document.body.innerText),
      topPageClutterHidden: hiddenSelectors.every((selector) => {
        const element = document.querySelector(selector);
        return !element || getComputedStyle(element).display === "none";
      }),
      transportRowCount: document.querySelectorAll(".transport-overview-row").length,
      operationalNetworkAlerts,
      transportModeMarkerCount: document.querySelectorAll(".transport-mode-map-marker:not(.is-moving)").length,
      transportModeCategories: ["railway", "bus", "road"].filter((category) =>
        document.querySelector(".transport-mode-map-marker.is-" + category + ":not(.is-moving)")
      ),
      mapCamera: activeMap ? {
        center: activeMap.getCenter().toArray(),
        zoom: activeMap.getZoom(),
        padding: activeMap.getPadding()
      } : null,
      mapError: document.querySelector("#map-error")?.textContent?.trim() ?? ""
    };
  })()`);

  const tickerVisualContinuity = await evaluate(client, `(async () => {
    const viewport = document.querySelector(".status-ticker-viewport");
    const track = document.querySelector("#status-ticker-track");
    const context = document.querySelector("#status-ticker-context");
    const animation = track.getAnimations()[0];
    const phases = [0, 0.25, 0.5, 0.75, 0.99];
    const visibleWidth = (node, clip) => {
      const box = node.getBoundingClientRect();
      return Math.min(box.right, clip.right) - Math.max(box.left, clip.left);
    };
    const hasVisibleStatus = () => {
      const clip = viewport.getBoundingClientRect();
      return [...track.querySelectorAll(".status-ticker-item")].some((node) =>
        node.textContent.trim().length > 0 && visibleWidth(node, clip) >= 16
      );
    };
    const contextBox = context.getBoundingClientRect();
    const contextVisible = context.textContent.trim().length > 0
      && contextBox.left >= 0
      && contextBox.right <= innerWidth;
    if (!animation) return { phases: [hasVisibleStatus()], contextVisible, pass: contextVisible && hasVisibleStatus() };
    await animation.ready;
    animation.pause();
    const duration = Number(animation.effect.getTiming().duration);
    const results = [];
    for (const phase of phases) {
      animation.currentTime = duration * phase;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      results.push(hasVisibleStatus());
    }
    animation.play();
    return { phases: results, contextVisible, pass: contextVisible && results.every(Boolean) };
  })()`);

  const tickerPauseInteraction = await evaluate(client, `(async () => {
    const toggle = document.querySelector("#status-ticker-toggle");
    const viewport = document.querySelector(".status-ticker-viewport").getBoundingClientRect();
    toggle.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const visibleItems = [...document.querySelectorAll("#status-ticker-track .status-ticker-item")].filter((item) => {
      const box = item.getBoundingClientRect();
      return item.textContent.trim().length > 0
        && Math.min(box.right, viewport.right) - Math.max(box.left, viewport.left) >= 16;
    });
    const paused = toggle.getAttribute("aria-pressed") === "true"
      && document.querySelector("#status-ticker-track").classList.contains("is-paused")
      && visibleItems.length >= 1;
    toggle.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const resumed = toggle.getAttribute("aria-pressed") === "false"
      && !document.querySelector("#status-ticker-track").classList.contains("is-paused");
    return { visibleItemCount: visibleItems.length, paused, resumed, pass: paused && resumed };
  })()`);

  const mapFrame = await evaluate(client, `(() => {
    const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
    const map = box(".map-stage");
    const toolbar = box("#map-layer-toolbar");
    const legend = document.querySelector("#weather-map-legend:not([hidden])")?.getBoundingClientRect();
    const decision = box("#map-decision");
    const markers = [box(".semantic-map-marker.is-airport"), box(".semantic-map-marker.is-station")];
    const usableTop = Math.max(map.top, toolbar?.bottom ?? map.top, legend?.bottom ?? map.top);
    const usableBottom = Math.min(map.bottom, decision?.top ?? map.bottom);
    const usableCenter = (usableTop + usableBottom) / 2;
    const usableHeight = usableBottom - usableTop;
    const groupTop = Math.min(...markers.map((marker) => marker.top));
    const groupBottom = Math.max(...markers.map((marker) => marker.bottom));
    const groupCenter = (groupTop + groupBottom) / 2;
    const inFrame = markers.every((marker) => marker.left >= map.left
      && marker.right <= map.right
      && marker.top >= usableTop
      && marker.bottom <= usableBottom);
    return {
      usableTop,
      usableBottom,
      usableCenter,
      groupCenter,
      offsetRatio: Math.abs(groupCenter - usableCenter) / usableHeight,
      pass: usableHeight > 100 && inFrame && Math.abs(groupCenter - usableCenter) <= usableHeight * 0.14
    };
  })()`);

  const localeLayouts = await evaluate(client, `(async () => {
    const locales = ["ja", "en", "zh-CN", "zh-TW", "ko"];
    const select = document.querySelector("#language-select");
    const layouts = {};
    for (const locale of locales) {
      select.value = locale;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const journey = document.querySelector(".map-journey-switch").getBoundingClientRect();
      const decision = document.querySelector("#map-decision").getBoundingClientRect();
      const choiceButtons = [...document.querySelectorAll("[data-map-journey]")].map((button) => button.getBoundingClientRect());
      const layerToggleNodes = [...document.querySelectorAll("[data-map-layer]")]
        .filter((element) => !element.hidden);
      const layerToggles = layerToggleNodes
        .map((element) => element.getBoundingClientRect());
      const ticker = document.querySelector("#status-ticker").getBoundingClientRect();
      const language = document.querySelector("#language-select").getBoundingClientRect();
      const primaryLayer = layerToggleNodes[0];
      const primaryLayerLabel = primaryLayer?.querySelector("strong")?.textContent.trim() ?? "";
      const primaryLayerAccessibleName = primaryLayer?.getAttribute("aria-label") ?? "";
      layouts[locale] = {
        journeyTop: Math.round(journey.top * 10) / 10,
        decisionBottom: Math.round(decision.bottom * 10) / 10,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        actionMinHeight: Math.min(...choiceButtons.map((box) => box.height)),
        layerToggleMinHeight: Math.min(...layerToggles.map((box) => box.height)),
        languageWidth: Math.round(language.width * 10) / 10,
        primaryLayerLabel,
        primaryLayerAccessibleName,
        pass: journey.top >= 0
          && decision.bottom <= ${viewport.height}
          && ticker.top >= 0
          && ticker.bottom <= ${viewport.height}
          && language.width >= 82
          && document.documentElement.scrollWidth === document.documentElement.clientWidth
          && choiceButtons.length === 3
          && choiceButtons.every((box) => box.height >= 44 && box.width >= 44)
          && layerToggles.length === ${hasDirectRail ? 4 : 3}
          && layerToggles.every((box) => box.height >= 44 && box.width >= 44)
          && primaryLayerLabel.length > 0
          && primaryLayerAccessibleName.includes(primaryLayerLabel)
      };
    }
    select.value = "ja";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return layouts;
  })()`);

  const journeySelectionInteraction = await evaluate(client, `(async () => {
    const buttons = Object.fromEntries([...document.querySelectorAll("[data-map-journey]")].map((button) => [button.dataset.mapJourney, button]));
    const board = document.querySelector("#travel-decision");
    const transportDisclosure = document.querySelector("#transport-detail-disclosure");
    const toggle = document.querySelector("#map-decision-toggle");
    const body = document.querySelector("#map-decision-body");
    const initial = board.hidden
      && toggle.hidden
      && Object.values(buttons).every((button) => button.getAttribute("aria-pressed") === "false");

    buttons.arrival.click();
    await new Promise((resolve) => setTimeout(resolve, 550));
    const arrivalBoardBox = board.getBoundingClientRect();
    const arrivalDisclosureBox = transportDisclosure.getBoundingClientRect();
    const arrivalBodyBox = body.getBoundingClientRect();
    const arrivalDetailsVisible = arrivalBoardBox.top >= -1
      && arrivalBoardBox.top < innerHeight
      && arrivalDisclosureBox.top >= -1
      && arrivalDisclosureBox.top < innerHeight
      && arrivalBodyBox.top < innerHeight
      && arrivalBodyBox.bottom > 0;
    const arrival = !board.hidden
      && !toggle.hidden
      && toggle.getAttribute("aria-expanded") === "true"
      && !body.hidden
      && !transportDisclosure.hidden
      && transportDisclosure.open
      && !document.querySelector("#journey-outcome")
      && document.querySelector("#airport-wait-disclosure").hidden
      && document.querySelector("#emergency-support-disclosure").hidden
      && buttons.arrival.getAttribute("aria-pressed") === "true";
    const arrivalAlternative = document.querySelector("#map-service-alternative")?.textContent.trim() ?? "";

    buttons.departure.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const departureAlternative = document.querySelector("#map-service-alternative")?.textContent.trim() ?? "";
    const departure = !board.hidden
      && toggle.getAttribute("aria-expanded") === "true"
      && !body.hidden
      && !transportDisclosure.hidden
      && transportDisclosure.open
      && buttons.departure.getAttribute("aria-pressed") === "true"
      && arrivalAlternative.length > 0
      && departureAlternative.length > 0;

    const localizedAlternatives = {};
    const languageSelect = document.querySelector("#language-select");
    for (const locale of ["ja", "en", "zh-CN", "zh-TW", "ko"]) {
      languageSelect.value = locale;
      languageSelect.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      buttons.arrival.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const fromAirport = document.querySelector("#map-service-alternative")?.textContent.trim() ?? "";
      buttons.departure.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const toAirport = document.querySelector("#map-service-alternative")?.textContent.trim() ?? "";
      localizedAlternatives[locale] = {
        fromAirport,
        toAirport,
        pass: fromAirport.length > 0 && toAirport.length > 0 && fromAirport !== toAirport
      };
    }
    languageSelect.value = "ja";
    languageSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const localizedAlternativesPass = Object.values(localizedAlternatives).every((result) => result.pass);

    buttons.stranded.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const stranded = !board.hidden
      && toggle.hidden
      && body.hidden
      && transportDisclosure.hidden
      && !transportDisclosure.open
      && !document.querySelector("#journey-outcome")
      && !document.querySelector("#airport-wait-disclosure").hidden
      && !document.querySelector("#emergency-support-disclosure").hidden
      && document.querySelector("#airport-wait-disclosure").open
      && document.querySelector("#emergency-support-disclosure").open
      && document.querySelector("#airport-wait-disclosure").getBoundingClientRect().top < innerHeight
      && buttons.stranded.getAttribute("aria-pressed") === "true"
      && buttons.arrival.getAttribute("aria-pressed") === "false";

    const noRedundantChange = !document.querySelector("#change-journey-mode");
    return {
      initial,
      arrival,
      departure,
      stranded,
      arrivalAlternative,
      departureAlternative,
      localizedAlternatives,
      arrivalDetailsVisible,
      noRedundantChange,
      pass: initial && arrival && departure && arrivalDetailsVisible && stranded && noRedundantChange
    };
  })()`);

  const sampleScenarioInteraction = await evaluate(client, `(async () => {
    const control = document.querySelector("#sample-scenario-control");
    const select = document.querySelector("#sample-scenario-select");
    const guide = document.querySelector(".demo-guide");
    const footer = document.querySelector(".footer");
    const guideReady = Boolean(guide && footer)
      && guide.querySelectorAll(".demo-guide-copy > p").length === 3
      && guide.getBoundingClientRect().top < footer.getBoundingClientRect().top;
    if (control.hidden) return { applicable: false, guideReady, pass: guideReady };

    select.value = "history";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && document.documentElement.dataset.viewMode !== "history") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    const guideDismissedByInteraction = guide.hidden && guide.dataset.dismissedBy === "interaction";
    const firstDateTime = document.querySelector("#status-ticker-context")?.dateTime ?? "";
    const firstLabel = document.querySelector("#status-ticker-context")?.textContent.trim() ?? "";
    await new Promise((resolve) => setTimeout(resolve, 800));
    const secondDateTime = document.querySelector("#status-ticker-context")?.dateTime ?? "";

    document.querySelector('[data-map-journey="stranded"]')?.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const waitOpen = document.querySelector("#airport-wait-disclosure")?.open === true;
    const emergencyOpen = document.querySelector("#emergency-support-disclosure")?.open === true;

    select.value = "live";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      applicable: true,
      guideReady,
      guideDismissedByInteraction,
      firstDateTime,
      firstLabel,
      fixedOnDayTen: firstDateTime.includes("-08-10T") && (firstLabel.includes("8月10日") || firstLabel.includes("08/10")) && firstDateTime === secondDateTime,
      waitOpen,
      emergencyOpen,
      pass: guideReady && guideDismissedByInteraction && firstDateTime.includes("-08-10T") && (firstLabel.includes("8月10日") || firstLabel.includes("08/10")) && firstDateTime === secondDateTime && waitOpen && emergencyOpen
    };
  })()`);

  const railInteraction = await evaluate(client, `(async () => {
    document.querySelector('[data-map-journey="arrival"]')?.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const buttons = [...document.querySelectorAll(".status-ticker-sequence:not([aria-hidden='true']) .status-ticker-item[data-rail-operator]")];
    const snapshots = [];
    for (const button of buttons) {
      const label = button.querySelector("strong")?.textContent.trim() ?? "";
      button.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      snapshots.push({
        label,
        title: document.querySelector("#map-decision-title")?.textContent.trim() ?? "",
        detail: document.querySelector("#map-decision-detail")?.textContent.trim() ?? "",
        officialUrl: document.querySelector("#map-decision-link")?.href ?? "",
        selected: document.querySelector("#map-decision-title")?.textContent.trim().length > 0,
        element: button.tagName
      });
    }
    buttons[0]?.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      snapshots,
      pass: snapshots.length >= 1
        && snapshots.every((snapshot) => snapshot.element === "BUTTON"
          && snapshot.selected
          && snapshot.title.length > 0
          && snapshot.detail.length > 0
          && snapshot.officialUrl.startsWith("https://"))
    };
  })()`);

  const mapDetailInteraction = await evaluate(client, `(async () => {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    const toggle = document.querySelector("#map-decision-toggle");
    const body = document.querySelector("#map-decision-body");
    const transportDisclosure = document.querySelector("#transport-detail-disclosure");
    if (toggle.getAttribute("aria-expanded") === "true") toggle.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const closedInitially = toggle.getAttribute("aria-expanded") === "false" && body.hidden && !transportDisclosure.open;
    toggle.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const fieldIds = ["map-service-section", "map-service-direction", "map-service-reason", "map-service-updated", "map-service-alternative"];
    const fieldValues = Object.fromEntries(fieldIds.map((id) => [id, document.querySelector("#" + id)?.textContent.trim() ?? ""]));
    const officialUrl = document.querySelector("#map-decision-link")?.href ?? "";
    const modeTabs = [...document.querySelectorAll("[data-map-transport]")].filter((node) => !node.hidden);
    const opened = toggle.getAttribute("aria-expanded") === "true" && !body.hidden && transportDisclosure.open;
    const disclosureUsesSamePattern = transportDisclosure.tagName === "DETAILS"
      && Boolean(transportDisclosure.querySelector(":scope > summary"))
      && Boolean(transportDisclosure.closest("#travel-decision"))
      && !document.querySelector("#airport-wait-disclosure").open;
    const serviceSelections = [];
    for (const mode of ${JSON.stringify(hasDirectRail ? ["rail", "bus", "road"] : ["bus", "road"])}) {
      document.querySelector('[data-map-transport="' + mode + '"]')?.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const serviceIds = [...document.querySelectorAll("#map-transport-services button")]
        .map((button) => button.dataset.serviceId);
      for (const serviceId of serviceIds) {
        const service = document.querySelector('#map-transport-services button[data-service-id="' + serviceId + '"]');
        const label = service?.querySelector("strong")?.textContent.trim() ?? "";
        service?.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        serviceSelections.push({
          mode,
          serviceId,
          label,
          renderedTitle: document.querySelector("#map-service-title")?.textContent.trim() ?? "",
          renderedCategory: document.querySelector("#map-service-category")?.textContent.trim() ?? "",
          pressed: document.querySelector('#map-transport-services button[data-service-id="' + serviceId + '"]')?.getAttribute("aria-pressed") === "true",
          semanticRole: document.querySelector('#map-transport-services button[data-service-id="' + serviceId + '"]')?.getAttribute("role") ?? "button"
        });
      }
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const waitForStableMapLayout = async () => {
      let previousSignature = "";
      let stableSamples = 0;
      const deadline = Date.now() + 4000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const boxes = [
          document.querySelector("#map-decision"),
          ...document.querySelectorAll(".semantic-map-marker.is-airport, .semantic-map-marker.is-station")
        ].map((node) => {
          const box = node?.getBoundingClientRect();
          return box ? [box.left, box.top, box.right, box.bottom].map((value) => Math.round(value * 2) / 2) : null;
        });
        const signature = JSON.stringify(boxes);
        const mapIsMoving = globalThis.__NARITA_MAP__?.isMoving?.() ?? false;
        stableSamples = !mapIsMoving && signature === previousSignature ? stableSamples + 1 : 0;
        previousSignature = signature;
        if (stableSamples >= 4) return;
      }
    };
    await waitForStableMapLayout();
    const panel = document.querySelector("#map-decision");
    const attributionControl = document.querySelector(".maplibregl-ctrl-attrib");
    const attribution = document.querySelector(".maplibregl-ctrl-attrib-button");
    const attributionInner = document.querySelector(".maplibregl-ctrl-attrib-inner");
    const attributionControlBox = attributionControl?.getBoundingClientRect();
    const attributionBox = attribution?.getBoundingClientRect();
    const attributionInnerBox = attributionInner?.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    const attributionOverlaps = attributionBox
      ? attributionBox.left < panelBox.right
        && attributionBox.right > panelBox.left
        && attributionBox.top < panelBox.bottom
        && attributionBox.bottom > panelBox.top
      : true;
    const attributionHit = attributionBox
      ? document.elementFromPoint((attributionBox.left + attributionBox.right) / 2, (attributionBox.top + attributionBox.bottom) / 2)
      : null;
    const attributionTextOverlaps = attributionBox && attributionInnerBox
      ? attributionBox.left < attributionInnerBox.right
        && attributionBox.right > attributionInnerBox.left
        && attributionBox.top < attributionInnerBox.bottom
        && attributionBox.bottom > attributionInnerBox.top
      : true;
    const attributionStyle = attribution ? getComputedStyle(attribution) : null;
    const attributionIconSingle = attributionStyle?.backgroundRepeat === "no-repeat"
      && attributionStyle.backgroundPosition.includes("50%")
      && attributionStyle.backgroundSize === "24px 24px";
    const landmarkBoxes = [...document.querySelectorAll(".semantic-map-marker.is-airport, .semantic-map-marker.is-station")]
      .map((marker) => {
        const box = marker.getBoundingClientRect();
        return {
          kind: marker.classList.contains("is-airport") ? "airport" : "station",
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          left: box.left,
          width: box.width,
          height: box.height
        };
      });
    const attributionLandmarkOverlaps = attributionControlBox
      ? landmarkBoxes.filter((box) =>
        attributionControlBox.left < box.right
          && attributionControlBox.right > box.left
          && attributionControlBox.top < box.bottom
          && attributionControlBox.bottom > box.top
      )
      : landmarkBoxes;
    const panelLandmarkOverlaps = landmarkBoxes.filter((box) =>
      panelBox.left < box.right
        && panelBox.right > box.left
        && panelBox.top < box.bottom
        && panelBox.bottom > box.top
    );
    const topOverlayBoxes = [...document.querySelectorAll("#map-layer-toolbar, #weather-map-legend:not([hidden])")]
      .map((overlay) => {
        const box = overlay.getBoundingClientRect();
        return { id: overlay.id, top: box.top, right: box.right, bottom: box.bottom, left: box.left };
      });
    const topOverlayLandmarkOverlaps = landmarkBoxes.flatMap((landmark) =>
      topOverlayBoxes
        .filter((overlay) =>
          overlay.left < landmark.right
            && overlay.right > landmark.left
            && overlay.top < landmark.bottom
            && overlay.bottom > landmark.top
        )
        .map((overlay) => ({ landmark: landmark.kind, overlay: overlay.id }))
    );
    const landmarkPairOverlaps = landmarkBoxes.flatMap((landmark, index) =>
      landmarkBoxes.slice(index + 1)
        .filter((other) =>
          landmark.left < other.right
            && landmark.right > other.left
            && landmark.top < other.bottom
            && landmark.bottom > other.top
        )
        .map((other) => ({ first: landmark.kind, second: other.kind }))
    );
    const attributionClear = !attributionOverlaps
      && !attributionTextOverlaps
      && attributionIconSingle
      && attributionLandmarkOverlaps.length === 0
      && Boolean(attributionHit?.closest(".maplibregl-ctrl-attrib"));
    const landmarksClear = panelLandmarkOverlaps.length === 0
      && topOverlayLandmarkOverlaps.length === 0
      && landmarkPairOverlaps.length === 0;
    const serviceLabelsFullyVisible = [...document.querySelectorAll(".map-transport-service strong")].every((label) =>
      label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1
    );
    const controlsAreDistinct = [...document.querySelectorAll("[data-map-layer]")].filter((node) => !node.hidden).every((node) =>
      node.hasAttribute("aria-pressed") && !node.hasAttribute("aria-selected") && node.querySelector(".layer-visibility-indicator")
    ) && modeTabs.every((node) =>
      node.getAttribute("role") === "tab" && node.hasAttribute("aria-selected") && !node.hasAttribute("aria-pressed")
    );
    const expandedHeightIsBounded = panelBox.height <= innerHeight * 0.47 + 1;
    toggle.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const closedAgain = toggle.getAttribute("aria-expanded") === "false" && body.hidden && !transportDisclosure.open;
    return {
      closedInitially,
      opened,
      closedAgain,
      disclosureUsesSamePattern,
      modeTabCount: modeTabs.length,
      fieldValues,
      serviceSelections,
      officialUrl,
      attributionClear,
      attributionOverlaps,
      attributionTextOverlaps,
      attributionIconSingle,
      attributionBackground: attributionStyle ? {
        repeat: attributionStyle.backgroundRepeat,
        position: attributionStyle.backgroundPosition,
        size: attributionStyle.backgroundSize
      } : null,
      attributionControlBox: attributionControlBox ? {
        top: attributionControlBox.top,
        right: attributionControlBox.right,
        bottom: attributionControlBox.bottom,
        left: attributionControlBox.left,
        width: attributionControlBox.width,
        height: attributionControlBox.height
      } : null,
      landmarkBoxes,
      attributionLandmarkOverlaps,
      panelLandmarkOverlaps,
      topOverlayLandmarkOverlaps,
      landmarkPairOverlaps,
      attributionBox: attributionBox ? {
        top: attributionBox.top,
        right: attributionBox.right,
        bottom: attributionBox.bottom,
        left: attributionBox.left,
        width: attributionBox.width,
        height: attributionBox.height
      } : null,
      attributionHit: attributionHit?.className ?? attributionHit?.tagName ?? null,
      panelBox: { top: panelBox.top, right: panelBox.right, bottom: panelBox.bottom, left: panelBox.left, height: panelBox.height },
      serviceLabelsFullyVisible,
      controlsAreDistinct,
      expandedHeight: panelBox.height,
      expandedHeightIsBounded,
      pass: closedInitially
        && opened
        && closedAgain
        && disclosureUsesSamePattern
        && modeTabs.length === ${hasDirectRail ? 3 : 2}
        && Object.values(fieldValues).every((value) => value.length > 0 && value !== "—")
        && serviceSelections.length >= (${isRegionalAirport} ? ${hasDirectRail ? 3 : 2} : 8)
        && serviceSelections.every((selection) => selection.semanticRole === "button"
          && selection.pressed
          && selection.label === selection.renderedTitle
          && selection.renderedCategory === ({
            rail: "鉄道",
            bus: "空港バス",
            road: "道路"
          })[selection.mode])
        && attributionClear
        && landmarksClear
        && serviceLabelsFullyVisible
        && controlsAreDistinct
        && expandedHeightIsBounded
        && officialUrl.startsWith("https://")
    };
  })()`);

  const airportSearchInteraction = await evaluate(client, `(async () => {
    const picker = document.querySelector("#airport-picker-button");
    const dialog = document.querySelector("#airport-picker-dialog");
    const input = document.querySelector("#airport-search");
    picker.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const initialCount = document.querySelectorAll(".airport-result-button").length;
    const dialogBox = dialog.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();

    input.value = "HND";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const matches = [...document.querySelectorAll(".airport-result-button")];
    const hndMatch = matches.length === 1 && matches[0].dataset.airportId === "hnd";
    const resultMinHeight = Math.min(...matches.map((button) => button.getBoundingClientRect().height));

    input.value = "NO-SUCH-AIRPORT";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const emptyVisible = document.querySelector("#airport-search-empty").hidden === false
      && document.querySelectorAll(".airport-result-button").length === 0;
    dialog.close();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    return {
      initialCount,
      hndMatch,
      emptyVisible,
      inputHeight: inputBox.height,
      resultMinHeight,
      dialogWithinViewport: dialogBox.top >= 0 && dialogBox.bottom <= innerHeight,
      expandedReset: picker.getAttribute("aria-expanded") === "false",
      pass: initialCount >= 30
        && hndMatch
        && emptyVisible
        && inputBox.height >= 44
        && resultMinHeight >= 44
        && dialogBox.top >= 0
        && dialogBox.bottom <= innerHeight
        && picker.getAttribute("aria-expanded") === "false"
    };
  })()`);

  const layerInteraction = await evaluate(client, `(async () => {
    const map = globalThis.__NARITA_MAP__;
    const layers = {
      railway: ["gsi-railway", "access-rail-casing", "access-rail-lines", "access-rail-alerts", "event-rail-casing", "event-rail-lines", "railway-points"],
      bus: ["access-bus-casing", "access-bus-lines", "access-bus-alerts", "event-bus-casing", "event-bus-lines"],
      road: ["access-road-casing", "access-road-lines", "access-road-alerts", "event-road-casing", "event-road-lines", "road-points"],
      weather: ["weather-areas", "weather-points"]
    };
    const snapshots = [];
    for (const button of [...document.querySelectorAll("[data-map-layer]")].filter((node) => !node.hidden)) {
      const category = button.dataset.mapLayer;
      if (${isRegionalAirport} && !${measurement.sampleDemo} && category === "weather") {
        const officialLinkAction = !button.hasAttribute("aria-pressed")
          && button.classList.contains("is-official-link")
          && button.getAttribute("aria-label")?.trim().length > 0
          && button.title.trim().length > 0;
        snapshots.push({ category, mode: "official_link", pass: officialLinkAction });
        continue;
      }
      button.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const mapLayersHidden = !map || (layers[category] ?? []).every((id) => !map.getLayer(id) || map.getLayoutProperty(id, "visibility") === "none");
      const off = button.getAttribute("aria-pressed") === "false" && mapLayersHidden;
      button.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const mapLayersVisible = !map || (layers[category] ?? []).every((id) => !map.getLayer(id) || map.getLayoutProperty(id, "visibility") !== "none");
      const on = button.getAttribute("aria-pressed") === "true" && mapLayersVisible;
      snapshots.push({ category, mode: "map_layer", off, on, pass: off && on });
    }
    return { snapshots, pass: snapshots.length === ${hasDirectRail ? 4 : 3} && snapshots.every((snapshot) => snapshot.pass) };
  })()`);

  const staleView = measurement.decisionState.includes("is-stale-snapshot");
  const checks = {
    viewportIs390By844: measurement.viewport.width === viewport.width && measurement.viewport.height === viewport.height,
    noHorizontalOverflow: measurement.document.horizontalOverflow === 0,
    mapFillsFirstViewport: measurement.boxes.map?.top >= 0 && measurement.boxes.map?.bottom <= viewport.height,
    journeyContextVisible: measurement.choiceCount === 3
      && measurement.choiceMinHeight >= 44
      && measurement.boxes.journey?.top >= 0,
    statusTickerVisible: measurement.boxes.ticker?.top >= 0
      && measurement.boxes.ticker?.bottom <= measurement.boxes.map?.top
      && (measurement.boxes.tickerToggle?.display === "none"
        || (measurement.boxes.tickerToggle?.width >= 44 && measurement.boxes.tickerToggle?.height >= 44)),
    tickerNeverRendersBlank: tickerVisualContinuity.pass && tickerPauseInteraction.pass,
    airportNameIsIntegratedSelector: measurement.airportSelectorIntegrated
      && measurement.boxes.airportSelector?.top >= 0
      && measurement.boxes.airportSelector?.bottom <= measurement.boxes.header?.bottom
      && measurement.boxes.airportSelector?.height >= 44
      && measurement.airportTitleText.length > 3
      && measurement.airportTitleFullText.length >= measurement.airportTitleText.length
      && measurement.airportTitleFullyVisible
      && measurement.airportPickerCurrentId === airportId,
    airportSearchWorks: airportSearchInteraction.pass,
    sampleDataClearlyLabeled: !measurement.sampleDemo
      || (measurement.boxes.sampleBanner?.top >= 0
        && measurement.boxes.sampleBanner?.bottom <= viewport.height
        && measurement.sampleBannerText.length >= 12
        && measurement.tickerPrompt.length >= 8
        && measurement.tickerContextDateTime === measurement.sampleGeneratedAt),
    semanticAirportVisible: measurement.boxes.airport?.top >= 0
      && measurement.boxes.airport?.bottom <= viewport.height,
    airportAndGatewayNearVerticalCenter: mapFrame.pass,
    fourMapLayerTogglesVisible: measurement.layerToggleCount === (hasDirectRail ? 4 : 3)
      && measurement.layerIndicatorCount === (hasDirectRail ? 4 : 3)
      && measurement.layerIndicatorText.every((label) => label.length > 0 && label !== "✓")
      && measurement.layerToggleMinHeight >= 44
      && measurement.boxes.layerToolbar?.top >= measurement.boxes.map?.top
      && measurement.boxes.layerToolbar?.bottom <= measurement.boxes.decision?.top,
    tickerDetailsOrOfficialSourcesAvailable: isRegionalAirport
      ? measurement.sampleDemo
        ? measurement.tickerItemCount >= 3
          && measurement.recordedStatusTickerCount >= 3
          && measurement.tickerPrompt.length >= 8
        : measurement.tickerItemCount >= 3
          && measurement.tickerOfficialLinkCount === measurement.tickerItemCount
          && measurement.tickerPrompt.length >= 8
          && measurement.recordedStatusTickerCount === 0
      : railInteraction.pass,
    mapLayerTogglesWork: layerInteraction.pass,
    transportModesAreVisuallyEncoded: measurement.transportModeMarkerCount === (hasDirectRail ? 3 : 2)
      && measurement.transportModeCategories.length === (hasDirectRail ? 3 : 2),
    decisionVisible: measurement.boxes.decision?.bottom <= viewport.height
      && measurement.decisionToggleHidden
      && measurement.journeyBoardHidden
      && measurement.journeyPressedStates.every((state) => state === "false")
      && !measurement.utilityMenuPresent
      && !measurement.decisionToggleExpanded
      && mapDetailInteraction.pass,
    journeySelectionGateWorks: journeySelectionInteraction.pass,
    sampleScenarioSelectorWorks: sampleScenarioInteraction.pass,
    allFiveLocalesFitFirstViewport: Object.values(localeLayouts).every((layout) => layout.pass),
    topPageClutterRemoved: measurement.topPageClutterHidden,
    staleSnapshotShowsStatesWithTimestamp: !staleView
      || (measurement.decisionKicker.length > 0
        && measurement.decisionTime !== "—"
        && measurement.recordedStatusTickerCount >= 1
        && measurement.staleTicker),
    noInternalStatusCopy: !measurement.internalStatusVisible,
    mapLoadedWithoutError: measurement.mapError === ""
  };
  const report = {
    generated_at: new Date().toISOString(),
    target_url: targetUrl,
    airport_id: airportId,
    viewport,
    checks,
    measurement,
    locale_layouts: localeLayouts,
    airport_search_interaction: airportSearchInteraction,
    rail_interaction: railInteraction,
    map_detail_interaction: mapDetailInteraction,
    journey_selection_interaction: journeySelectionInteraction,
    sample_scenario_interaction: sampleScenarioInteraction,
    layer_interaction: layerInteraction,
    ticker_visual_continuity: tickerVisualContinuity,
    ticker_pause_interaction: tickerPauseInteraction,
    map_frame: mapFrame,
    result: Object.values(checks).every(Boolean) ? "PASS" : "FAIL"
  };

  if (screenshotPath) {
    await evaluate(client, `window.scrollTo({ top: 0, left: 0, behavior: "instant" })`);
    await delay(100);
    if (screenshotState === "expanded") {
      await evaluate(client, `(() => {
        document.querySelector('[data-map-journey="arrival"]')?.click();
        const toggle = document.querySelector("#map-decision-toggle");
        if (toggle && toggle.getAttribute("aria-expanded") !== "true") toggle.click();
        document.querySelector("#travel-decision")?.scrollIntoView({ block: "start", behavior: "instant" });
      })()`);
      await delay(900);
    }
    if (searchQuery !== undefined) {
      await evaluate(client, `(() => {
        const picker = document.querySelector("#airport-picker-button");
        const dialog = document.querySelector("#airport-picker-dialog");
        const input = document.querySelector("#airport-search");
        if (!dialog.open) picker.click();
        input.value = ${JSON.stringify(searchQuery)};
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      })()`);
      await delay(150);
    }
    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height, scale: 1 }
    });
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  }

  if (reportPath) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.result !== "PASS") process.exitCode = 1;
} finally {
  client.close();
}
