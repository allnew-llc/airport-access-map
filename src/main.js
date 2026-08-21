import { AttributionControl, Map, Marker, NavigationControl, Popup, ScaleControl, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { CATEGORY_IDS, createLayerControl } from "./components/layer-control.js";
import { showStatusError, updateStatusBanner } from "./components/status-banner.js";
import {
  applyDocumentTranslations,
  createI18n,
  localizedProperty,
  usesJapaneseFallback
} from "./i18n.js";
import { sampleSnapshotText, validateSampleHistoryForBrowser } from "./sample-history.js";
import {
  buildHistoryCollection,
  createHistoryTimeline
} from "./history-timeline.js";
import {
  HistoryRangeError,
  defaultHistoryRange,
  filesForHistoryRange,
  formatJstDateTimeInput,
  historyBounds,
  historyRangeFromSearch,
  historyRangeToUrlValue,
  parseJstDateTimeInput,
  replayIndicesForRange,
  validateHistoryIndex,
  validateHistoryRange
} from "./history-range.js";
import {
  CURRENT_STATUS_GROUPS as NRT_CURRENT_STATUS_GROUPS,
  MUNICIPAL_SUPPORT as NRT_MUNICIPAL_SUPPORT,
  OFFICIAL_LINKS as NRT_OFFICIAL_LINKS,
  TRANSPORT_OPTIONS as NRT_TRANSPORT_OPTIONS,
  routeStatusKey,
  userFacingTransportStatus,
  worstStatus
} from "./journey-guidance.js";
import {
  AIRPORTS,
  AIRPORT_REGION_LABELS,
  AIRPORT_REGION_ORDER,
  airportText,
  airportUrl,
  regionalCurrentData,
  resolveAirport
} from "./airport-registry.js";
import { filterAirports } from "./airport-search.js";

const airport = resolveAirport();
const IS_NARITA = airport.id === "nrt";
const HAS_DIRECT_RAIL = airport.railAccess === "direct";
const SAMPLE_DEMO = import.meta.env.VITE_SAMPLE_DEMO === "true";
const HISTORY_AVAILABLE = SAMPLE_DEMO;
document.documentElement.dataset.sampleDemo = String(SAMPLE_DEMO);
const NARITA_AIRPORT = airport.airport;
const TOKYO_STATION = airport.gateway.coordinate;
const ACCESS_NETWORK_CENTER = [
  (NARITA_AIRPORT[0] + TOKYO_STATION[0]) / 2,
  (NARITA_AIRPORT[1] + TOKYO_STATION[1]) / 2
];
const ACCESS_NETWORK_BOUNDS = [
  [
    Math.min(NARITA_AIRPORT[0], TOKYO_STATION[0]),
    Math.min(NARITA_AIRPORT[1], TOKYO_STATION[1])
  ],
  [
    Math.max(NARITA_AIRPORT[0], TOKYO_STATION[0]),
    Math.max(NARITA_AIRPORT[1], TOKYO_STATION[1])
  ]
];
const GSI_VECTOR_STYLE = {
  version: 8,
  glyphs: "https://maps.gsi.go.jp/xyz/noto-jp/{fontstack}/{range}.pbf",
  sources: {
    gsi: {
      type: "vector",
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{z}/{x}/{y}.pbf"],
      minzoom: 4,
      maxzoom: 16,
      attribution: "国土地理院"
    }
  },
  layers: [
    { id: "gsi-background", type: "background", paint: { "background-color": "#e8eef5" } },
    { id: "gsi-water", type: "fill", source: "gsi", "source-layer": "waterarea", paint: { "fill-color": "#c7dce8", "fill-opacity": 0.9 } },
    { id: "gsi-landform", type: "fill", source: "gsi", "source-layer": "landforma", paint: { "fill-color": "#dce7d6", "fill-opacity": 0.55 } },
    { id: "gsi-building", type: "fill", source: "gsi", "source-layer": "building", minzoom: 13, paint: { "fill-color": "#d6d9df", "fill-outline-color": "#c2c7cf" } },
    { id: "gsi-contour", type: "line", source: "gsi", "source-layer": "contour", paint: { "line-color": "#c7bfae", "line-width": 0.55, "line-opacity": 0.5 } },
    { id: "gsi-boundary", type: "line", source: "gsi", "source-layer": "boundary", paint: { "line-color": "#aeb8c6", "line-width": 0.8, "line-dasharray": [3, 2] } },
    { id: "gsi-road-casing", type: "line", source: "gsi", "source-layer": "road", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#c6cdd6", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.4, 14, 5.2] } },
    { id: "gsi-road", type: "line", source: "gsi", "source-layer": "road", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 14, 3.8] } },
    { id: "gsi-railway", type: "line", source: "gsi", "source-layer": "railway", paint: { "line-color": "#7e8795", "line-width": 1, "line-dasharray": [2, 1.5] } },
    {
      id: "gsi-label",
      type: "symbol",
      source: "gsi",
      "source-layer": "label",
      layout: {
        "text-field": ["coalesce", ["get", "annoChar"], ["get", "name"], ""],
        "text-font": ["NotoSansCJKjp-Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 14, 13],
        "text-allow-overlap": false
      },
      paint: { "text-color": "#425067", "text-halo-color": "#f4f7fb", "text-halo-width": 1.2 }
    }
  ]
};
const DATA_URL = `${import.meta.env.BASE_URL}data/latest-disaster.json`;
const HISTORY_INDEX_URL = `${import.meta.env.BASE_URL}data/history-index.json`;
const NETWORK_DATA_URL = `${import.meta.env.BASE_URL}data/access-network.geojson`;
const SAMPLE_DATA_ROOT = `${import.meta.env.BASE_URL}data/sample/${airport.id}`;
const OFFICIAL_LINKS = IS_NARITA ? NRT_OFFICIAL_LINKS : airport.links;
const CURRENT_STATUS_GROUPS = IS_NARITA ? NRT_CURRENT_STATUS_GROUPS : airport.statusGroups;
const MUNICIPAL_SUPPORT = IS_NARITA ? NRT_MUNICIPAL_SUPPORT : airport.support;
const TRANSPORT_OPTIONS = IS_NARITA ? NRT_TRANSPORT_OPTIONS : Object.freeze([
  { id: "rail", category: "railway", title: airport.statusGroups.find((group) => group.id === "rail")?.title, detail: airport.services.find((service) => service.category === "railway")?.detail, linkKey: "rail", actionKey: "viewOfficialRail" },
  { id: "bus", category: "bus", title: airport.statusGroups.find((group) => group.id === "bus")?.title, detail: airport.services.find((service) => service.category === "bus")?.detail, linkKey: "bus", actionKey: "viewOfficialBus" },
  { id: "road", category: "road", title: airport.statusGroups.find((group) => group.id === "road")?.title, detail: airport.services.find((service) => service.category === "road")?.detail, linkKey: "taxi", actionKey: "viewOfficialRoadTaxi" }
].filter((option) => option.title));
const TRANSPORT_OPTION_ICONS = Object.freeze({ rail: "🚆", bus: "🚌", road: "🚗" });
const MAP_TRANSPORT_VISUALS = Object.freeze({
  railway: { layerName: "rail", symbol: "🚆", color: "#17658f", fallbackProgress: 0.34 },
  bus: { layerName: "bus", symbol: "🚌", color: "#8b5d16", fallbackProgress: 0.52 },
  road: { layerName: "road", symbol: "🚗", color: "#52616d", fallbackProgress: 0.7 }
});
const RAIL_ROUTE_COLOR = [
  "match", ["get", "route_id"],
  "jr-sobu", "#16824b",
  "jr-narita", "#16824b",
  "keisei-main", "#005aaa",
  "hokuso", "#2f7f9a",
  "sky-access", "#d66b00",
  "#17658f"
];
const statusColors = { normal: "#147d73", warning: "#f2a900", suspended: "#d63b3b", unknown: "#71808a" };
const requestedLocale = new URLSearchParams(globalThis.location?.search ?? "").get("lang") ?? undefined;
const i18n = createI18n(requestedLocale);
const languageSelect = document.querySelector("#language-select");

function officialLink(key) {
  const value = OFFICIAL_LINKS[key];
  if (!value || airport.id !== "hnd" || i18n.locale === "ja") return value;
  const url = new URL(value);
  if (url.hostname === "tokyo-haneda.com" && !url.pathname.startsWith("/en/")) {
    url.pathname = `/en${url.pathname.startsWith("/") ? "" : "/"}${url.pathname}`;
  }
  return url.toString();
}
const DEMO_GUIDE_DISMISS_AFTER_MS = 10_000;
const DEMO_GUIDE_SESSION_KEY = "airport-access-demo-guide-dismissed-v1";
let demoGuideDismissTimer;
let demoGuideHideTimer;

function demoGuideWasDismissed() {
  try {
    return globalThis.sessionStorage?.getItem(DEMO_GUIDE_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberDemoGuideDismissal() {
  try {
    globalThis.sessionStorage?.setItem(DEMO_GUIDE_SESSION_KEY, "true");
  } catch { /* session storage is optional */ }
}

function finishDemoGuideDismissal(guide, moveFocus) {
  globalThis.clearTimeout?.(demoGuideHideTimer);
  guide.hidden = true;
  guide.classList.remove("is-dismissing");
  if (moveFocus) document.querySelector(".footer a")?.focus({ preventScroll: true });
}

function dismissDemoGuide(reason = "interaction") {
  const guide = document.querySelector(".demo-guide");
  if (!guide || guide.hidden || guide.classList.contains("is-dismissing")) return;
  const moveFocus = document.activeElement === document.querySelector("#demo-guide-close");
  globalThis.clearTimeout?.(demoGuideDismissTimer);
  rememberDemoGuideDismissal();
  guide.dataset.dismissedBy = reason;
  guide.setAttribute("aria-hidden", "true");
  guide.setAttribute("inert", "");
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    finishDemoGuideDismissal(guide, moveFocus);
    return;
  }
  guide.classList.add("is-dismissing");
  guide.addEventListener("transitionend", () => finishDemoGuideDismissal(guide, moveFocus), { once: true });
  demoGuideHideTimer = globalThis.setTimeout?.(() => finishDemoGuideDismissal(guide, moveFocus), 300);
}

function initializeDemoGuide() {
  const guide = document.querySelector(".demo-guide");
  if (!guide) return;
  if (demoGuideWasDismissed()) {
    guide.hidden = true;
    guide.setAttribute("aria-hidden", "true");
    guide.setAttribute("inert", "");
    return;
  }
  demoGuideDismissTimer = globalThis.setTimeout?.(() => dismissDemoGuide("timeout"), DEMO_GUIDE_DISMISS_AFTER_MS);
}

function localizedAirportLabel(ja, en, zhCN = en, zhTW = zhCN, ko = en) {
  return { ja, en, "zh-CN": zhCN, "zh-TW": zhTW, ko };
}

function configText(value) {
  return airportText(value, i18n.locale);
}

function headerAirportName(value) {
  const fullName = configText(value);
  if (fullName.length <= 22) return fullName;
  return fullName.replace(/\s+(?:International\s+)?Airport$/i, "");
}

function itemText(item, field, keyField) {
  return item?.[field] ? configText(item[field]) : i18n.t(item?.[keyField]);
}

let currentData;
let liveData;
let historyIndex;
let historyReplay;
let historyReplayError;
let historyRange;
let replayWindowIndices = [];
let historyReplayLoading = false;
let networkGuideData;
let semanticMarkers = [];
let semanticMarkerLayoutTimer;
let semanticMarkerLayoutRecoveryTimer;
let semanticMarkerLayoutInFlight = false;
let semanticMarkerLayoutQueued = false;
let transportModeMarkers = [];
let transportRouteMotionMarker;
let transportRouteAnimationFrame;
let transportRouteClearTimer;
let tickerPaused = false;
let activePopup;
let activeFeature;
let replayIndex = 0;
let replayTimer;
const initialSearchParams = new URLSearchParams(globalThis.location?.search ?? "");
let viewMode = HISTORY_AVAILABLE && ["history", "replay"].includes(initialSearchParams.get("view")) ? "history" : "live";
let journeyMode = null;
let selectedRailOperatorId = "jr";
let selectedMapTransportMode = HAS_DIRECT_RAIL ? "rail" : "bus";
let mapDecisionExpanded = false;
const selectedMapServiceByMode = { rail: null, bus: null, road: null };
const visibility = { ...Object.fromEntries(CATEGORY_IDS.map((category) => [category, true])), bus: true };
const TRUST_LINKS = IS_NARITA ? [
  ["serviceJrNarita", "jrStatus"],
  ["serviceKeisei", "keiseiStatus"],
  ["serviceHokuso", "hokusoStatus"],
  ["serviceLimousineBus", "busLimousine"],
  ["serviceKeiseiBus", "busKeisei"],
  ["serviceExpressway", "expressway"],
  ["serviceGeneralRoads", "generalRoads"],
  ["supportChibaPortal", "chibaDisaster"]
] : [
  [airport.name, "alerts"],
  [airport.statusGroups.find((group) => group.id === "bus")?.title, "busAll"],
  [airport.statusGroups.find((group) => group.id === "road")?.title, "expressway"],
  [localizedAirportLabel("地域防災情報", "Regional disaster information"), "disaster"]
];
const NON_DECISION_SOURCE_SCOPES = new Set(["source_reachability_only", "network_reference_only"]);
const TRANSPORT_OVERVIEW_ITEMS = IS_NARITA ? Object.freeze([
  { id: "jr", icon: "JR", itemIds: ["jr-narita"], labelKey: "serviceJrNarita", linkKey: "jrStatus", tone: "jr", routeIds: ["jr-sobu", "jr-narita"] },
  { id: "keisei", icon: "京", itemIds: ["keisei"], labelKey: "serviceKeisei", linkKey: "keiseiStatus", tone: "keisei", routeIds: ["keisei-main", "sky-access"] },
  { id: "hokuso", icon: "北", itemIds: ["hokuso"], labelKey: "serviceHokuso", linkKey: "hokusoStatus", tone: "hokuso", routeIds: ["hokuso"] },
  { id: "bus", icon: "BUS", itemIds: ["airport-bus", "limousine-bus", "keisei-bus"], labelKey: "serviceAirportBus", linkKey: "busAll", tone: "bus", routeIds: [] },
  { id: "road", icon: "道", itemIds: ["expressway", "general-roads"], labelKey: "serviceExpressway", linkKey: "expressway", tone: "road", routeIds: ["e51", "c4", "route-51", "route-295"] }
]) : airport.overview;
const RAIL_OPERATOR_ITEMS = IS_NARITA ? Object.freeze([
  { id: "jr", label: "JR", statusItemId: "jr-narita", idPattern: "jr-narita", labelKey: "serviceJrNarita", detailKey: "serviceJrNaritaDetail", linkKey: "jrStatus" },
  { id: "keisei", label: "京成", statusItemId: "keisei", idPattern: "keisei", labelKey: "serviceKeisei", detailKey: "serviceKeiseiDetail", linkKey: "keiseiStatus" },
  { id: "hokuso", label: "北総", statusItemId: "hokuso", idPattern: "hokuso", labelKey: "serviceHokuso", detailKey: "serviceHokusoDetail", linkKey: "hokusoStatus" }
]) : Object.freeze([]);
const MAP_LAYER_ITEMS = Object.freeze([
  ...(HAS_DIRECT_RAIL ? [{ category: "railway", labelKey: "mapLayerTrain" }] : []),
  { category: "bus", labelKey: "mapLayerBus" },
  { category: "road", labelKey: "mapLayerRoad" },
  { category: "weather", labelKey: "mapLayerWeather" }
]);

setWorkerUrl(workerUrl);

const layerIdsByCategory = {
  railway: ["gsi-railway", "access-rail-casing", "access-rail-lines", "access-rail-alerts", "event-rail-casing", "event-rail-lines", "railway-points"],
  bus: ["access-bus-casing", "access-bus-lines", "access-bus-alerts", "event-bus-casing", "event-bus-lines"],
  road: ["access-road-casing", "access-road-lines", "access-road-alerts", "event-road-casing", "event-road-lines", "road-points"],
  weather: ["weather-areas", "weather-area-outlines", "weather-points"],
  facility: ["facility-points"]
};

const map = new Map({
  container: "map",
  style: GSI_VECTOR_STYLE,
  center: ACCESS_NETWORK_CENTER,
  zoom: 9.35,
  minZoom: 7,
  maxZoom: 17,
  attributionControl: false,
  locale: {
    "NavigationControl.ZoomIn": i18n.t("zoomIn"),
    "NavigationControl.ZoomOut": i18n.t("zoomOut"),
    "NavigationControl.ResetBearing": i18n.t("resetBearing"),
    "AttributionControl.ToggleAttribution": i18n.t("attribution")
  }
});
if (import.meta.env.DEV) globalThis.__NARITA_MAP__ = map;

map.addControl(new NavigationControl({ showCompass: true }), "top-right");
if (!globalThis.matchMedia?.("(max-width: 620px)").matches) {
  map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
}
map.addControl(new AttributionControl({ compact: true }), "bottom-right");
map.on("error", (event) => console.warn("MapLibre resource warning", event.error));
map.on("moveend", () => layoutSemanticMapMarkers());
globalThis.addEventListener?.("scroll", () => layoutSemanticMapMarkers(), { passive: true });

function transportModeMarkerElement(category, { moving = false } = {}) {
  const visual = MAP_TRANSPORT_VISUALS[category];
  const element = document.createElement("span");
  element.className = `transport-mode-map-marker is-${category}${moving ? " is-moving" : ""}`;
  element.style.setProperty("--transport-color", visual.color);
  element.textContent = visual.symbol;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function routeCoordinateAtProgress(coordinates, progress) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
  if (coordinates.length === 1) return coordinates[0];
  const averageLatitude = coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length;
  const longitudeScale = Math.cos(averageLatitude * Math.PI / 180);
  const lengths = [];
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const longitude = (coordinates[index][0] - coordinates[index - 1][0]) * longitudeScale;
    const latitude = coordinates[index][1] - coordinates[index - 1][1];
    const length = Math.hypot(longitude, latitude);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return coordinates[0];
  const target = Math.max(0, Math.min(1, progress)) * total;
  let travelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    const next = travelled + lengths[index];
    if (target <= next || index === lengths.length - 1) {
      const localProgress = lengths[index] === 0 ? 0 : (target - travelled) / lengths[index];
      return [
        coordinates[index][0] + (coordinates[index + 1][0] - coordinates[index][0]) * localProgress,
        coordinates[index][1] + (coordinates[index + 1][1] - coordinates[index][1]) * localProgress
      ];
    }
    travelled = next;
  }
  return coordinates.at(-1);
}

function clearTransportRouteAnimation({ keepFrame = false } = {}) {
  if (transportRouteAnimationFrame) globalThis.cancelAnimationFrame?.(transportRouteAnimationFrame);
  globalThis.clearTimeout?.(transportRouteClearTimer);
  transportRouteAnimationFrame = undefined;
  transportRouteClearTimer = undefined;
  if (keepFrame) return;
  transportRouteMotionMarker?.remove();
  transportRouteMotionMarker = undefined;
}

function animateTransportRoute(feature) {
  const category = feature?.properties?.category;
  const visual = MAP_TRANSPORT_VISUALS[category];
  const coordinates = feature?.geometry?.type === "LineString" ? feature.geometry.coordinates : null;
  if (!visual || !visibility[category] || !Array.isArray(coordinates) || coordinates.length < 2) return;

  clearTransportRouteAnimation();
  const renderAt = (progress) => {
    const coordinate = routeCoordinateAtProgress(coordinates, progress);
    if (!transportRouteMotionMarker) {
      transportRouteMotionMarker = new Marker({ element: transportModeMarkerElement(category, { moving: true }), anchor: "center" })
        .setLngLat(coordinate)
        .addTo(map);
    } else {
      transportRouteMotionMarker.setLngLat(coordinate);
    }
  };

  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    renderAt(0.5);
    transportRouteClearTimer = globalThis.setTimeout?.(() => clearTransportRouteAnimation(), 1400);
    return;
  }

  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const duration = 1800;
  const step = (now) => {
    const linearProgress = Math.min(1, (now - startedAt) / duration);
    const easedProgress = 0.5 - Math.cos(linearProgress * Math.PI) / 2;
    renderAt(easedProgress);
    if (linearProgress < 1) {
      transportRouteAnimationFrame = globalThis.requestAnimationFrame?.(step);
      return;
    }
    transportRouteAnimationFrame = undefined;
    transportRouteClearTimer = globalThis.setTimeout?.(() => clearTransportRouteAnimation(), 700);
  };
  transportRouteAnimationFrame = globalThis.requestAnimationFrame?.(step);
}

function representativeTransportCoordinate(category) {
  const target = [
    TOKYO_STATION[0] + (NARITA_AIRPORT[0] - TOKYO_STATION[0]) * MAP_TRANSPORT_VISUALS[category].fallbackProgress,
    TOKYO_STATION[1] + (NARITA_AIRPORT[1] - TOKYO_STATION[1]) * MAP_TRANSPORT_VISUALS[category].fallbackProgress
  ];
  const networkCoordinates = networkGuideData?.features
    ?.filter((feature) =>
      feature.properties?.kind === "route"
      && feature.properties?.category === category
      && feature.geometry?.type === "LineString"
    )
    .flatMap((feature) => feature.geometry.coordinates) ?? [];
  if (networkCoordinates.length > 0) {
    return networkCoordinates.slice().sort((left, right) => {
      const leftDistance = Math.hypot(left[0] - target[0], left[1] - target[1]);
      const rightDistance = Math.hypot(right[0] - target[0], right[1] - target[1]);
      return leftDistance - rightDistance;
    })[0];
  }
  const fallbackFeature = currentData?.features?.find((feature) =>
    feature.properties?.category === category
  );
  if (!fallbackFeature) return null;
  return fallbackFeature.geometry?.type === "LineString"
    ? routeCoordinateAtProgress(fallbackFeature.geometry.coordinates, MAP_TRANSPORT_VISUALS[category].fallbackProgress)
    : featureCenter(fallbackFeature);
}

function addTransportModeMarkers() {
  transportModeMarkers.forEach(({ marker }) => marker.remove());
  transportModeMarkers = [];
  for (const category of Object.keys(MAP_TRANSPORT_VISUALS)) {
    const coordinate = representativeTransportCoordinate(category);
    if (!coordinate) continue;
    const marker = new Marker({ element: transportModeMarkerElement(category), anchor: "center" })
      .setLngLat(coordinate)
      .addTo(map);
    transportModeMarkers.push({ category, marker });
  }
  syncTransportModeMarkerVisibility();
}

function syncTransportModeMarkerVisibility() {
  for (const { category, marker } of transportModeMarkers) {
    marker.getElement().hidden = !visibility[category];
  }
}

function semanticMarkerElement(kind, icon, label, { separated = false } = {}) {
  const element = document.createElement("div");
  element.className = `semantic-map-marker is-${kind}`;
  element.classList.toggle("is-separated", separated);
  element.setAttribute("aria-hidden", "true");
  const symbol = document.createElement("span");
  symbol.className = "semantic-map-marker-icon";
  symbol.textContent = icon;
  const text = document.createElement("strong");
  text.textContent = label;
  element.append(symbol, text);
  return element;
}

function addSemanticMapMarkers() {
  semanticMarkers.forEach(({ marker }) => marker.remove());
  semanticMarkers = [];
  const latitudeRadians = ((NARITA_AIRPORT[1] + TOKYO_STATION[1]) / 2) * Math.PI / 180;
  const landmarkDistance = Math.hypot(
    (NARITA_AIRPORT[0] - TOKYO_STATION[0]) * Math.cos(latitudeRadians),
    NARITA_AIRPORT[1] - TOKYO_STATION[1]
  );
  const separateNearbyLandmarks = landmarkDistance < 0.1;
  const markers = [
    {
      kind: "airport",
      icon: "✈",
      label: airport.code,
      coordinate: NARITA_AIRPORT,
      anchor: "bottom",
      offset: [0, separateNearbyLandmarks ? -12 : -6]
    },
    {
      kind: "station",
      icon: "🚉",
      label: IS_NARITA
        ? configText(localizedAirportLabel("東京駅（JR）", "Tokyo Station (JR)", "东京站（JR）", "東京站（JR）", "도쿄역(JR)"))
        : configText(airport.gateway.label),
      coordinate: TOKYO_STATION,
      anchor: separateNearbyLandmarks ? "top" : "bottom",
      offset: [0, separateNearbyLandmarks ? 10 : -6]
    }
  ];
  for (const item of markers) {
    const marker = new Marker({
      element: semanticMarkerElement(item.kind, item.icon, item.label, { separated: separateNearbyLandmarks }),
      anchor: item.anchor,
      offset: item.offset
    }).setLngLat(item.coordinate).addTo(map);
    semanticMarkers.push({ kind: item.kind, marker, baseOffset: item.offset });
  }
  syncSemanticMarkerVisibility();
  layoutSemanticMapMarkers();
}

const nextAnimationFrame = () => new Promise((resolve) => {
  globalThis.requestAnimationFrame?.(() => resolve());
});

function boxesIntersect(first, second) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}

function layoutSemanticMapMarkers() {
  globalThis.clearTimeout?.(semanticMarkerLayoutTimer);
  semanticMarkerLayoutTimer = globalThis.setTimeout?.(() => runSemanticMarkerLayout(), 0);
  globalThis.clearTimeout?.(semanticMarkerLayoutRecoveryTimer);
  semanticMarkerLayoutRecoveryTimer = globalThis.setTimeout?.(() => {
    semanticMarkerLayoutRecoveryTimer = undefined;
    if (map.isMoving()) {
      layoutSemanticMapMarkers();
      return;
    }
    runSemanticMarkerLayout();
  }, 1200);
}

async function runSemanticMarkerLayout() {
  if (semanticMarkerLayoutInFlight) {
    semanticMarkerLayoutQueued = true;
    return;
  }
  semanticMarkerLayoutInFlight = true;
  try {
    do {
      semanticMarkerLayoutQueued = false;
      await performSemanticMarkerLayout();
    } while (semanticMarkerLayoutQueued);
  } catch (error) {
    console.warn("Semantic marker layout warning", error);
  } finally {
    semanticMarkerLayoutInFlight = false;
  }
}

async function performSemanticMarkerLayout() {
  if (!globalThis.matchMedia?.("(max-width: 620px)").matches || semanticMarkers.length !== 2) return;

  for (const item of semanticMarkers) item.marker.setOffset(item.baseOffset);
  await nextAnimationFrame();
  await nextAnimationFrame();

  const stageBox = document.querySelector(".map-stage")?.getBoundingClientRect();
  const decisionBox = document.querySelector("#map-decision")?.getBoundingClientRect();
  if (!stageBox || !decisionBox) return;
  const toolbarBox = document.querySelector("#map-layer-toolbar")?.getBoundingClientRect();
  const weatherLegendBox = document.querySelector("#weather-map-legend:not([hidden])")?.getBoundingClientRect();
  const safeTop = Math.max(stageBox.top + 8, toolbarBox?.bottom ?? stageBox.top, weatherLegendBox?.bottom ?? stageBox.top) + 8;
  const safeBottom = Math.min(stageBox.bottom - 8, decisionBox.top - 8);
  const offsets = new globalThis.Map(semanticMarkers.map((item) => [item.kind, [...item.baseOffset]]));

  const markerBox = (item) => item.marker.getElement().getBoundingClientRect();
  for (const item of semanticMarkers) {
    const box = markerBox(item);
    if (box.left < stageBox.left + 8) offsets.get(item.kind)[0] += stageBox.left + 8 - box.left;
    if (box.right > stageBox.right - 8) offsets.get(item.kind)[0] -= box.right - (stageBox.right - 8);
    if (box.bottom > safeBottom) offsets.get(item.kind)[1] -= box.bottom - safeBottom;
  }
  for (const item of semanticMarkers) item.marker.setOffset(offsets.get(item.kind));
  await nextAnimationFrame();

  const [first, second] = semanticMarkers;
  const firstBox = markerBox(first);
  const secondBox = markerBox(second);
  if (boxesIntersect(firstBox, secondBox)) {
    const firstCenter = (firstBox.top + firstBox.bottom) / 2;
    const secondCenter = (secondBox.top + secondBox.bottom) / 2;
    const upper = firstCenter <= secondCenter ? first : second;
    const upperBox = upper === first ? firstBox : secondBox;
    const lowerBox = upper === first ? secondBox : firstBox;
    const upwardShift = upperBox.bottom - lowerBox.top + 8;
    const availableAbove = Math.max(0, upperBox.top - safeTop);
    const appliedUpwardShift = Math.min(upwardShift, availableAbove);
    offsets.get(upper.kind)[1] -= appliedUpwardShift;

    if (appliedUpwardShift < upwardShift) {
      const lower = upper === first ? second : first;
      const availableBelow = Math.max(0, safeBottom - lowerBox.bottom);
      offsets.get(lower.kind)[1] += Math.min(upwardShift - appliedUpwardShift, availableBelow);
    }
    for (const item of semanticMarkers) item.marker.setOffset(offsets.get(item.kind));
  }
}

function syncSemanticMarkerVisibility() {
  // The airport and its main ground-transport gateway are orientation landmarks and stay visible.
}

function syncSharedNetworkLayers() {
  const visibleCategories = ["railway", "bus", "road"].filter((category) => visibility[category]);
  const categoryFilter = ["in", ["get", "category"], ["literal", visibleCategories]];
  if (map.getLayer("access-network-labels")) {
    map.setFilter("access-network-labels", ["all", ["==", ["get", "kind"], "label"], categoryFilter]);
  }
  if (map.getLayer("access-network-alert-symbols")) {
    map.setFilter("access-network-alert-symbols", [
      "all",
      ["==", ["get", "kind"], "label"],
      categoryFilter,
      ["in", ["get", "alert_status"], ["literal", ["warning", "suspended"]]]
    ]);
  }
  if (map.getLayer("access-network-alert-patterns")) {
    map.setFilter("access-network-alert-patterns", [
      "all",
      ["==", ["get", "kind"], "route"],
      categoryFilter,
      ["in", ["get", "alert_status"], ["literal", ["warning", "suspended"]]]
    ]);
  }
}

function updateMapLayerToolbar() {
  for (const item of MAP_LAYER_ITEMS) {
    const button = document.querySelector(`[data-map-layer="${item.category}"]`);
    if (!button) continue;
    const isVisible = visibility[item.category];
    const label = i18n.t(item.labelKey);
    const indicator = button.querySelector(".layer-visibility-indicator");
    if (!IS_NARITA && !SAMPLE_DEMO && item.category === "weather") {
      const officialWeatherLabel = configText(localizedAirportLabel("気象庁の情報を開く", "Open JMA weather information", "打开日本气象厅信息", "開啟日本氣象廳資訊", "일본 기상청 정보 열기"));
      button.removeAttribute("aria-pressed");
      button.classList.add("is-official-link");
      button.setAttribute("aria-label", officialWeatherLabel);
      button.title = officialWeatherLabel;
      if (indicator) indicator.textContent = "↗";
      continue;
    }
    button.classList.remove("is-official-link");
    button.setAttribute("aria-pressed", String(isVisible));
    button.setAttribute("aria-label", i18n.t(isVisible ? "mapLayerHide" : "mapLayerShow", { label }));
    button.title = button.getAttribute("aria-label");
    if (indicator) indicator.textContent = i18n.t(isVisible ? "mapLayerVisibleShort" : "mapLayerHiddenShort");
  }
  const weatherLegend = document.querySelector("#weather-map-legend");
  if (weatherLegend) {
    const hasWeatherArea = currentData?.features?.some((feature) =>
      feature.properties?.category === "weather" &&
      ["Polygon", "MultiPolygon"].includes(feature.geometry?.type)
    );
    weatherLegend.hidden = !visibility.weather || !hasWeatherArea;
  }
}

function setMapLayerVisibility(category, isVisible) {
  visibility[category] = isVisible;
  for (const layerId of layerIdsByCategory[category] ?? []) {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", isVisible ? "visible" : "none");
  }
  const checkbox = document.querySelector(`#layer-control input[value="${category}"]`);
  if (checkbox) checkbox.checked = isVisible;
  syncSharedNetworkLayers();
  syncSemanticMarkerVisibility();
  syncTransportModeMarkerVisibility();
  updateMapLayerToolbar();
  if (currentData) renderEventList(currentData, visibility);
  if (!isVisible && activeFeature?.properties?.category === category && activePopup) activePopup.remove();
}

function focusJourneyMap({ duration = 0 } = {}) {
  const mobile = globalThis.matchMedia?.("(max-width: 620px)").matches;
  const mapBox = document.querySelector("#map")?.getBoundingClientRect();
  const toolbar = document.querySelector("#map-layer-toolbar")?.getBoundingClientRect();
  const weatherLegend = document.querySelector("#weather-map-legend:not([hidden])")?.getBoundingClientRect();
  const decision = document.querySelector("#map-decision")?.getBoundingClientRect();
  const topOverlay = mapBox
    ? Math.max(toolbar?.bottom ?? mapBox.top, weatherLegend?.bottom ?? mapBox.top) - mapBox.top + 56
    : 112;
  const bottomOverlay = mapBox && decision
    ? Math.min(
      mapBox.bottom - decision.top + 16,
      Math.max(92, mapBox.height - topOverlay - 88)
    )
    : 104;
  map.fitBounds(
    ACCESS_NETWORK_BOUNDS,
    {
      padding: mobile
        ? { top: Math.max(96, topOverlay), right: 52, bottom: Math.max(92, bottomOverlay), left: 52 }
        : { top: 96, right: 74, bottom: 250, left: 74 },
      maxZoom: mobile ? 9.25 : 9.7,
      duration
    }
  );
}

function syncMapOverlayGeometry() {
  const stage = document.querySelector(".map-stage");
  const decision = document.querySelector("#map-decision");
  if (!stage || !decision) return;
  const stageBox = stage.getBoundingClientRect();
  const toolbar = document.querySelector("#map-layer-toolbar")?.getBoundingClientRect();
  const weatherLegend = document.querySelector("#weather-map-legend:not([hidden])")?.getBoundingClientRect();
  const topOverlayBottom = Math.max(
    toolbar?.bottom ?? stageBox.top,
    weatherLegend?.bottom ?? stageBox.top
  );
  stage.style.setProperty("--map-decision-height", `${Math.ceil(decision.getBoundingClientRect().height)}px`);
  stage.style.setProperty("--map-overlay-top", `${Math.ceil(topOverlayBottom - stageBox.top)}px`);
}

function categoryLabel(category) {
  return i18n.t(`category.${category}`);
}

function statusLabel(status) {
  const visibleStatus = userFacingTransportStatus(status);
  return visibleStatus ? i18n.t(`status.${visibleStatus}`) : "";
}

function externalLink(label, href, className = "") {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.className = className;
  const text = document.createElement("span");
  text.textContent = label;
  const arrow = document.createElement("span");
  arrow.className = "link-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  anchor.append(text, arrow);
  return anchor;
}

function isCurrentDataStale(data) {
  if (data?.metadata?.sample_data === true) return false;
  if (data?.metadata?.mode === "historical_replay") return false;
  const generatedAt = Date.parse(data?.metadata?.generated_at);
  return !Number.isFinite(generatedAt) || Date.now() - generatedAt > 30 * 60 * 1000;
}

function isSampleData(data = currentData) {
  return data?.metadata?.sample_data === true;
}

function decisionFeatures(data) {
  const rank = { suspended: 3, warning: 2, normal: 1 };
  return data?.features
    ?.filter((feature) => !NON_DECISION_SOURCE_SCOPES.has(feature.properties?.source_scope))
    .filter((feature) => feature.properties?.category !== "facility")
    .sort((left, right) => (rank[right.properties?.status] ?? 0) - (rank[left.properties?.status] ?? 0)
      || Date.parse(right.properties?.updated_at) - Date.parse(left.properties?.updated_at)) ?? [];
}

function mapDisplayData(data) {
  if (!data || !isCurrentDataStale(data)) return data;
  return {
    ...data,
    features: data.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties, stale_snapshot: true }
    }))
  };
}

function currentItemStatus(item) {
  if (!currentData) return "unknown";
  if (isCurrentDataStale(currentData)) return "unknown";
  if (isSampleData()) {
    const matching = currentData.features.filter((feature) => feature.properties.status_item_id === item.id);
    if (matching.some((feature) => feature.properties.status === "suspended")) return "suspended";
    if (matching.some((feature) => feature.properties.status === "warning")) return "warning";
    if (matching.some((feature) => feature.properties.status === "normal")) return "normal";
    return "unknown";
  }
  if (currentData.metadata?.mode === "historical_replay") {
    const matching = currentData.features.filter((feature) => feature.properties.status_item_id === item.id);
    if (matching.some((feature) => feature.properties.status === "suspended")) return "suspended";
    if (matching.some((feature) => feature.properties.status === "warning")) return "warning";
    return "unknown";
  }
  if (currentData.metadata?.mode === "demo") return "demo";
  if (item.evidence !== "reported") return "unknown";
  const feature = currentData.features.find((candidate) => candidate.properties.id === item.featureId);
  return feature?.properties?.status ?? "unknown";
}

function currentItemObservation(item) {
  if (isSampleData()) {
    const sample = currentData.features.find((feature) => feature.properties.status_item_id === item.id);
    if (!sample) return undefined;
    return {
      id: item.observationId,
      source: localizedProperty(sample.properties, "source", i18n.locale),
      observed_at: sample.properties.updated_at,
      decision_status: sample.properties.status,
      source_url: sample.properties.source_url,
      result: "synthetic_sample"
    };
  }
  const observations = currentData?.metadata?.source_observations;
  if (!Array.isArray(observations)) return undefined;
  return observations.find((observation) => observation.id === item.observationId);
}

function currentStatusText(status) {
  const visibleStatus = userFacingTransportStatus(status);
  if (!visibleStatus) return "";
  return i18n.t({
    normal: "serviceNormal",
    warning: "serviceWarning",
    suspended: "serviceSuspended"
  }[visibleStatus]);
}

function observationSignal(status) {
  return currentStatusText(status);
}

function renderPriorityIncident() {
  const container = document.querySelector("#priority-incident");
  const heading = document.querySelector(".priority-panel .panel-heading");
  const setHeadingState = (state) => {
    heading.classList.remove("is-critical", "is-warning", "is-suspended", "is-normal", "is-neutral");
    heading.classList.add(`is-${state}`);
  };
  container.replaceChildren();
  if (!currentData) {
    setHeadingState("neutral");
    const loading = document.createElement("p");
    loading.className = "priority-placeholder";
    loading.textContent = i18n.t("currentStatusLoading");
    container.append(loading);
    return;
  }

  if (!IS_NARITA && !isSampleData()) {
    setHeadingState("neutral");
    const article = document.createElement("article");
    article.className = "priority-card is-neutral";
    const meta = document.createElement("span");
    meta.className = "priority-meta";
    meta.textContent = configText(localizedAirportLabel("移動前に確認", "Check before travelling", "出行前确认", "出行前確認", "이동 전 확인"));
    const title = document.createElement("h3");
    title.textContent = configText(localizedAirportLabel("利用する交通手段の公式情報を確認", "Check the official update for your transport", "确认所用交通工具的官方信息", "確認所用交通工具的官方資訊", "이용할 교통수단의 공식 안내 확인"));
    const description = document.createElement("p");
    description.textContent = configText(localizedAirportLabel("空港バス・鉄道接続・道路を比較できます。", "Compare airport buses, rail connections and roads.", "可比较机场巴士、铁路接驳和道路。", "可比較機場巴士、鐵路接駁和道路。", "공항버스·철도 연결·도로를 비교할 수 있습니다."));
    article.append(meta, title, description, externalLink(i18n.t("openLiveSource"), officialLink("access")));
    container.append(article);
    return;
  }

  const rank = { suspended: 3, warning: 2, normal: 1 };
  const incidents = currentData.features
    .filter((feature) => !NON_DECISION_SOURCE_SCOPES.has(feature.properties.source_scope))
    .filter((feature) => feature.properties.category !== "facility")
    .sort((a, b) => (rank[b.properties.status] ?? 0) - (rank[a.properties.status] ?? 0)
      || Date.parse(b.properties.updated_at) - Date.parse(a.properties.updated_at));
  const feature = incidents.find((candidate) => ["suspended", "warning"].includes(candidate.properties.status));

  const article = document.createElement("article");
  if (!feature) {
    setHeadingState("normal");
    article.className = "priority-card is-normal";
    const meta = document.createElement("span");
    meta.className = "priority-meta";
    meta.textContent = i18n.t("priorityNoCriticalLabel");
    const title = document.createElement("h3");
    title.textContent = i18n.t("priorityNoCriticalTitle");
    const description = document.createElement("p");
    description.textContent = i18n.t("currentLiveSummary");
    const link = externalLink(i18n.t("airportAlerts"), officialLink("alerts"));
    article.append(meta, title, description, link);
    container.append(article);
    return;
  }

  setHeadingState(feature.properties.status);
  article.className = `priority-card is-${feature.properties.status}`;
  const meta = document.createElement("span");
  meta.className = "priority-meta";
  meta.textContent = `${categoryLabel(feature.properties.category)} · ${statusLabel(feature.properties.status)}`;
  const title = document.createElement("h3");
  title.textContent = localizedProperty(feature.properties, "title", i18n.locale);
  const description = document.createElement("p");
  description.textContent = localizedProperty(feature.properties, "description", i18n.locale) ?? i18n.t("defaultDescription");
  const observed = document.createElement("time");
  observed.dateTime = feature.properties.updated_at;
  observed.textContent = i18n.t("updatedAt", { date: i18n.formatDate(feature.properties.updated_at) });
  const source = externalLink(i18n.t(isSampleData() ? "openSampleInformation" : "openLiveSource"), feature.properties.source_url);
  article.append(meta, title);
  if (currentData?.metadata?.mode === "historical_replay" || feature.properties.category === "weather") article.append(description);
  article.append(observed, source);
  container.append(article);
}

function mapModeStatus(category) {
  if (!currentData) return "unknown";
  return worstStatus(decisionFeatures(currentData), category);
}

function matchesRailOperator(feature, item) {
  const properties = feature?.properties ?? {};
  return properties.category === "railway" && (
    properties.status_item_id === item.statusItemId
    || String(properties.id ?? "").includes(item.idPattern)
    || String(properties.operator ?? "").includes(item.label)
    || String(properties.line_name ?? "").includes(item.label)
    || String(properties.title ?? "").includes(item.label)
  );
}

function railOperatorFeature(item, { includeReference = false } = {}) {
  return currentData?.features
    ?.filter((feature) => matchesRailOperator(feature, item))
    .filter((feature) => includeReference || !NON_DECISION_SOURCE_SCOPES.has(feature.properties?.source_scope))
    .sort((left, right) => Date.parse(right.properties?.updated_at) - Date.parse(left.properties?.updated_at))[0];
}

function transportItemsForMode(mode) {
  return CURRENT_STATUS_GROUPS.find((group) => group.id === mode)?.items ?? [];
}

function transportItemFeature(item, { includeReference = true } = {}) {
  return currentData?.features
    ?.filter((feature) => {
      const properties = feature.properties ?? {};
      return properties.status_item_id === item.id
        || properties.id === item.featureId
        || String(properties.id ?? "").includes(item.id);
    })
    .filter((feature) => includeReference || !NON_DECISION_SOURCE_SCOPES.has(feature.properties?.source_scope))
    .sort((left, right) => Date.parse(right.properties?.updated_at) - Date.parse(left.properties?.updated_at))[0];
}

function transportItemLabel(item) {
  return itemText(item, "label", "labelKey");
}

function transportModeCategory(mode) {
  return { rail: "railway", bus: "bus", road: "road" }[mode];
}

function transportStatusText(status, mode) {
  if (!status) return "";
  return mode === "rail" ? railStatusLabel(status) : statusLabel(status);
}

function featureStatusText(feature, mode) {
  if (!feature) return transportStatusText(null, mode);
  const explicit = localizedProperty(feature.properties, "status_label", i18n.locale);
  if (explicit) return explicit;
  const title = localizedProperty(feature.properties, "title", i18n.locale) ?? "";
  const titleState = title.split(/\s+[—–-]\s+/).at(-1);
  if (titleState && titleState !== title) return titleState;
  return transportStatusText(transportFeatureStatus(feature), mode);
}

function worstFeatureForCategory(category) {
  const rank = { suspended: 3, warning: 2, normal: 1 };
  return decisionFeatures(currentData)
    .filter((feature) => feature.properties?.category === category)
    .sort((left, right) => (rank[transportFeatureStatus(right)] ?? 0) - (rank[transportFeatureStatus(left)] ?? 0))[0];
}

function transportFallbackAlternative(mode) {
  return i18n.t({
    rail: "transportAlternativeRail",
    bus: "transportAlternativeBus",
    road: "transportAlternativeRoad"
  }[mode]);
}

function railStatusLabel(status) {
  const visibleStatus = userFacingTransportStatus(status);
  if (!visibleStatus) return "";
  return i18n.t({
    normal: "railStatusNormal",
    warning: "railStatusWarning",
    suspended: "railStatusSuspended"
  }[visibleStatus]);
}

function tickerEntries() {
  if (!IS_NARITA) {
    return airport.overview.slice(0, 4).map((item) => {
      const category = { rail: "railway", bus: "bus", road: "road", airport: "facility" }[item.id];
      const feature = worstFeatureForCategory(category);
      const status = isSampleData() ? transportFeatureStatus(feature) ?? "official" : "official";
      return {
        id: item.id,
        label: configText(item.label),
        status,
        statusText: isSampleData() ? featureStatusText(feature, item.id) : "↗",
        href: officialLink(item.linkKey)
      };
    }).sort((left, right) => ({ suspended: 3, warning: 2, normal: 1, official: 0 }[right.status] ?? 0) - ({ suspended: 3, warning: 2, normal: 1, official: 0 }[left.status] ?? 0));
  }
  const entries = [];
  for (const item of RAIL_OPERATOR_ITEMS) {
    const feature = railOperatorFeature(item);
    const status = userFacingTransportStatus(feature?.properties?.status);
    if (!status) continue;
    entries.push({
      id: item.id,
      operatorId: item.id,
      label: i18n.t(item.labelKey),
      status,
      statusText: featureStatusText(feature, "rail")
    });
  }

  for (const item of [
    { id: "bus", category: "bus", labelKey: "mapLayerBus" },
    { id: "road", category: "road", labelKey: "mapLayerRoad" },
    { id: "weather", category: "weather", labelKey: "mapLayerWeather" }
  ]) {
    const feature = worstFeatureForCategory(item.category);
    const status = transportFeatureStatus(feature);
    if (!status) continue;
    entries.push({ id: item.id, label: i18n.t(item.labelKey), status, statusText: featureStatusText(feature, item.id) });
  }
  return entries.sort((left, right) => ({ suspended: 3, warning: 2, normal: 1 }[right.status] ?? 0) - ({ suspended: 3, warning: 2, normal: 1 }[left.status] ?? 0));
}

function tickerSequence(entries, duplicate = false) {
  const sequence = document.createElement("span");
  sequence.className = "status-ticker-sequence";
  if (duplicate) {
    sequence.setAttribute("aria-hidden", "true");
    sequence.inert = true;
  }

  for (const entry of entries) {
    const separator = document.createElement("span");
    separator.className = "status-ticker-separator";
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "｜";
    const item = entry.operatorId
      ? document.createElement("button")
      : entry.href
        ? document.createElement("a")
        : document.createElement("span");
    item.className = `status-ticker-item is-${entry.status}`;
    if (entry.operatorId) {
      item.type = "button";
      item.dataset.railOperator = entry.operatorId;
      item.setAttribute("aria-label", `${entry.label} · ${entry.statusText} · ${i18n.t("mapDecisionDetails")}`);
      item.addEventListener("click", () => {
        if (!journeyMode) {
          focusJourneyChooser();
          return;
        }
        selectedRailOperatorId = entry.operatorId;
        selectedMapTransportMode = "rail";
        selectedMapServiceByMode.rail = RAIL_OPERATOR_ITEMS.find((operator) => operator.id === entry.operatorId)?.statusItemId ?? selectedMapServiceByMode.rail;
        mapDecisionExpanded = true;
        renderJourneyUi();
        renderMapDecision();
        scrollJourneyDetails();
      });
    } else if (entry.href) {
      item.href = entry.href;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
      item.setAttribute("aria-label", `${entry.label} · ${i18n.t("mapDecisionOfficial")}`);
    }
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("strong");
    label.textContent = entry.label;
    const state = document.createElement("span");
    state.textContent = entry.statusText;
    item.append(dot, label, state);
    sequence.append(separator, item);
  }
  return sequence;
}

function tickerContext() {
  const observedAt = currentData?.metadata?.observed_at ?? currentData?.metadata?.generated_at;
  if (SAMPLE_DEMO || isSampleData()) {
    return {
      observedAt,
      text: observedAt
        ? `${i18n.t("sampleScenarioLabel")} ${formatTickerTime(observedAt)}`
        : i18n.t("sampleDataShort")
    };
  }
  if (!IS_NARITA) return { observedAt: "", text: i18n.t("officialInformationShort") };
  if (!observedAt) return { observedAt: "", text: i18n.t("dataChecking") };
  return {
    observedAt,
    text: i18n.t(isCurrentDataStale(currentData) ? "recordedAt" : "dataAsOf", { date: i18n.formatDate(observedAt) })
  };
}

function formatTickerTime(value) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "--";
  return `${part("month")}/${part("day")} ${part("hour")}:${part("minute")}`;
}

function renderStatusTicker() {
  const track = document.querySelector("#status-ticker-track");
  const ticker = document.querySelector("#status-ticker");
  const context = document.querySelector("#status-ticker-context");
  const contextValue = tickerContext();
  context.dateTime = contextValue.observedAt ?? "";
  context.textContent = contextValue.text;
  if (SAMPLE_DEMO || isSampleData()) {
    context.dataset.sampleTimestamp = "";
    document.documentElement.dataset.sampleGeneratedAt = contextValue.observedAt ?? "";
  } else {
    delete context.dataset.sampleTimestamp;
    delete document.documentElement.dataset.sampleGeneratedAt;
  }
  const entries = tickerEntries();
  if (entries.length === 0) {
    entries.push({
      id: "ticker-fallback",
      label: currentData ? i18n.t("regionalTickerPrompt") : i18n.t("dataChecking"),
      status: "official",
      statusText: ""
    });
  }
  track.replaceChildren(tickerSequence(entries), tickerSequence(entries, true));
  track.classList.toggle("is-paused", tickerPaused);
  ticker.classList.toggle("is-stale-snapshot", isCurrentDataStale(currentData));
  const toggle = document.querySelector("#status-ticker-toggle");
  toggle.setAttribute("aria-pressed", String(tickerPaused));
  toggle.querySelector("[aria-hidden]").textContent = tickerPaused ? "▶" : "Ⅱ";
  toggle.querySelector(".visually-hidden").textContent = i18n.t(tickerPaused ? "statusTickerPlay" : "statusTickerPause");
}

function renderMapWeather() {
  const badge = document.querySelector(".weather-badge");
  if (!badge) return;
  const title = document.querySelector("#map-weather-title");
  const detail = document.querySelector("#map-weather-detail");
  const stale = isCurrentDataStale(currentData);
  const feature = !currentData
    ? undefined
    : decisionFeatures(currentData).find((candidate) => candidate.properties?.category === "weather");
  const visibleStatus = userFacingTransportStatus(feature?.properties?.status);
  badge.className = `weather-badge is-${visibleStatus ?? "official"}${stale ? " is-stale-snapshot" : ""}`;
  badge.href = feature?.properties?.source_url
    ?? officialLink("weather")
    ?? officialLink("disaster")
    ?? officialLink("chibaDisaster");
  title.textContent = i18n.t("weatherBadgeTitle");
  detail.textContent = feature
    ? localizedProperty(feature.properties, "title", i18n.locale)
    : "";
}

function transportFeatureStatus(feature) {
  if (!feature || NON_DECISION_SOURCE_SCOPES.has(feature.properties?.source_scope)) return null;
  return userFacingTransportStatus(feature.properties?.status);
}

function renderMapTransportDetails() {
  const mode = selectedMapTransportMode;
  const items = transportItemsForMode(mode);
  const rank = { suspended: 3, warning: 2, normal: 1 };
  const itemResults = items.map((item) => {
    const feature = transportItemFeature(item);
    return { item, feature, visibleStatus: transportFeatureStatus(feature) };
  });
  const selectedId = selectedMapServiceByMode[mode];
  const selected = itemResults.find(({ item }) => item.id === selectedId)
    ?? itemResults.slice().sort((left, right) => (rank[right.visibleStatus] ?? 0) - (rank[left.visibleStatus] ?? 0))[0];
  if (selected) selectedMapServiceByMode[mode] = selected.item.id;

  for (const button of document.querySelectorAll("[data-map-transport]")) {
    const active = button.dataset.mapTransport === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }

  const panel = document.querySelector("#map-transport-panel");
  const selectionTitle = document.querySelector("#map-transport-selection-title");
  const selectionKey = { rail: "transportRailServices", bus: "transportBusServices", road: "transportRoadServices" }[mode];
  const activeTabId = `map-transport-tab-${mode}`;
  document.querySelector("#transport-detail-disclosure").dataset.transportTheme = mode;
  panel.dataset.transportTheme = mode;
  panel.setAttribute("aria-labelledby", activeTabId);
  selectionTitle.textContent = i18n.t(selectionKey);

  for (const [tabMode, countId] of [["rail", "#map-rail-count"], ["bus", "#map-bus-count"], ["road", "#map-road-count"]]) {
    const count = transportItemsForMode(tabMode)
      .map((item) => transportFeatureStatus(transportItemFeature(item)))
      .filter(Boolean).length;
    document.querySelector(countId).textContent = String(count);
  }

  const container = document.querySelector("#map-transport-services");
  container.setAttribute("aria-label", i18n.t(selectionKey));
  container.replaceChildren();
  for (const result of itemResults) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-transport-service${result.visibleStatus ? ` is-${result.visibleStatus}` : ""}`;
    button.dataset.serviceId = result.item.id;
    button.setAttribute("aria-pressed", String(result.item.id === selected?.item.id));
    button.setAttribute("aria-controls", "map-service-detail");
    const label = document.createElement("strong");
    label.textContent = transportItemLabel(result.item);
    const state = document.createElement("span");
    state.textContent = featureStatusText(result.feature, mode);
    if (!result.visibleStatus) state.hidden = true;
    button.append(label, state);
    button.addEventListener("click", () => {
      selectedMapServiceByMode[mode] = result.item.id;
      if (mode === "rail") {
        selectedRailOperatorId = RAIL_OPERATOR_ITEMS.find((operator) => operator.statusItemId === result.item.id)?.id ?? selectedRailOperatorId;
      }
      renderMapDecision();
    });
    container.append(button);
  }

  const detailCard = document.querySelector("#map-service-detail");
  if (!selected) {
    detailCard.hidden = true;
    return;
  }
  detailCard.hidden = false;
  detailCard.className = `map-service-detail${selected.visibleStatus ? ` is-${selected.visibleStatus}` : ""}`;
  const properties = selected.feature?.properties ?? {};
  const categoryKey = mode === "rail" && airport.railAccess !== "direct"
    ? "transportConnection"
    : { rail: "transportRail", bus: "transportBus", road: "mapLayerRoad" }[mode];
  document.querySelector("#map-service-category").textContent = i18n.t(categoryKey);
  document.querySelector("#map-service-title").textContent = transportItemLabel(selected.item);
  const statusNode = document.querySelector("#map-service-status");
  statusNode.textContent = featureStatusText(selected.feature, mode);
  statusNode.hidden = !selected.visibleStatus;
  document.querySelector("#map-service-section").textContent = localizedProperty(properties, "section", i18n.locale)
    ?? itemText(selected.item, "detail", "detailKey");
  document.querySelector("#map-service-direction").textContent = localizedProperty(properties, "direction", i18n.locale)
    ?? i18n.t("transportDirectionBoth");
  document.querySelector("#map-service-reason").textContent = localizedProperty(properties, "reason", i18n.locale)
    ?? localizedProperty(properties, "description", i18n.locale)
    ?? itemText(selected.item, "detail", "detailKey");
  const observedAt = properties.updated_at ?? currentData?.metadata?.generated_at;
  const updatedLabel = document.querySelector('[data-i18n="transportDetailUpdated"]');
  updatedLabel.textContent = i18n.t(isSampleData() ? "sampleTimeLabel" : "transportDetailUpdated");
  document.querySelector("#map-service-updated").textContent = observedAt
    ? isSampleData() ? i18n.formatSampleDate(observedAt) : i18n.formatDate(observedAt)
    : "—";
  const journeyAlternativeField = journeyMode === "arrival"
    ? "alternative_from_airport"
    : journeyMode === "departure"
      ? "alternative_to_airport"
      : "alternative";
  document.querySelector("#map-service-alternative").textContent = localizedProperty(properties, journeyAlternativeField, i18n.locale)
    ?? localizedProperty(properties, "alternative", i18n.locale)
    ?? transportFallbackAlternative(mode);
  const link = document.querySelector("#map-decision-link");
  link.href = officialLink(selected.item.linkKey) ?? properties.source_url ?? officialLink("access");
  link.textContent = i18n.t("mapDecisionOfficialSecondary");
}

function renderMapDecision() {
  const panel = document.querySelector("#map-decision");
  const body = document.querySelector("#map-decision-body");
  const toggle = document.querySelector("#map-decision-toggle");
  const kicker = document.querySelector("#map-decision-kicker");
  const time = document.querySelector("#map-decision-time");
  const title = document.querySelector("#map-decision-title");
  const detail = document.querySelector("#map-decision-detail");

  panel.className = "map-decision";
  const hasTransportJourney = journeyMode === "arrival" || journeyMode === "departure";
  mapDecisionExpanded = hasTransportJourney && mapDecisionExpanded;
  panel.classList.toggle("is-awaiting-journey", !journeyMode);
  panel.classList.toggle("is-stranded-journey", journeyMode === "stranded");
  panel.classList.toggle("is-expanded", mapDecisionExpanded);
  panel.closest(".map-stage")?.classList.remove("has-expanded-decision");
  globalThis.requestAnimationFrame?.(() => {
    syncMapOverlayGeometry();
    layoutSemanticMapMarkers();
  });
  toggle.setAttribute("aria-expanded", String(mapDecisionExpanded));
  toggle.hidden = !hasTransportJourney;
  body.hidden = !hasTransportJourney || !mapDecisionExpanded;
  const transportDisclosure = document.querySelector("#transport-detail-disclosure");
  transportDisclosure.open = hasTransportJourney && mapDecisionExpanded;
  document.querySelector("#map-decision-toggle-label").textContent = i18n.t(mapDecisionExpanded ? "mapDecisionClose" : "mapDecisionOpen");

  if (!hasTransportJourney) return;

  if (!currentData) {
    panel.classList.add("is-loading");
    kicker.textContent = i18n.t("dataChecking");
    time.textContent = "—";
    title.textContent = i18n.t("currentStatusLoading");
    detail.textContent = i18n.t("mapDecisionLoadingDetail");
    return;
  }

  const decisionStatuses = decisionFeatures(currentData)
    .filter((feature) => ["railway", "bus", "road"].includes(feature.properties?.category))
    .map((feature) => userFacingTransportStatus(feature.properties?.status))
    .filter(Boolean);
  const suspendedCount = decisionStatuses.filter((status) => status === "suspended").length;
  const warningCount = decisionStatuses.filter((status) => status === "warning").length;
  const normalCount = decisionStatuses.filter((status) => status === "normal").length;
  const summaryStatus = suspendedCount > 0 ? "suspended" : warningCount > 0 ? "warning" : "normal";
  panel.classList.add(`is-${summaryStatus}`);
  panel.classList.toggle("is-stale-snapshot", isCurrentDataStale(currentData));
  const sample = isSampleData();
  kicker.textContent = i18n.t(sample ? "sampleDataShort" : "transportStatusSummary");
  const observedAt = currentData.metadata?.observed_at ?? currentData.metadata?.generated_at;
  time.dateTime = observedAt ?? "";
  time.textContent = observedAt
    ? sample
      ? i18n.t("sampleTickerTime", { date: i18n.formatSampleDate(observedAt) })
      : i18n.formatDate(observedAt)
    : "—";
  title.textContent = sample
    ? suspendedCount || warningCount
      ? i18n.t("mapDecisionSampleIssues", { suspended: suspendedCount, warning: warningCount })
      : i18n.t("mapDecisionSampleNormal")
    : suspendedCount || warningCount
      ? i18n.t("mapDecisionIssueCounts", { suspended: suspendedCount, warning: warningCount })
      : i18n.t("mapDecisionNormalCount", { normal: normalCount });
  detail.textContent = i18n.t("mapDecisionTapHint");
  renderMapTransportDetails();
}

function renderEmergencyBanner() {
  const banner = document.querySelector("#emergency-banner");
  if (!currentData || isSampleData() || (currentData.metadata?.mode !== "historical_replay" && isCurrentDataStale(currentData))) {
    banner.hidden = true;
    return;
  }
  const feature = currentData?.features
    ?.filter((candidate) => !NON_DECISION_SOURCE_SCOPES.has(candidate.properties.source_scope))
    .filter((candidate) => candidate.properties.category !== "facility" && candidate.properties.status === "suspended")
    .sort((a, b) => Date.parse(b.properties.updated_at) - Date.parse(a.properties.updated_at))[0];
  banner.hidden = !feature;
  if (!feature) return;

  const title = localizedProperty(feature.properties, "title", i18n.locale);
  document.querySelector("#emergency-banner-title").textContent = `${i18n.t("emergencyPrefix")} ${title}`;
  const time = document.querySelector("#emergency-banner-time");
  time.dateTime = feature.properties.updated_at;
  time.textContent = i18n.t("updatedAt", { date: i18n.formatDate(feature.properties.updated_at) });
  document.querySelector("#emergency-banner-description").textContent =
    localizedProperty(feature.properties, "description", i18n.locale) ?? i18n.t("defaultDescription");
  const action = document.querySelector("#emergency-banner-action");
  action.href = feature.properties.source_url;
  action.textContent = i18n.t("openLiveSource");
}

function operationalPhase() {
  if (currentData?.metadata?.mode !== "historical_replay") {
    return { id: "live", labelKey: "phaseLiveLabel", actionKey: "phaseLiveAction" };
  }
  if ((currentData.metadata.replay_index ?? 0) < 4) {
    return { id: "approaching", labelKey: "phaseApproachingLabel", actionKey: "phaseApproachingAction" };
  }
  const changeKind = currentData.metadata.replay_snapshot?.change_kind;
  if (["downgraded", "easing"].includes(changeKind)) {
    return { id: "recovery", labelKey: "phaseRecoveryLabel", actionKey: "phaseRecoveryAction" };
  }
  if (["danger", "emergency", "escalating", "re_escalating", "peak", "transport_disruption"].includes(changeKind)) {
    return { id: "response", labelKey: "phaseResponseLabel", actionKey: "phaseResponseAction" };
  }
  return { id: "approaching", labelKey: "phaseApproachingLabel", actionKey: "phaseApproachingAction" };
}

function renderOperationalPhase() {
  const context = document.querySelector("#phase-context");
  if (isSampleData()) {
    context.dataset.phase = "live";
    document.querySelector("#phase-label").textContent = i18n.t("sampleDataShort");
    document.querySelector("#phase-action").textContent = i18n.t("samplePhaseAction");
    document.querySelector("#coverage-summary").textContent = "";
    context.setAttribute("aria-label", `${i18n.t("sampleDataShort")}. ${i18n.t("samplePhaseAction")}`);
    return;
  }
  if (!IS_NARITA && !isSampleData()) {
    const label = configText(localizedAirportLabel("現在", "Now", "当前", "目前", "현재"));
    const action = configText(localizedAirportLabel("公式交通情報を確認", "Check official transport updates", "查看官方交通信息", "查看官方交通資訊", "공식 교통 안내 확인"));
    context.dataset.phase = "live";
    document.querySelector("#phase-label").textContent = label;
    document.querySelector("#phase-action").textContent = action;
    document.querySelector("#coverage-summary").textContent = "";
    context.setAttribute("aria-label", `${label}. ${action}`);
    return;
  }
  const phase = operationalPhase();
  const allItems = CURRENT_STATUS_GROUPS.flatMap((group) => group.items);
  const statuses = TRANSPORT_OVERVIEW_ITEMS.map((overview) => overview.itemIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => currentItemStatus(item)));
  const verified = statuses.filter((values) => values.some((status) => userFacingTransportStatus(status))).length;
  const coverage = i18n.t("coverageSummary", { verified });
  const label = i18n.t(phase.labelKey);
  const action = i18n.t(phase.actionKey);
  context.dataset.phase = phase.id;
  document.querySelector("#phase-label").textContent = label;
  document.querySelector("#phase-action").textContent = action;
  document.querySelector("#coverage-summary").textContent = coverage;
  context.setAttribute("aria-label", `${label}. ${action}. ${coverage}`);
}

function renderTrustPanel() {
  const label = document.querySelector("#trust-state-label");
  const detail = document.querySelector("#trust-state-detail");
  const links = document.querySelector("#source-trust-links");
  const stale = currentData ? isCurrentDataStale(currentData) : false;
  const mode = currentData?.metadata?.mode;
  const observations = currentData?.metadata?.source_observations ?? [];
  const hasPartialConfidence = observations.some((observation) => observation.confidence !== "high" || observation.result === "source_unavailable");
  label.textContent = i18n.t(!currentData
    ? "trustChecking"
    : isSampleData()
      ? "trustDemo"
    : !IS_NARITA
      ? "trustPartial"
    : mode === "historical_replay"
      ? "historyTrust"
      : stale
        ? "trustStale"
        : ["demo", "mixed"].includes(mode)
          ? "trustDemo"
          : hasPartialConfidence
            ? "trustPartial"
            : "trustVerified");
  detail.textContent = i18n.t(isSampleData()
    ? "sampleTrustDetail"
    : !IS_NARITA
    ? "trustPartialDetail"
    : mode === "historical_replay"
    ? "historyTrustDetail"
    : stale
      ? "trustStaleDetail"
      : hasPartialConfidence
        ? "trustPartialDetail"
        : "trustDetail");

  links.replaceChildren();
  for (const [labelKey, linkKey] of TRUST_LINKS) {
    links.append(externalLink(IS_NARITA ? i18n.t(labelKey) : configText(labelKey), officialLink(linkKey), "source-chip"));
  }
}

function renderCurrentSituation() {
  const feedLabel = document.querySelector("#current-feed-label");
  const feedTime = document.querySelector("#current-feed-time");
  const summary = document.querySelector("#current-summary p");
  const groups = document.querySelector("#current-status-groups");
  const mode = currentData?.metadata?.mode;
  const stale = currentData ? isCurrentDataStale(currentData) : false;

  feedLabel.className = "";
  if (!currentData) {
    feedLabel.textContent = i18n.t("currentStatusLoading");
    feedTime.textContent = "—";
    summary.textContent = i18n.t("currentStatusLoading");
  } else if (!IS_NARITA && !isSampleData()) {
    feedLabel.textContent = configText(localizedAirportLabel("公式交通情報", "Official transport information", "官方交通信息", "官方交通資訊", "공식 교통 정보"));
    feedLabel.classList.add("is-live");
    feedTime.removeAttribute("datetime");
    feedTime.textContent = "";
    summary.textContent = configText(localizedAirportLabel("利用する交通手段を選び、公式情報を確認してください。", "Choose your transport and open its official update.", "选择交通方式并查看官方信息。", "選擇交通方式並查看官方資訊。", "교통수단을 선택하고 공식 안내를 확인하세요."));
  } else {
    feedLabel.textContent = i18n.t(isSampleData()
      ? "demoStatusLabel"
      : mode === "historical_replay"
      ? "historyFeedLabel"
      : stale
        ? "staleStatusLabel"
        : mode === "demo"
          ? "demoStatusLabel"
          : "liveStatusLabel");
    feedLabel.classList.add(isSampleData() ? "is-demo" : mode === "historical_replay" ? "is-history" : stale ? "is-stale" : mode === "demo" ? "is-demo" : "is-live");
    feedTime.dateTime = currentData.metadata.generated_at;
    feedTime.textContent = i18n.t("currentUpdated", {
      date: isSampleData()
        ? i18n.formatSampleDate(currentData.metadata.generated_at)
        : i18n.formatDate(currentData.metadata.generated_at)
    });
    const verifiedStatuses = currentData.features
      .filter((feature) => feature.properties.source_scope !== "source_reachability_only")
      .map((feature) => feature.properties.status);
    const hasAttention = verifiedStatuses.includes("suspended") || verifiedStatuses.includes("warning");
    summary.textContent = isSampleData()
      ? i18n.t("sampleCurrentSummary")
      : mode === "historical_replay"
      ? sampleSnapshotText(currentData.metadata.replay_snapshot, "summary", i18n.locale)
      : i18n.t(stale
        ? "currentStaleSummary"
        : mode === "demo"
          ? "currentDemoSummary"
          : hasAttention
            ? "currentAttentionSummary"
            : "currentLiveSummary");
  }

  groups.replaceChildren();
  for (const group of CURRENT_STATUS_GROUPS) {
    const section = document.createElement("section");
    section.className = `status-group status-group-${group.id}`;
    const heading = document.createElement("h3");
    heading.textContent = itemText(group, "title", "titleKey");
    const list = document.createElement("div");
    list.className = "status-service-list";

    for (const item of group.items) {
      const status = currentItemStatus(item);
      const visibleStatus = userFacingTransportStatus(status);
      const observation = currentItemObservation(item);
      const article = document.createElement("article");
      article.className = `status-service ${visibleStatus ? `is-${visibleStatus}` : "is-reference"}`;
      const copy = document.createElement("div");
      copy.className = "service-copy";
      const headingRow = document.createElement("div");
      headingRow.className = "service-heading-row";
      const title = document.createElement("strong");
      title.textContent = itemText(item, "label", "labelKey");
      headingRow.append(title);
      const detail = document.createElement("span");
      detail.className = "service-scope";
      detail.textContent = itemText(item, "detail", "detailKey");
      copy.append(headingRow);
      if (visibleStatus && (observation?.source || observation?.observed_at)) {
        const observationLine = document.createElement("span");
        observationLine.className = "service-observation";
        if (observation?.source) observationLine.textContent = observation.source;
        if (observation?.observed_at) {
          const observed = document.createElement("time");
          observed.dateTime = observation.observed_at;
          observed.textContent = i18n.t("observationTime", { date: i18n.formatDate(observation.observed_at) });
          if (observationLine.textContent) observationLine.append(" · ");
          observationLine.append(observed);
        }
        copy.append(observationLine);
      }
      copy.append(detail);
      const link = externalLink(
        i18n.t("openLiveSource"),
        officialLink(item.linkKey),
        `status-source-link${visibleStatus ? "" : " is-primary"}`
      );
      if (visibleStatus) {
        const signal = document.createElement("span");
        signal.className = "service-signal";
        signal.textContent = observationSignal(visibleStatus);
        article.append(signal, copy, link);
      } else {
        article.append(copy, link);
      }
      list.append(article);
    }
    section.append(heading, list);
    groups.append(section);
  }
  renderTransportOverview();
}

function renderTransportOverview() {
  const container = document.querySelector("#transport-overview");
  const allItems = CURRENT_STATUS_GROUPS.flatMap((group) => group.items);
  const rank = { suspended: 3, warning: 2, normal: 1, demo: 0, unknown: -1 };
  container.replaceChildren();

  for (const overview of TRANSPORT_OVERVIEW_ITEMS) {
    const members = overview.itemIds.map((id) => allItems.find((item) => item.id === id)).filter(Boolean);
    const observations = members.map((item) => ({ item, status: currentItemStatus(item), observation: currentItemObservation(item) }));
    const status = observations.reduce((worst, entry) => rank[entry.status] > rank[worst] ? entry.status : worst, "unknown");
    const visibleStatus = userFacingTransportStatus(status);
    const visibleObservations = observations.filter((entry) => userFacingTransportStatus(entry.status));
    const row = document.createElement("article");
    row.className = `transport-overview-row ${visibleStatus ? `is-${visibleStatus}` : "is-reference"} tone-${overview.tone}`;
    row.dataset.transport = overview.id;
    const focusButton = document.createElement("button");
    focusButton.type = "button";
    focusButton.className = "transport-overview-focus";
    const overviewLabel = itemText(overview, "label", "labelKey");
    focusButton.setAttribute("aria-label", i18n.t("showOnMap", { title: overviewLabel }));
    const icon = document.createElement("span");
    icon.className = "transport-overview-icon";
    icon.textContent = overview.icon;
    const copy = document.createElement("span");
    copy.className = "transport-overview-copy";
    const title = document.createElement("strong");
    title.textContent = overviewLabel;
    const detail = document.createElement("small");
    detail.textContent = visibleObservations.length > 0
      ? visibleObservations.map(({ item, status: itemStatus }) => `${itemText(item, "label", "labelKey")}: ${currentStatusText(itemStatus)}`).join(" / ")
      : itemText(members[0], "detail", "detailKey") || overviewLabel;
    copy.append(title, detail);
    focusButton.append(icon, copy);
    if (visibleStatus) {
      const signal = document.createElement("span");
      signal.className = "transport-overview-signal";
      const signalText = document.createElement("span");
      signalText.textContent = currentStatusText(visibleStatus);
      const mapLabel = document.createElement("small");
      mapLabel.textContent = i18n.t("mapFocusLabel");
      signal.append(signalText, mapLabel);
      focusButton.append(signal);
    }
    focusButton.addEventListener("click", () => focusTransportNetwork(overview));
    const sourceLink = externalLink(
      i18n.t("openLiveSource"),
      officialLink(overview.linkKey),
      `transport-overview-source${visibleStatus ? "" : " is-prominent"}`
    );
    row.append(focusButton, sourceLink);
    container.append(row);
  }
  container.closest(".transport-panel").hidden = container.childElementCount === 0;
}

function focusTransportNetwork(overview) {
  const routes = networkGuideData?.features?.filter((feature) =>
    feature.properties?.kind === "route" && overview.routeIds.includes(feature.properties.route_id)
  ) ?? [];
  const coordinates = routes.flatMap((feature) => feature.geometry?.coordinates ?? []);
  if (coordinates.length > 0) {
    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);
    map.fitBounds([
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)]
    ], { padding: 70, maxZoom: 10.8, duration: 650 });
  } else {
    map.easeTo({ center: NARITA_AIRPORT, zoom: 10.8, duration: 650 });
  }
  if (globalThis.matchMedia?.("(max-width: 620px)").matches) {
    document.querySelector(".map-command").scrollIntoView({
      block: "start",
      behavior: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }
}

function renderMunicipalSupport() {
  const container = document.querySelector("#municipal-support-links");
  container.replaceChildren();
  for (const resource of MUNICIPAL_SUPPORT) {
    const anchor = externalLink(itemText(resource, "title", "titleKey"), officialLink(resource.linkKey), "municipal-support-card");
    const copy = anchor.querySelector("span:first-child");
    const detail = document.createElement("small");
    detail.textContent = itemText(resource, "detail", "detailKey");
    copy.append(detail);
    container.append(anchor);
  }
}

function renderJourneyUi() {
  const board = document.querySelector("#travel-decision");
  const transportDisclosure = document.querySelector("#transport-detail-disclosure");
  const waitDisclosure = document.querySelector("#airport-wait-disclosure");
  const emergencyDisclosure = document.querySelector("#emergency-support-disclosure");
  const supportedModes = ["arrival", "departure", "stranded"];
  const hasSelection = supportedModes.includes(journeyMode);

  const hasTransportJourney = journeyMode === "arrival" || journeyMode === "departure";
  board.hidden = !hasSelection;
  transportDisclosure.hidden = !hasTransportJourney;
  waitDisclosure.hidden = journeyMode !== "stranded";
  emergencyDisclosure.hidden = journeyMode !== "stranded";

  for (const button of document.querySelectorAll("[data-journey]")) {
    const isActive = button.dataset.journey === journeyMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  }

  for (const button of document.querySelectorAll("[data-map-journey]")) {
    const isActive = button.dataset.mapJourney === journeyMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  if (!hasSelection) return;

  if (hasTransportJourney) {
    transportDisclosure.open = mapDecisionExpanded;
    waitDisclosure.open = false;
    emergencyDisclosure.open = false;
  }

  if (journeyMode === "stranded") {
    transportDisclosure.open = false;
    waitDisclosure.open = true;
    emergencyDisclosure.open = true;
  }
}

function updateMapControlLabels() {
  const controls = [
    [".maplibregl-ctrl-zoom-in", "zoomIn"],
    [".maplibregl-ctrl-zoom-out", "zoomOut"],
    [".maplibregl-ctrl-compass", "resetBearing"],
    [".maplibregl-ctrl-attrib-button", "attribution"]
  ];
  for (const [selector, key] of controls) {
    const control = document.querySelector(selector);
    if (!control) continue;
    const text = i18n.t(key);
    control.setAttribute("aria-label", text);
    control.setAttribute("title", text);
  }
}

function waitForStyle() {
  if (map.isStyleLoaded()) return Promise.resolve();
  return new Promise((resolve) => map.once("style.load", resolve));
}

async function fetchCurrentData() {
  if (SAMPLE_DEMO) {
    const response = await fetch(`${SAMPLE_DATA_ROOT}/latest.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Sample GeoJSON HTTP ${response.status}`);
    const data = await response.json();
    if (data?.type !== "FeatureCollection" || data?.metadata?.sample_data !== true || !Array.isArray(data.features) || data.features.length === 0) {
      throw new Error(i18n.t("invalidData"));
    }
    return data;
  }
  if (!IS_NARITA) return regionalCurrentData(airport);
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`GeoJSON HTTP ${response.status}`);
  const data = await response.json();
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features) || data.features.length === 0) {
    throw new Error(i18n.t("invalidData"));
  }
  return data;
}

async function fetchHistoryIndex() {
  if (!HISTORY_AVAILABLE) throw new Error("History is not configured for this airport");
  const response = await fetch(SAMPLE_DEMO ? `${SAMPLE_DATA_ROOT}/history-index.json` : HISTORY_INDEX_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Historical index HTTP ${response.status}`);
  return validateHistoryIndex(await response.json());
}

async function fetchHistoryReplay(range) {
  const fileEntries = filesForHistoryRange(historyIndex, range);
  const bundles = await Promise.all(fileEntries.map(async (entry) => {
    const response = await fetch(SAMPLE_DEMO
      ? `${SAMPLE_DATA_ROOT}/${entry.path}`
      : `${import.meta.env.BASE_URL}data/${entry.path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Historical replay HTTP ${response.status}`);
    const document = await response.json();
    const format = entry.format ?? document.schema_version;
    if (format !== "sample-history/1") throw new Error("Only fictional sample history is supported");
    validateSampleHistoryForBrowser(document);
    return { format, document };
  }));
  return createHistoryTimeline(bundles);
}

async function fetchNetworkGuide() {
  if (!IS_NARITA) return airport.network;
  const response = await fetch(NETWORK_DATA_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Network GeoJSON HTTP ${response.status}`);
  const data = await response.json();
  const lines = data?.features?.filter((feature) => feature?.geometry?.type === "LineString") ?? [];
  const routeIds = new Set(lines.map((feature) => feature?.properties?.route_id));
  if (data?.type !== "FeatureCollection" || lines.length < 100 || routeIds.size < 9) {
    throw new Error(i18n.t("invalidData"));
  }
  return data;
}

function networkEventForRoute(routeId, data) {
  const patterns = {
    "jr-sobu": ["総武本線"],
    "jr-narita": ["JR成田線", "成田線"],
    "keisei-main": ["京成本線", "京成線全線", "京成線"],
    hokuso: ["北総線"],
    "sky-access": ["成田スカイアクセス", "京成成田空港線", "京成線全線"],
    e51: ["東関東自動車道", "東関東道", "E51"],
    c4: ["首都圏中央連絡自動車道", "圏央道", "C4"],
    "route-51": ["国道51号"],
    "route-295": ["国道295号"]
  };
  const candidates = data?.features?.filter((feature) => {
    if (NON_DECISION_SOURCE_SCOPES.has(feature.properties?.source_scope)) return false;
    if (Array.isArray(feature.properties?.affected_route_ids)) {
      return feature.properties.affected_route_ids.includes(routeId);
    }
    const text = [
      feature.properties?.id,
      feature.properties?.status_item_id,
      feature.properties?.title,
      feature.properties?.line_name,
      feature.properties?.section
    ].filter(Boolean).join(" ");
    return patterns[routeId]?.some((pattern) => text.includes(pattern));
  }) ?? [];
  const rank = { suspended: 3, warning: 2, normal: 1, unknown: 0 };
  return candidates.sort((left, right) => (rank[right.properties.status] ?? 0) - (rank[left.properties.status] ?? 0))[0];
}

function decorateNetworkGuide(networkData, eventData) {
  const decisionData = mapDisplayData(eventData);
  const stale = isCurrentDataStale(eventData);
  return {
    ...networkData,
    features: networkData.features.map((feature) => {
      const event = networkEventForRoute(feature.properties.route_id, decisionData);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          alert_status: event?.properties?.status ?? "unknown",
          alert_is_stale: Boolean(event && stale),
          alert_event_id: event?.properties?.id ?? null
        }
      };
    })
  };
}

function addDataLayers(data) {
  map.addSource("disaster-events", { type: "geojson", data });

  map.addLayer({
    id: "weather-areas",
    type: "fill",
    source: "disaster-events",
    filter: ["all", ["==", ["get", "category"], "weather"], ["==", ["geometry-type"], "Polygon"]],
    paint: {
      "fill-color": ["case", ["boolean", ["get", "stale_snapshot"], false], "#71808a", ["match", ["get", "status"], "suspended", "#d63b3b", "warning", "#f2a900", "normal", "#147d73", "#71808a"]],
      "fill-opacity": ["case", ["boolean", ["get", "stale_snapshot"], false], 0.12, 0.26],
      "fill-outline-color": ["case", ["boolean", ["get", "stale_snapshot"], false], "#596873", ["match", ["get", "status"], "suspended", "#9d1f2b", "warning", "#a96e00", "#0d5a53"]]
    }
  });

  map.addLayer({
    id: "weather-area-outlines",
    type: "line",
    source: "disaster-events",
    filter: ["all", ["==", ["get", "category"], "weather"], ["==", ["geometry-type"], "Polygon"]],
    paint: {
      "line-color": ["case", ["boolean", ["get", "stale_snapshot"], false], "#71808a", ["match", ["get", "status"], "suspended", "#9d1f2b", "warning", "#a96e00", "normal", "#0d5a53", "#52616d"]],
      "line-width": ["interpolate", ["linear"], ["zoom"], 7, 2, 11, 4],
      "line-opacity": 0.9,
      "line-dasharray": [3, 2]
    }
  });

  map.addLayer({
    id: "road-points",
    type: "circle",
    source: "disaster-events",
    filter: ["all", ["==", ["get", "category"], "road"], ["==", ["geometry-type"], "Point"]],
    paint: {
      "circle-color": ["case", ["boolean", ["get", "stale_snapshot"], false], "#71808a", ["match", ["get", "status"], "suspended", "#d63b3b", "warning", "#f2a900", "normal", "#147d73", "#71808a"]],
      "circle-radius": 11,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
      "circle-opacity": ["case", ["boolean", ["get", "stale_snapshot"], false], 0.58, 0.96]
    }
  });

  for (const category of ["railway", "weather", "facility"]) {
    map.addLayer({
      id: `${category}-points`,
      type: "circle",
      source: "disaster-events",
      filter: ["all", ["==", ["get", "category"], category], ["==", ["geometry-type"], "Point"]],
      paint: {
        "circle-color": ["case", ["boolean", ["get", "stale_snapshot"], false], "#71808a", ["match", ["get", "status"], "suspended", "#d63b3b", "warning", "#f2a900", "normal", "#147d73", "#71808a"]],
        "circle-radius": category === "facility" ? 9 : category === "railway" ? 8 : 11,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
        "circle-opacity": ["case", ["boolean", ["get", "stale_snapshot"], false], 0.58, 0.94]
      }
    });
  }

  const networkCategories = new Set(
    networkGuideData?.features
      ?.filter((feature) => feature.properties?.kind === "route" && feature.geometry?.type === "LineString")
      .map((feature) => feature.properties?.category) ?? []
  );
  for (const [category, visual] of Object.entries(MAP_TRANSPORT_VISUALS)) {
    if (networkCategories.has(category)) continue;
    const lineFilter = ["all", ["==", ["get", "category"], category], ["==", ["geometry-type"], "LineString"]];
    map.addLayer({
      id: `event-${visual.layerName}-casing`,
      type: "line",
      source: "disaster-events",
      filter: lineFilter,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, category === "road" ? 6.5 : 5.5, 12, category === "road" ? 10 : 8.5],
        "line-opacity": 0.94
      }
    });
    const linePaint = {
      "line-color": ["case",
        ["boolean", ["get", "stale_snapshot"], false], "#71808a",
        ["match", ["get", "status"], "suspended", "#d63b3b", "warning", "#f2a900", "normal", "#16824b", "#71808a"]
      ],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, category === "road" ? 3.8 : 2.6, 12, category === "road" ? 6.2 : 4.6],
      "line-opacity": ["case", ["boolean", ["get", "stale_snapshot"], false], 0.58, 0.94]
    };
    if (category === "bus") linePaint["line-dasharray"] = [2.2, 1.4];
    if (category === "railway") {
      linePaint["line-gap-width"] = ["interpolate", ["linear"], ["zoom"], 8, 0.7, 12, 1.35];
      linePaint["line-width"] = ["interpolate", ["linear"], ["zoom"], 8, 1.15, 12, 1.75];
    }
    map.addLayer({
      id: `event-${visual.layerName}-lines`,
      type: "line",
      source: "disaster-events",
      filter: lineFilter,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: linePaint
    });
  }
}

function addNetworkGuideLayers(data) {
  if (map.getSource("access-network-guide")) return;
  map.addSource("access-network-guide", { type: "geojson", data });
  map.addLayer({
    id: "access-bus-casing",
    type: "line",
    source: "access-network-guide",
    filter: ["all", ["==", ["get", "kind"], "route"], ["==", ["get", "category"], "bus"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 4.4, 12, 8],
      "line-opacity": 0.94
    }
  });
  map.addLayer({
    id: "access-bus-lines",
    type: "line",
    source: "access-network-guide",
    filter: ["all", ["==", ["get", "kind"], "route"], ["==", ["get", "category"], "bus"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#8b5d16",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2.2, 12, 4.5],
      "line-opacity": 0.78,
      "line-dasharray": [2.2, 1.4]
    }
  });
  map.addLayer({
    id: "access-road-casing",
    type: "line",
    source: "access-network-guide",
    filter: ["all", ["==", ["get", "kind"], "route"], ["==", ["get", "category"], "road"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3.8, 12, 7.5],
      "line-opacity": 0.9
    }
  });
  map.addLayer({
    id: "access-road-lines",
    type: "line",
    source: "access-network-guide",
    filter: ["all", ["==", ["get", "kind"], "route"], ["==", ["get", "category"], "road"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#677783",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.7, 12, 3.8],
      "line-opacity": 0.62
    }
  });
  map.addLayer({
    id: "access-rail-casing",
    type: "line",
    source: "access-network-guide",
    filter: ["all", ["==", ["get", "kind"], "route"], ["==", ["get", "category"], "railway"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3.6, 12, 7],
      "line-opacity": 0.94
    }
  });
  map.addLayer({
    id: "access-rail-lines",
    type: "line",
    source: "access-network-guide",
    filter: ["all", ["==", ["get", "kind"], "route"], ["==", ["get", "category"], "railway"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": RAIL_ROUTE_COLOR,
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.1, 12, 1.8],
      "line-gap-width": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 12, 1.4],
      "line-opacity": 0.72
    }
  });
  for (const [layerName, category] of [["road", "road"], ["rail", "railway"], ["bus", "bus"]]) {
    const categoryPaint = category === "bus"
      ? { "line-dasharray": [2.2, 1.4] }
      : category === "railway"
        ? { "line-gap-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 12, 1.55] }
        : {};
    map.addLayer({
      id: `access-${layerName}-alerts`,
      type: "line",
      source: "access-network-guide",
      filter: ["all",
        ["==", ["get", "kind"], "route"],
        ["==", ["get", "category"], category],
        ["in", ["get", "alert_status"], ["literal", category === "railway" ? ["warning", "suspended"] : ["normal", "warning", "suspended"]]]
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["match", ["get", "alert_status"], "suspended", "#d63b3b", "warning", "#f2a900", "normal", "#16824b", "#71808a"],
        "line-width": ["interpolate", ["linear"], ["zoom"],
          8, ["match", ["get", "alert_status"], "normal", 3.2, 4.2],
          12, ["match", ["get", "alert_status"], "normal", 5.8, 7.8]
        ],
        "line-opacity": ["case", ["boolean", ["get", "alert_is_stale"], false], 0.58, 0.96],
        ...categoryPaint
      }
    });
  }
  map.addLayer({
    id: "access-network-labels",
    type: "symbol",
    source: "access-network-guide",
    filter: ["==", ["get", "kind"], "label"],
    layout: {
      "text-field": ["get", "route_label"],
      "text-font": ["NotoSansCJKjp-Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 8, 9, 11, 11],
      "text-offset": [0, 1.65],
      "text-allow-overlap": false
    },
    paint: {
      "text-color": ["case", ["==", ["get", "category"], "railway"], RAIL_ROUTE_COLOR, "#263f51"],
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.8,
      "text-opacity": 0.92
    }
  });
  map.addLayer({
    id: "access-network-alert-symbols",
    type: "symbol",
    source: "access-network-guide",
    filter: ["all", ["==", ["get", "kind"], "label"], ["in", ["get", "alert_status"], ["literal", ["warning", "suspended"]]]],
    layout: {
      "text-field": ["match", ["get", "alert_status"], "suspended", "×", "!"],
      "text-font": ["NotoSansCJKjp-Regular"],
      "text-size": 19,
      "text-allow-overlap": true,
      "text-offset": [0, -1.35]
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": ["match", ["get", "alert_status"], "suspended", "#bd050d", "#e69b00"],
      "text-halo-width": 8,
      "text-halo-blur": 0.5,
      "text-opacity": ["case", ["boolean", ["get", "alert_is_stale"], false], 0.62, 1]
    }
  });
  map.addLayer({
    id: "access-network-alert-patterns",
    type: "symbol",
    source: "access-network-guide",
    filter: [
      "all",
      ["==", ["get", "kind"], "route"],
      ["in", ["get", "alert_status"], ["literal", ["warning", "suspended"]]]
    ],
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 72,
      "text-field": ["match", ["get", "alert_status"], "suspended", "×", "!"],
      "text-font": ["NotoSansCJKjp-Regular"],
      "text-size": 12,
      "text-allow-overlap": false,
      "text-keep-upright": true
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": ["match", ["get", "alert_status"], "suspended", "#9d1f2b", "#927200"],
      "text-halo-width": 5,
      "text-opacity": ["case", ["boolean", ["get", "alert_is_stale"], false], 0.68, 1]
    }
  });
}

function popupNode(properties) {
  const article = document.createElement("article");
  article.className = "event-popup";
  const meta = document.createElement("p");
  meta.className = `event-meta status-${properties.status}`;
  const visibleStatusLabel = statusLabel(properties.status);
  meta.textContent = [categoryLabel(properties.category), visibleStatusLabel].filter(Boolean).join(" / ");
  const title = document.createElement("h3");
  title.textContent = localizedProperty(properties, "title", i18n.locale);
  const description = document.createElement("p");
  description.textContent = localizedProperty(properties, "description", i18n.locale) ?? i18n.t("defaultDescription");
  const time = document.createElement("time");
  time.dateTime = properties.updated_at;
  time.textContent = i18n.t("updatedAt", { date: i18n.formatDate(properties.updated_at) });
  const source = document.createElement("a");
  source.href = properties.source_url;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = i18n.t("checkSource", { source: localizedProperty(properties, "source", i18n.locale) });
  article.append(meta, title, description);
  if (usesJapaneseFallback(properties, i18n.locale)) {
    const fallback = document.createElement("p");
    fallback.className = "translation-note";
    fallback.textContent = i18n.t("officialJapaneseFallback");
    article.append(fallback);
  }
  article.append(time, source);
  return article;
}

function featureCenter(feature) {
  const coordinates = feature.geometry.type === "Point"
    ? [feature.geometry.coordinates]
    : feature.geometry.type === "LineString"
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.flat();
  const longitudes = coordinates.map((pair) => pair[0]);
  const latitudes = coordinates.map((pair) => pair[1]);
  return [(Math.min(...longitudes) + Math.max(...longitudes)) / 2, (Math.min(...latitudes) + Math.max(...latitudes)) / 2];
}

function openFeature(feature) {
  if (activePopup) activePopup.remove();
  activeFeature = feature;
  const maxWidth = window.matchMedia("(max-width: 560px)").matches ? "210px" : "340px";
  const popup = new Popup({ closeButton: true, maxWidth, offset: 12 })
    .setLngLat(featureCenter(feature))
    .setDOMContent(popupNode(feature.properties))
    .addTo(map);
  activePopup = popup;
  popup.on("close", () => {
    if (activePopup === popup) {
      activePopup = undefined;
      activeFeature = undefined;
    }
  });
}

function bindMapInteractions() {
  const routeInteractionLayers = [
    "access-rail-lines",
    "access-bus-lines",
    "access-road-lines",
    "access-rail-alerts",
    "access-bus-alerts",
    "access-road-alerts",
    "event-rail-lines",
    "event-bus-lines",
    "event-road-lines"
  ].filter((layerId) => map.getLayer(layerId));
  map.on("click", (event) => {
    const route = map.queryRenderedFeatures(event.point, { layers: routeInteractionLayers })
      .find((feature) => feature.geometry?.type === "LineString" && MAP_TRANSPORT_VISUALS[feature.properties?.category]);
    if (route) animateTransportRoute(route);
  });
  for (const layerId of routeInteractionLayers) {
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
  }

  const interactiveLayers = [
    "access-rail-alerts",
    "access-bus-alerts",
    "access-road-alerts",
    "access-network-alert-symbols",
    "access-network-alert-patterns",
    "weather-areas",
    "weather-area-outlines",
    "road-points",
    "weather-points",
    "facility-points"
  ];
  for (const layerId of interactiveLayers) {
    map.on("click", layerId, (event) => {
      const selectedId = event.features?.[0]?.properties?.alert_event_id ?? event.features?.[0]?.properties?.id;
      const selected = currentData?.features.find((feature) => feature.properties.id === selectedId);
      if (selected) openFeature(selected);
    });
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
  }
}

function renderEventList(data, visibility) {
  const list = document.querySelector("#event-list");
  const count = document.querySelector("#event-count");
  const visibleFeatures = data.features
    .filter((feature) => visibility[feature.properties.category])
    .filter((feature) => !NON_DECISION_SOURCE_SCOPES.has(feature.properties.source_scope));
  list.replaceChildren();
  count.textContent = String(visibleFeatures.length);

  for (const feature of visibleFeatures) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `event-card status-${feature.properties.status}`;
    const localizedTitle = localizedProperty(feature.properties, "title", i18n.locale);
    button.setAttribute("aria-label", i18n.t("showOnMap", { title: localizedTitle }));

    const stripe = document.createElement("span");
    stripe.className = "event-stripe";
    stripe.style.setProperty("--status-color", statusColors[feature.properties.status]);
    stripe.setAttribute("aria-hidden", "true");
    const body = document.createElement("span");
    body.className = "event-card-body";
    const meta = document.createElement("span");
    meta.className = "event-card-meta";
    meta.textContent = `${categoryLabel(feature.properties.category)} · ${statusLabel(feature.properties.status)}`;
    const title = document.createElement("strong");
    title.textContent = localizedTitle;
    const source = document.createElement("span");
    source.className = "event-card-source";
    source.textContent = localizedProperty(feature.properties, "source", i18n.locale);
    body.append(meta, title, source);
    if (usesJapaneseFallback(feature.properties, i18n.locale)) {
      const fallback = document.createElement("span");
      fallback.className = "event-card-origin";
      fallback.textContent = "JA / OFFICIAL";
      body.append(fallback);
    }
    button.append(stripe, body);
    button.addEventListener("click", () => {
      map.easeTo({ center: featureCenter(feature), zoom: Math.max(map.getZoom(), 11.5), duration: 650 });
      openFeature(feature);
    });
    list.append(button);
  }
}

function isHistoryMode() {
  return viewMode === "history";
}

function replayIntervalMs() {
  const speed = Number(document.querySelector("#replay-speed").value) || 1;
  return 3000 / speed;
}

function stopReplay({ render = true } = {}) {
  if (replayTimer) globalThis.clearInterval(replayTimer);
  replayTimer = undefined;
  if (render) renderReplayUi();
}

function updateViewUrl() {
  const url = new URL(globalThis.location.href);
  if (viewMode === "history") {
    url.searchParams.set("view", "history");
    if (historyRange) {
      url.searchParams.set("start", historyRangeToUrlValue(historyRange.start));
      url.searchParams.set("end", historyRangeToUrlValue(historyRange.end));
    }
  } else {
    url.searchParams.delete("view");
    url.searchParams.delete("start");
    url.searchParams.delete("end");
  }
  globalThis.history.replaceState(null, "", url);
}

function currentReplayPosition() {
  const position = replayWindowIndices.indexOf(replayIndex);
  return position >= 0 ? position : 0;
}

function configureReplayWindow(replay, range) {
  replayWindowIndices = replayIndicesForRange(replay, range);
  replayIndex = replayWindowIndices[0];
}

function historyErrorKey(error) {
  return error instanceof HistoryRangeError ? error.code : "historyRangeUnavailable";
}

async function loadHistoryRange(range) {
  historyReplayLoading = true;
  historyReplayError = undefined;
  renderReplayUi();
  try {
    const replay = await fetchHistoryReplay(range);
    configureReplayWindow(replay, range);
    historyReplay = replay;
    historyRange = range;
    historyReplayLoading = false;
    updateViewUrl();
    replaceDisplayedData(buildHistoryCollection(historyReplay, replayIndex, i18n));
    return true;
  } catch (error) {
    historyReplayLoading = false;
    historyReplayError = error;
    renderReplayUi();
    return false;
  }
}

function replaceDisplayedData(data) {
  currentData = data;
  if (activePopup) activePopup.remove();
  activePopup = undefined;
  activeFeature = undefined;
  const source = map.getSource("disaster-events");
  if (source) source.setData(mapDisplayData(currentData));
  const networkSource = map.getSource("access-network-guide");
  if (networkSource && networkGuideData) networkSource.setData(decorateNetworkGuide(networkGuideData, currentData));
  if (map.getSource("disaster-events") && networkGuideData) addTransportModeMarkers();
  renderLocalizedUi();
}

function applyReplayIndex(index) {
  if (!historyReplay) return;
  replayIndex = Math.max(0, Math.min(index, historyReplay.snapshots.length - 1));
  const replayData = buildHistoryCollection(historyReplay, replayIndex, i18n);
  replaceDisplayedData(replayData);
}

function startReplay() {
  if (!isHistoryMode() || !historyReplay || replayWindowIndices.length === 0) return;
  let position = currentReplayPosition();
  if (position >= replayWindowIndices.length - 1) {
    position = 0;
    applyReplayIndex(replayWindowIndices[position]);
  }
  stopReplay({ render: false });
  replayTimer = globalThis.setInterval(() => {
    position = currentReplayPosition();
    if (position >= replayWindowIndices.length - 1) {
      stopReplay();
      return;
    }
    applyReplayIndex(replayWindowIndices[position + 1]);
  }, replayIntervalMs());
  renderReplayUi();
}

async function setViewMode(nextMode, { autoplay = true } = {}) {
  stopReplay({ render: false });
  viewMode = nextMode === "history" ? "history" : "live";
  if (viewMode === "history") {
    if (!historyIndex) {
      historyReplayError ??= new HistoryRangeError("historyRangeUnavailable");
      renderReplayUi();
      return;
    }
    const requestedRange = historyRange ?? defaultHistoryRange(historyIndex);
    const loaded = historyReplay && replayWindowIndices.length > 0
      ? true
      : await loadHistoryRange(requestedRange);
    if (!loaded) return;
    replaceDisplayedData(buildHistoryCollection(historyReplay, replayIndex, i18n));
    updateViewUrl();
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (autoplay && !reducedMotion) startReplay();
  } else if (liveData) {
    updateViewUrl();
    replaceDisplayedData(liveData);
  }
}

async function openSampleDisruptionScenario() {
  await setViewMode("history", { autoplay: false });
  if (!historyReplay || replayWindowIndices.length === 0) return;
  const isDisruption = (index) => historyReplay.snapshots[index]?.collection?.features?.some(
    (feature) => ["warning", "suspended"].includes(feature.properties?.status)
  );
  const disruptionIndex = replayWindowIndices.find((index) => {
    const snapshot = historyReplay.snapshots[index];
    return snapshot?.observed_at?.slice(8, 10) === "10" && isDisruption(index);
  }) ?? replayWindowIndices.find(isDisruption);
  if (Number.isInteger(disruptionIndex)) {
    applyReplayIndex(disruptionIndex);
    prioritizeTransportDetails();
  }
}

async function openSampleNormalScenario() {
  await setViewMode("live", { autoplay: false });
  prioritizeTransportDetails();
}

function prioritizeTransportDetails() {
  const rank = { suspended: 3, warning: 2, normal: 1 };
  selectedMapTransportMode = ["rail", "bus", "road"].sort(
    (left, right) => (rank[mapModeStatus(transportModeCategory(right))] ?? 0) - (rank[mapModeStatus(transportModeCategory(left))] ?? 0)
  )[0] ?? "rail";
  selectedMapServiceByMode[selectedMapTransportMode] = null;
  renderMapDecision();
}

function setHistoryRangeError(error) {
  const node = document.querySelector("#history-range-error");
  if (!error) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  node.textContent = i18n.t(historyErrorKey(error));
  node.hidden = false;
}

function openHistoryRangeDialog() {
  if (!historyIndex) return;
  const dialog = document.querySelector("#history-range-dialog");
  const startInput = document.querySelector("#history-start-input");
  const endInput = document.querySelector("#history-end-input");
  const bounds = historyBounds(historyIndex);
  const selected = historyRange ?? defaultHistoryRange(historyIndex);
  const minimum = formatJstDateTimeInput(bounds.earliest);
  const maximum = formatJstDateTimeInput(bounds.latest);
  startInput.min = minimum;
  startInput.max = maximum;
  endInput.min = minimum;
  endInput.max = maximum;
  startInput.value = formatJstDateTimeInput(selected.start);
  endInput.value = formatJstDateTimeInput(selected.end);
  setHistoryRangeError();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeHistoryRangeDialog() {
  const dialog = document.querySelector("#history-range-dialog");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function renderReplayUi() {
  const isHistory = isHistoryMode();
  document.documentElement.dataset.viewMode = isHistory ? "history" : "live";
  const liveButton = document.querySelector("#live-mode-button");
  const historyButton = document.querySelector("#history-mode-button");
  const modeTabs = document.querySelector("#replay-mode-tabs");
  const sampleScenarioControl = document.querySelector("#sample-scenario-control");
  const sampleScenarioSelect = document.querySelector("#sample-scenario-select");
  const playButton = document.querySelector("#replay-play");
  const playLabel = document.querySelector("#replay-play-label");
  const range = document.querySelector("#replay-range");
  const speed = document.querySelector("#replay-speed");
  const output = document.querySelector("#replay-time");
  const step = document.querySelector("#replay-step");
  const headline = document.querySelector("#replay-headline");
  const summary = document.querySelector("#replay-summary");
  const safetyNote = document.querySelector("#replay-safety-note");
  const sourceLink = document.querySelector("#replay-source-link");
  const dock = document.querySelector("#replay-dock");
  const rangeLabel = document.querySelector("#history-range-label");
  const rangeButton = document.querySelector("#history-range-button");
  const rangeStartLabel = document.querySelector("#replay-range-start-label");
  const rangeEndLabel = document.querySelector("#replay-range-end-label");

  liveButton.textContent = i18n.t(SAMPLE_DEMO ? "sampleNormalMode" : "liveMode");
  historyButton.textContent = i18n.t(SAMPLE_DEMO ? "sampleDisruptionMode" : "historyMode");
  modeTabs.hidden = SAMPLE_DEMO;
  sampleScenarioControl.hidden = !SAMPLE_DEMO;
  sampleScenarioSelect.value = isHistory ? "history" : "live";

  liveButton.classList.toggle("is-active", !isHistory);
  liveButton.setAttribute("aria-selected", String(!isHistory));
  liveButton.tabIndex = isHistory ? -1 : 0;
  historyButton.classList.toggle("is-active", isHistory);
  historyButton.setAttribute("aria-selected", String(isHistory));
  historyButton.tabIndex = isHistory ? 0 : -1;
  historyButton.disabled = !historyIndex;
  historyButton.hidden = !HISTORY_AVAILABLE;
  historyButton.title = !historyIndex ? i18n.t("historyRangeUnavailable") : "";
  dock.dataset.mode = isHistory ? "history" : "live";

  if (historyRange) {
    const startText = i18n.formatDate(historyRange.start);
    const endText = i18n.formatDate(historyRange.end);
    rangeLabel.textContent = i18n.t("historyRangeSummary", { start: startText, end: endText });
    rangeStartLabel.textContent = startText;
    rangeEndLabel.textContent = `${endText} JST`;
  } else {
    rangeLabel.textContent = "—";
    rangeStartLabel.textContent = "—";
    rangeEndLabel.textContent = "—";
  }
  rangeButton.disabled = historyReplayLoading || !historyIndex;

  document.querySelector(".topbar h1").textContent = i18n.t(SAMPLE_DEMO ? "dashboardTitle" : isHistory ? "historyDashboardTitle" : "dashboardTitle");
  document.querySelector(".brand-subtitle").textContent = i18n.t(SAMPLE_DEMO ? "dashboardSubtitle" : isHistory ? "historyDashboardSubtitle" : "dashboardSubtitle");
  document.querySelector("#priority-heading").textContent = i18n.t(isHistory ? "historyPriorityHeading" : "priorityHeading");
  document.querySelector("#current-situation-heading").textContent = i18n.t(isHistory ? "historyTransportSituationHeading" : "transportSituationHeading");
  document.querySelector(".transport-panel .panel-intro").textContent = i18n.t(isSampleData()
    ? "sampleCurrentSummary"
    : isHistory
      ? "historyCurrentSituationIntro"
    : "currentSituationIntro");
  const coverageNote = document.querySelector(".coverage-note");
  if (coverageNote) {
    coverageNote.textContent = i18n.t(isSampleData()
      ? "sampleTrustDetail"
      : isHistory
        ? "historyCoverageNote"
      : "currentCoverageNote");
  }

  const historyReady = isHistory && Boolean(historyReplay) && replayWindowIndices.length > 0 && !historyReplayLoading;
  playButton.disabled = !historyReady;
  range.disabled = !historyReady;
  speed.disabled = !historyReady;
  safetyNote.hidden = !isHistory;
  sourceLink.hidden = !historyReady;

  if (!isHistory) {
    output.value = liveData ? i18n.formatDate(liveData.metadata.generated_at) : "—";
    output.textContent = output.value;
    step.textContent = "";
    range.min = "0";
    range.max = "0";
    range.value = "0";
    headline.textContent = i18n.t("liveReplayHeadline");
    summary.textContent = !historyIndex ? i18n.t("historyRangeUnavailable") : i18n.t("liveReplaySummary");
    document.querySelector("#replay-readback").setAttribute("aria-label", `${headline.textContent}. ${summary.textContent}`);
    playLabel.textContent = i18n.t("playReplay");
    document.querySelector(".replay-play-icon").textContent = "▶";
    return;
  }

  if (!historyReady) {
    output.value = "—";
    output.textContent = "—";
    step.textContent = "";
    range.min = "0";
    range.max = "0";
    range.value = "0";
    headline.textContent = i18n.t(historyReplayLoading ? "historyRangeLoading" : historyErrorKey(historyReplayError));
    summary.textContent = i18n.t(historyReplayLoading ? "historyRangeLoadingDetail" : "historyRangeTryAnother");
    safetyNote.textContent = i18n.t(SAMPLE_DEMO ? "sampleHistorySafetyNotice" : "historySafetyNotice");
    document.querySelector("#replay-readback").setAttribute("aria-label", `${headline.textContent}. ${summary.textContent}`);
    playLabel.textContent = i18n.t("playReplay");
    document.querySelector(".replay-play-icon").textContent = "▶";
    return;
  }

  const snapshot = historyReplay.snapshots[replayIndex];
  const position = currentReplayPosition();
  output.value = i18n.formatDate(snapshot.observed_at);
  output.textContent = output.value;
  step.textContent = `${position + 1} / ${replayWindowIndices.length}`;
  range.min = "0";
  range.max = String(replayWindowIndices.length - 1);
  range.value = String(position);
  range.setAttribute("aria-valuetext", output.value);
  headline.textContent = sampleSnapshotText(snapshot, "headline", i18n.locale);
  summary.textContent = sampleSnapshotText(snapshot, "summary", i18n.locale);
  safetyNote.textContent = i18n.t(SAMPLE_DEMO ? "sampleHistorySafetyNotice" : "historySafetyNotice");
  document.querySelector("#replay-readback").setAttribute("aria-label", `${output.value}. ${headline.textContent}. ${safetyNote.textContent}`);
  sourceLink.href = snapshot.source_url;
  sourceLink.textContent = i18n.t("openSampleInformation");
  const atEnd = position >= replayWindowIndices.length - 1;
  playLabel.textContent = i18n.t(replayTimer ? "pauseReplay" : atEnd ? "restartReplay" : "playReplay");
  document.querySelector(".replay-play-icon").textContent = replayTimer ? "Ⅱ" : atEnd ? "↻" : "▶";
}

function applyAirportChrome() {
  const airportPickerButton = document.querySelector("#airport-picker-button");
  const airportTitle = document.querySelector("#airport-title-text");
  const fullAirportName = configText(airport.name);
  airportTitle.textContent = globalThis.matchMedia?.("(max-width: 620px)").matches
    ? headerAirportName(airport.name)
    : fullAirportName;
  airportTitle.title = fullAirportName;
  airportPickerButton.dataset.airportId = airport.id;
  airportPickerButton.setAttribute("aria-label", configText(localizedAirportLabel(
    `対象空港を変更。現在は${airport.name.ja}`,
    `Change airport. Current airport: ${airport.name.en}`,
    `更改机场。当前机场：${airport.name["zh-CN"]}`,
    `變更機場。目前機場：${airport.name["zh-TW"]}`,
    `공항 변경. 현재 공항: ${airport.name.ko}`
  )));
  renderAirportPickerResults(document.querySelector("#airport-search").value);

  for (const node of document.querySelectorAll("[data-airport-direction='from']")) node.textContent = `${airport.code} →`;
  for (const node of document.querySelectorAll("[data-airport-direction='to']")) node.textContent = `→ ${airport.code}`;
  document.querySelector("#airport-brand-code").textContent = airport.code;
  document.querySelector("#map-airport-code").textContent = airport.code;
  document.querySelector("#map-airport-coordinates").textContent = `${airport.airport[1].toFixed(4)}°N / ${airport.airport[0].toFixed(4)}°E`;

  const airportInfo = document.querySelector("#airport-info-link");
  airportInfo.href = officialLink("alerts");
  const regionalDisaster = document.querySelector("#regional-disaster-link");
  regionalDisaster.href = officialLink("disaster") ?? NRT_OFFICIAL_LINKS.chibaDisaster;
  if (!IS_NARITA) regionalDisaster.textContent = configText(localizedAirportLabel("地域の防災情報を開く", "Open regional disaster information", "打开当地防灾信息", "開啟當地防災資訊", "지역 방재 정보 열기"));

  document.querySelector("#airport-wait-link").href = officialLink("overnight");
  document.querySelector("#airport-wifi-link").href = officialLink("wifi");
  document.querySelector("#airport-stay-link").href = officialLink("stay");
  document.querySelector("#airport-accessibility-link").href = officialLink("accessibility");

  if (!IS_NARITA) {
    document.title = configText(airport.documentTitle);
    document.querySelector("meta[name='description']")?.setAttribute("content", configText(localizedAirportLabel(
      `${airport.name.ja}のフライト・空港バス・鉄道接続・道路・防災の公式情報をまとめて確認できる多言語ガイド`,
      `A multilingual one-stop guide to official flight, bus, rail-connection, road and disaster information for ${airport.name.en}.`
    )));
    document.querySelector(".topbar h1").textContent = configText(airport.dashboardTitle);
    document.querySelector(".brand-subtitle").textContent = configText(localizedAirportLabel("バス・鉄道接続・道路・空港", "Bus, rail connections, roads and airport", "巴士・铁路接驳・道路・机场", "巴士・鐵路接駁・道路・機場", "버스·철도 연결·도로·공항"));
    document.querySelector("#map").setAttribute("aria-label", configText(localizedAirportLabel(`${airport.name.ja}周辺の交通・気象地図`, `Transport and weather map around ${airport.name.en}`)));
    document.querySelector("#priority-heading").textContent = configText(localizedAirportLabel("いま確認すること", "Check now", "现在确认", "現在確認", "지금 확인"));
    document.querySelector(".transport-panel .panel-intro").textContent = SAMPLE_DEMO
      ? i18n.t("sampleCurrentSummary")
      : configText(localizedAirportLabel("空港バス・鉄道接続・道路・空港情報をまとめて確認できます。", "Check airport buses, rail connections, roads and airport updates together."));
    document.querySelector("#status-banner").hidden = true;
    document.querySelector("#replay-dock").hidden = !SAMPLE_DEMO;
    const supportStep2 = document.querySelector("[data-i18n='supportUseStep2']");
    if (supportStep2) supportStep2.textContent = configText(localizedAirportLabel("地域の防災ポータルで、発令中の避難情報と開設避難所を確認する", "Check the regional disaster portal for active evacuation notices and open shelters"));
    const networkLegend = document.querySelector(".network-legend-row");
    networkLegend.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = "ACCESS ROUTE";
    const item = document.createElement("span");
    item.textContent = `🚌 ${airport.network.features[0].properties.route_label}`;
    networkLegend.append(heading, item);
  }
}

function renderAirportPickerResults(query = "") {
  const results = document.querySelector("#airport-search-results");
  const summary = document.querySelector("#airport-search-summary");
  const empty = document.querySelector("#airport-search-empty");
  const matches = filterAirports(Object.values(AIRPORTS), query);
  results.replaceChildren();
  summary.textContent = i18n.t("airportSearchCount", { count: matches.length });
  empty.hidden = matches.length !== 0;

  for (const region of AIRPORT_REGION_ORDER) {
    const candidates = matches.filter((candidate) => candidate.region === region);
    if (candidates.length === 0) continue;

    const section = document.createElement("section");
    section.className = "airport-result-region";
    const heading = document.createElement("h3");
    heading.textContent = configText(AIRPORT_REGION_LABELS[region]);
    const list = document.createElement("div");
    list.className = "airport-result-list";

    for (const candidate of candidates) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "airport-result-button";
      button.dataset.airportId = candidate.id;
      const selected = candidate.id === airport.id;
      if (selected) button.setAttribute("aria-current", "true");

      const code = document.createElement("span");
      code.className = "airport-result-code";
      code.textContent = candidate.code;
      const name = document.createElement("span");
      name.className = "airport-result-name";
      name.textContent = configText(candidate.name);
      button.append(code, name);

      if (selected) {
        const current = document.createElement("span");
        current.className = "airport-result-current";
        current.textContent = i18n.t("airportPickerCurrent");
        button.append(current);
      }

      button.addEventListener("click", () => {
        if (selected) {
          document.querySelector("#airport-picker-dialog").close();
          return;
        }
        globalThis.location.assign(airportUrl(candidate.id));
      });
      list.append(button);
    }

    section.append(heading, list);
    results.append(section);
  }
}

function openAirportPicker() {
  const dialog = document.querySelector("#airport-picker-dialog");
  const input = document.querySelector("#airport-search");
  input.value = "";
  renderAirportPickerResults();
  document.querySelector("#airport-picker-button").setAttribute("aria-expanded", "true");
  dialog.showModal();
  globalThis.requestAnimationFrame?.(() => input.focus());
}

function closeAirportPicker() {
  document.querySelector("#airport-picker-dialog").close();
}

function renderLocalizedUi() {
  applyDocumentTranslations(i18n);
  document.querySelector('[data-map-layer="railway"]').hidden = !HAS_DIRECT_RAIL;
  document.querySelector('[data-map-transport="rail"]').hidden = !HAS_DIRECT_RAIL;
  document.querySelector("#map-layer-toolbar").style.gridTemplateColumns = `repeat(${MAP_LAYER_ITEMS.length}, minmax(0, 1fr))`;
  document.querySelector(".map-transport-tabs").style.gridTemplateColumns = `repeat(${HAS_DIRECT_RAIL ? 3 : 2}, minmax(0, 1fr))`;
  const sampleBanner = document.querySelector("#sample-demo-banner");
  sampleBanner.hidden = !SAMPLE_DEMO;
  renderReplayUi();
  languageSelect.value = i18n.locale;
  for (const localeButton of document.querySelectorAll("[data-locale]")) {
    const selected = localeButton.dataset.locale === i18n.locale;
    localeButton.classList.toggle("is-active", selected);
    localeButton.setAttribute("aria-pressed", String(selected));
  }
  updateMapControlLabels();
  updateMapLayerToolbar();
  renderPriorityIncident();
  renderEmergencyBanner();
  renderCurrentSituation();
  renderMapWeather();
  renderStatusTicker();
  renderMapDecision();
  renderOperationalPhase();
  renderTrustPanel();
  renderMunicipalSupport();
  renderJourneyUi();
  applyAirportChrome();
  if (!currentData) return;
  updateStatusBanner(currentData.metadata, i18n);
  createLayerControl({
    map,
    layerIdsByCategory,
    visibility,
    labelFor: categoryLabel,
    onVisibilityChange(category, isVisible) {
      visibility[category] = isVisible;
      syncSharedNetworkLayers();
      syncSemanticMarkerVisibility();
      syncTransportModeMarkerVisibility();
      updateMapLayerToolbar();
      renderEventList(currentData, visibility);
    }
  });
  renderEventList(currentData, visibility);
  if (activeFeature) {
    const feature = activeFeature;
    openFeature(feature);
  }
}

async function initialize() {
  const dataPromise = fetchCurrentData().then((data) => {
    liveData = data;
    if (viewMode === "live") {
      currentData = data;
      renderStatusTicker();
      renderMapDecision();
    }
    return data;
  });
  const [data, indexResult, networkData] = await Promise.all([
    dataPromise,
    fetchHistoryIndex().then((value) => ({ value })).catch((error) => ({ error })),
    fetchNetworkGuide(),
    waitForStyle()
  ]);
  liveData = data;
  networkGuideData = networkData;
  if (indexResult.value) {
    historyIndex = indexResult.value;
    historyRange = historyRangeFromSearch(initialSearchParams, historyIndex);
  } else {
    historyReplayError = indexResult.error;
  }
  if (viewMode === "history" && historyIndex) {
    try {
      historyReplay = await fetchHistoryReplay(historyRange);
      configureReplayWindow(historyReplay, historyRange);
      currentData = buildHistoryCollection(historyReplay, replayIndex, i18n);
      updateViewUrl();
    } catch (error) {
      historyReplayError = error;
      viewMode = "live";
      currentData = liveData;
      updateViewUrl();
    }
  } else {
    viewMode = "live";
    currentData = liveData;
    updateViewUrl();
  }
  addNetworkGuideLayers(decorateNetworkGuide(networkGuideData, currentData));
  addDataLayers(mapDisplayData(currentData));
  addTransportModeMarkers();
  addSemanticMapMarkers();
  bindMapInteractions();
  renderLocalizedUi();
  syncMapOverlayGeometry();
  map.resize();
  focusJourneyMap();
  globalThis.requestAnimationFrame?.(() => {
    map.resize();
    focusJourneyMap();
  });
  if (viewMode === "history" && !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) startReplay();
}

languageSelect.addEventListener("change", () => {
  i18n.setLocale(languageSelect.value);
  const localeUrl = new URL(globalThis.location.href);
  localeUrl.searchParams.set("lang", i18n.locale);
  globalThis.history.replaceState(null, "", localeUrl);
  if (viewMode === "history" && historyReplay) {
    currentData = buildHistoryCollection(historyReplay, replayIndex, i18n);
    const source = map.getSource("disaster-events");
    if (source) source.setData(mapDisplayData(currentData));
  }
  renderLocalizedUi();
  addSemanticMapMarkers();
});

document.querySelector("#airport-picker-button").addEventListener("click", openAirportPicker);
document.querySelector("#airport-picker-close").addEventListener("click", closeAirportPicker);
document.querySelector("#airport-search").addEventListener("input", (event) => {
  renderAirportPickerResults(event.target.value);
});
document.querySelector("#airport-picker-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeAirportPicker();
});
document.querySelector("#airport-picker-dialog").addEventListener("close", () => {
  document.querySelector("#airport-picker-button").setAttribute("aria-expanded", "false");
});

for (const button of document.querySelectorAll("[data-locale]")) {
  button.addEventListener("click", () => {
    languageSelect.value = button.dataset.locale;
    languageSelect.dispatchEvent(new Event("change"));
  });
}

function enableArrowKeyTabs(tablistSelector, tabSelector) {
  const tablist = document.querySelector(tablistSelector);
  if (!tablist) return;
  tablist.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...tablist.querySelectorAll(tabSelector)].filter((tab) => !tab.disabled);
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex < 0) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  });
}

enableArrowKeyTabs(".replay-mode-tabs", "[role='tab']");
enableArrowKeyTabs(".journey-tabs", "[role='tab']");

document.querySelector("#status-ticker-toggle").addEventListener("click", () => {
  tickerPaused = !tickerPaused;
  renderStatusTicker();
});

for (const button of document.querySelectorAll("[data-map-layer]")) {
  button.addEventListener("click", () => {
    const category = button.dataset.mapLayer;
    if (!IS_NARITA && !SAMPLE_DEMO && category === "weather") {
      globalThis.open(officialLink("weather"), "_blank", "noopener,noreferrer");
      return;
    }
    setMapLayerVisibility(category, !visibility[category]);
  });
}

for (const button of document.querySelectorAll("[data-view-mode]")) {
  button.addEventListener("click", () => {
    if (SAMPLE_DEMO && button.dataset.viewMode === "history") openSampleDisruptionScenario();
    else setViewMode(button.dataset.viewMode);
  });
}

document.querySelector("#sample-scenario-select").addEventListener("change", (event) => {
  if (!SAMPLE_DEMO) return;
  if (event.target.value === "history") openSampleDisruptionScenario();
  else openSampleNormalScenario();
});

document.querySelector("#history-range-button").addEventListener("click", openHistoryRangeDialog);
document.querySelector("#history-range-close").addEventListener("click", closeHistoryRangeDialog);
document.querySelector("#history-range-cancel").addEventListener("click", closeHistoryRangeDialog);
document.querySelector("#history-range-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeHistoryRangeDialog();
});
document.querySelector("#history-range-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!historyIndex || historyReplayLoading) return;
  try {
    const selectedRange = validateHistoryRange({
      start: parseJstDateTimeInput(document.querySelector("#history-start-input").value),
      end: parseJstDateTimeInput(document.querySelector("#history-end-input").value)
    }, historyIndex);
    stopReplay({ render: false });
    const loaded = await loadHistoryRange(selectedRange);
    if (!loaded) {
      setHistoryRangeError(historyReplayError);
      return;
    }
    closeHistoryRangeDialog();
  } catch (error) {
    setHistoryRangeError(error);
  }
});

document.querySelector("#replay-play").addEventListener("click", () => {
  if (replayTimer) stopReplay();
  else startReplay();
});

document.querySelector("#replay-range").addEventListener("input", (event) => {
  stopReplay({ render: false });
  const selectedIndex = replayWindowIndices[Number(event.target.value)];
  if (Number.isInteger(selectedIndex)) applyReplayIndex(selectedIndex);
});

document.querySelector("#replay-speed").addEventListener("change", () => {
  if (replayTimer) startReplay();
});

function focusJourneyChooser() {
  const chooser = document.querySelector("#map-decision");
  chooser.scrollIntoView({
    block: "center",
    behavior: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
  document.querySelector('[data-map-journey="arrival"]').focus({ preventScroll: true });
}

function scrollJourneyDetails() {
  document.querySelector("#travel-decision").scrollIntoView({
    block: "start",
    behavior: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
}

function selectJourneyMode(nextMode) {
  journeyMode = ["arrival", "departure", "stranded"].includes(nextMode) ? nextMode : null;
  if (journeyMode === "arrival" || journeyMode === "departure") prioritizeTransportDetails();
  mapDecisionExpanded = journeyMode === "arrival" || journeyMode === "departure";
  renderJourneyUi();
  renderMapDecision();
  if (!journeyMode) return;
  scrollJourneyDetails();
}

for (const button of document.querySelectorAll("[data-journey]")) {
  button.addEventListener("click", () => {
    selectJourneyMode(button.dataset.journey);
  });
}

for (const button of document.querySelectorAll("[data-map-journey]")) {
  button.addEventListener("click", () => {
    selectJourneyMode(button.dataset.mapJourney);
  });
}

for (const link of document.querySelectorAll("[data-journey-link]")) {
  link.addEventListener("click", () => selectJourneyMode(link.dataset.journeyLink));
}

for (const link of document.querySelectorAll('a[href="#cannot-move-heading"]')) {
  link.addEventListener("click", () => {
    selectJourneyMode("stranded");
  });
}

document.querySelector("#map-decision-toggle").addEventListener("click", () => {
  mapDecisionExpanded = !mapDecisionExpanded;
  renderJourneyUi();
  renderMapDecision();
  if (mapDecisionExpanded) scrollJourneyDetails();
});

document.querySelector("#transport-detail-disclosure").addEventListener("toggle", (event) => {
  if (event.currentTarget.hidden || !["arrival", "departure"].includes(journeyMode)) return;
  if (mapDecisionExpanded === event.currentTarget.open) return;
  mapDecisionExpanded = event.currentTarget.open;
  renderMapDecision();
});

if (globalThis.ResizeObserver) {
  const mapOverlayObserver = new ResizeObserver(() => {
    syncMapOverlayGeometry();
    layoutSemanticMapMarkers();
  });
  mapOverlayObserver.observe(document.querySelector("#map-decision"));
}

for (const button of document.querySelectorAll("[data-map-transport]")) {
  button.addEventListener("click", () => {
    selectedMapTransportMode = button.dataset.mapTransport;
    renderMapDecision();
  });
}

document.querySelector(".map-transport-tabs").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]:not([hidden])')];
  const currentIndex = tabs.indexOf(document.activeElement);
  if (currentIndex < 0) return;
  event.preventDefault();
  const nextIndex = event.key === "Home"
    ? 0
    : event.key === "End"
      ? tabs.length - 1
      : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !mapDecisionExpanded) return;
  mapDecisionExpanded = false;
  renderJourneyUi();
  renderMapDecision();
  document.querySelector("#map-decision-toggle").focus();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest?.("button");
  if (!button) return;
  dismissDemoGuide(button.id === "demo-guide-close" ? "close" : "interaction");
});

document.addEventListener("change", (event) => {
  if (event.target.matches?.("select, input")) dismissDemoGuide("interaction");
});

initializeDemoGuide();
renderLocalizedUi();

initialize().catch((error) => {
  showStatusError(i18n.t("lastGoodHint"), i18n);
  const panel = document.querySelector("#map-error");
  panel.hidden = false;
  panel.textContent = i18n.t("displayFailure", { message: error.message });
  console.error(error);
});
