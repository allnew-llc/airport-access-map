import { NATIONAL_AIRPORT_CATALOG } from "./national-airport-catalog.js";
import { NATIONAL_AIRPORT_ROUTES } from "./national-airport-routes.js";

const localized = (ja, en, zhCN = en, zhTW = zhCN, ko = en) => Object.freeze({
  ja,
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ko
});

const referenceRoute = ({ id, label, coordinates, category = "bus", operator = "airport-access" }) => ({
  type: "Feature",
  geometry: { type: "LineString", coordinates },
  properties: {
    id,
    kind: "route",
    route_id: id,
    route_label: label,
    category,
    operator,
    source_scope: "network_reference_only",
    status_meaning: "route_geometry_only",
    alert_status: "unknown",
    alert_is_stale: false,
    alert_event_id: null
  }
});

const referenceLabel = ({ id, label, coordinate, category = "bus" }) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: coordinate },
  properties: {
    id: `${id}-label`,
    kind: "label",
    route_id: id,
    route_label: label,
    category,
    source_scope: "network_reference_only",
    status_meaning: "route_geometry_only",
    alert_status: "unknown",
    alert_is_stale: false,
    alert_event_id: null
  }
});

const commonRoadLinks = Object.freeze({
  expressway: "https://www.jartic.or.jp/",
  generalRoads: "https://www.jartic.or.jp/",
  weather: "https://www.jma.go.jp/bosai/map.html",
  emergency: "https://www.japan.travel/en/plan/emergencies/"
});

// Only airports whose passenger terminal is served by an on-airport railway
// station belong here. A bus connection to a city railway station is not rail
// access and must never be represented as a railway service or map layer.
export const DIRECT_RAIL_AIRPORT_IDS = new Set(["nrt", "cts", "hnd", "kix", "ngo", "fuk", "sdj", "oka", "kmi", "ygj"]);

const NRT = Object.freeze({
  id: "nrt",
  code: "NRT",
  region: "kanto",
  name: localized("成田空港", "Narita Airport", "成田机场", "成田機場", "나리타공항"),
  dashboardTitle: localized("成田空港アクセス状況", "Narita Airport access", "成田机场交通状况", "成田機場交通狀況", "나리타공항 교통 현황"),
  documentTitle: localized("NARITA ACCESS NOW｜成田空港アクセス障害ガイド", "NARITA ACCESS NOW | Airport access guide"),
  airport: [140.3863, 35.7720],
  gateway: { coordinate: [139.7671, 35.6812], label: localized("東京駅", "Tokyo Station", "东京站", "東京站", "도쿄역") },
  railAccess: "direct",
  railAccessEvidence: Object.freeze({ source: "https://www.narita-airport.jp/ja/access/train/?vm=r", checkedAt: "2026-08-21" }),
  historyAvailable: true,
  directFlights: { source: "https://www.narita-airport.jp/en/flight/", checkedAt: "2026-08-17", routes: ["international network"] },
  rights: { mode: "existing_narita_pipeline", checkedAt: "2026-08-17" }
});

const TAK_BUS_COORDINATES = [[134.015377,34.214805],[134.029512,34.218421],[134.028879,34.219705],[134.022424,34.218061],[134.021665,34.219858],[134.015848,34.218486],[134.016772,34.220084],[134.015133,34.223263],[134.017876,34.224224],[134.021179,34.228127],[134.028255,34.229955],[134.027034,34.253105],[134.030139,34.269047],[134.033244,34.274903],[134.032649,34.289393],[134.037916,34.314131],[134.046195,34.330072],[134.048826,34.349738],[134.045745,34.350022],[134.046553,34.350483]];
const IBR_BUS_COORDINATES = [[140.412122,36.182479],[140.412835,36.183832],[140.412137,36.184412],[140.405443,36.184589],[140.398107,36.187865],[140.383815,36.192854],[140.379814,36.191903],[140.377719,36.190731],[140.37098,36.18598],[140.369216,36.184073],[140.361207,36.179556],[140.356929,36.175131],[140.348968,36.170041],[140.342707,36.174966],[140.308751,36.180996],[140.300474,36.18586],[140.284966,36.188264],[140.282947,36.189541],[140.280889,36.188839],[140.279545,36.191479]];
const AKJ_BUS_COORDINATES = [[142.447141,43.670525],[142.445872,43.67008],[142.444164,43.672647],[142.448978,43.674311],[142.445152,43.681504],[142.447721,43.683875],[142.43298,43.692941],[142.432339,43.696908],[142.435455,43.700517],[142.410723,43.714896],[142.407133,43.719211],[142.410659,43.722357],[142.385188,43.737176],[142.381099,43.740565],[142.37803,43.745913],[142.380411,43.751064],[142.370027,43.753916],[142.367206,43.757489],[142.360351,43.761839],[142.361578,43.763564],[142.356965,43.764911],[142.35601,43.764272]];

function regionalAirport({
  id,
  code,
  region,
  name,
  airport,
  gateway,
  links,
  services,
  regions,
  support,
  directFlights,
  routeCoordinates,
  routeLabel,
  railAccess = "none"
}) {
  const serviceIds = services.map((service) => service.id);
  const busIds = services.filter((service) => service.category === "bus").map((service) => service.id);
  const railIds = services.filter((service) => service.category === "railway").map((service) => service.id);
  const roadIds = services.filter((service) => service.category === "road").map((service) => service.id);
  const airportIds = services.filter((service) => service.category === "facility").map((service) => service.id);
  const groups = [
    { id: "rail", title: localized("鉄道", "Rail", "铁路", "鐵路", "철도"), ids: railIds },
    { id: "bus", title: localized("空港バス", "Airport buses", "机场巴士", "機場巴士", "공항버스"), ids: busIds },
    { id: "road", title: localized("道路・タクシー", "Roads & taxis", "道路与出租车", "道路與計程車", "도로·택시"), ids: roadIds },
    { id: "airport", title: localized("空港公式情報", "Airport updates", "机场官方信息", "機場官方資訊", "공항 공식 안내"), ids: airportIds }
  ].filter((group) => group.ids.length > 0).map((group) => ({
    id: group.id,
    title: group.title,
    items: group.ids.map((serviceId) => services.find((service) => service.id === serviceId))
  }));
  const overview = [
    { id: "rail", icon: "🚆", ids: railIds, linkKey: "rail", tone: "jr" },
    { id: "bus", icon: "🚌", ids: busIds, linkKey: "busAll", tone: "bus" },
    { id: "road", icon: "🚗", ids: roadIds, linkKey: "expressway", tone: "road" },
    { id: "airport", icon: "✈", ids: airportIds, linkKey: "alerts", tone: "facility" }
  ].filter((item) => item.ids.length > 0).map((item) => ({
    id: item.id,
    icon: item.icon,
    itemIds: item.ids,
    label: groups.find((group) => group.id === item.id)?.title ?? name,
    linkKey: item.linkKey,
    tone: item.tone,
    routeIds: item.id === "bus" ? [`${id}-airport-bus`] : []
  }));

  const route = referenceRoute({ id: `${id}-airport-bus`, label: routeLabel.ja, coordinates: routeCoordinates });
  return Object.freeze({
    id,
    code,
    region,
    name,
    dashboardTitle: localized(`${name.ja}アクセス状況`, `${name.en} access`, `${name["zh-CN"]}交通状况`, `${name["zh-TW"]}交通狀況`, `${name.ko} 교통 현황`),
    documentTitle: localized(`${code} ACCESS NOW｜${name.ja}アクセス障害ガイド`, `${code} ACCESS NOW | ${name.en} access guide`),
    airport,
    gateway,
    railAccess,
    railAccessEvidence: Object.freeze({ source: links.access, checkedAt: "2026-08-21" }),
    historyAvailable: false,
    links: Object.freeze({ ...commonRoadLinks, ...links }),
    services: Object.freeze(services),
    statusGroups: Object.freeze(groups),
    overview: Object.freeze(overview),
    regions: Object.freeze(regions),
    support: Object.freeze(support),
    directFlights: Object.freeze(directFlights),
    rights: Object.freeze({ mode: "official_link_only", clearance: "no_republication", checkedAt: "2026-08-17" }),
    network: Object.freeze({
      type: "FeatureCollection",
      metadata: {
        source: "OpenStreetMap contributors / OSRM static build-time route",
        source_url: "https://www.openstreetmap.org/copyright",
        license: "ODbL 1.0",
        status_meaning: "Geometry does not indicate operation, safety or availability."
      },
      features: [
        route,
        referenceLabel({ id: route.properties.route_id, label: routeLabel.ja, coordinate: routeCoordinates[Math.floor(routeCoordinates.length / 2)] })
      ]
    }),
    serviceIds: Object.freeze(serviceIds)
  });
}

const TAK = regionalAirport({
  id: "tak",
  code: "TAK",
  region: "shikoku",
  name: localized("高松空港", "Takamatsu Airport", "高松机场", "高松機場", "다카마쓰공항"),
  airport: [134.0156, 34.2142],
  gateway: { coordinate: [134.0466, 34.3504], label: localized("高松駅", "Takamatsu Station", "高松站", "高松站", "다카마쓰역") },
  links: {
    arrivals: "https://www.takamatsu-airport.com/timetable/",
    departures: "https://www.takamatsu-airport.com/timetable/",
    airlines: "https://www.takamatsu-airport.com/timetable/",
    alerts: "https://www.takamatsu-airport.com/news/",
    access: "https://www.takamatsu-airport.com/access/",
    rail: "https://www.takamatsu-airport.com/access/bus/",
    bus: "https://www.takamatsu-airport.com/access/bus/",
    busAll: "https://www.takamatsu-airport.com/access/bus/",
    taxi: "https://www.takamatsu-airport.com/access/taxi/",
    overnight: "https://www.takamatsu-airport.com/",
    stay: "https://www.takamatsu-airport.com/",
    wifi: "https://www.takamatsu-airport.com/",
    accessibility: "https://www.takamatsu-airport.com/",
    disaster: "https://www.pref.kagawa.lg.jp/kikikanri/sogo/bosaijoho/wcj0cp200403105310.html",
    municipality: "https://www.city.takamatsu.kagawa.jp/kurashi/kurashi/shobo/bosai_map/takamatsu_map/",
    multilingual: "https://www.city.takamatsu.kagawa.jp/kurashi/kurashi/shobo/tagengo/index.html"
  },
  services: [
    { id: "tak-bus", category: "bus", label: localized("高松空港リムジンバス", "Takamatsu Airport limousine bus", "高松机场巴士", "高松機場巴士", "다카마쓰 공항 리무진버스"), detail: localized("高松駅・琴平・丸亀など方面別に確認", "Check routes for Takamatsu Station, Kotohira, Marugame and more"), linkKey: "busAll", evidence: "source_only" },
    { id: "tak-road", category: "road", label: localized("高松空港周辺道路", "Roads around Takamatsu Airport", "高松机场周边道路", "高松機場周邊道路", "다카마쓰공항 주변 도로"), detail: localized("道路規制とタクシー乗り場を確認", "Check road restrictions and taxi information"), linkKey: "expressway", evidence: "source_only" },
    { id: "tak-alerts", category: "facility", label: localized("高松空港からのお知らせ", "Takamatsu Airport updates", "高松机场通知", "高松機場公告", "다카마쓰공항 안내"), detail: localized("フライト・空港施設・アクセスへの影響", "Flight, terminal and ground-access updates"), linkKey: "alerts", evidence: "source_only" }
  ],
  regions: [
    ["takamatsu", localized("高松駅・市内", "Takamatsu Station / city"), localized("空港リムジンバスとタクシーを比較", "Compare the airport limousine bus and taxi")],
    ["kotohira", localized("琴平", "Kotohira"), localized("琴平方面バスの運行時刻を確認", "Check the Kotohira bus schedule")],
    ["marugame", localized("坂出・丸亀", "Sakaide / Marugame"), localized("方面別バスと道路状況を確認", "Check regional buses and road conditions")]
  ],
  support: [
    { id: "airport", title: localized("空港内で待機", "Wait inside the airport"), detail: localized("空港係員と公式通知を確認", "Ask airport staff and check official updates"), linkKey: "alerts" },
    { id: "kagawa", title: localized("香川県防災情報", "Kagawa disaster information"), detail: localized("避難情報・避難所・多言語防災ナビ", "Evacuation, shelters and multilingual disaster navigation"), linkKey: "disaster" },
    { id: "takamatsu", title: localized("高松市の避難所", "Takamatsu City shelters"), detail: localized("開設状況を確認してから利用", "Use only after confirming that a shelter is open"), linkKey: "municipality" },
    { id: "multilingual", title: localized("多言語防災情報", "Multilingual disaster information"), detail: localized("高松市の外国語防災案内", "Takamatsu City information in other languages"), linkKey: "multilingual" }
  ],
  directFlights: { source: "https://www.takamatsu-airport.com/timetable/inte-next.php", checkedAt: "2026-08-17", routes: ["Seoul", "Taipei", "Hong Kong", "Taichung", "Busan", "Shanghai (schedule may be suspended)"] },
  routeCoordinates: TAK_BUS_COORDINATES,
  routeLabel: localized("高松駅方面 空港バス経路", "Airport bus to Takamatsu Station")
});

const IBR = regionalAirport({
  id: "ibr",
  code: "IBR",
  region: "kanto",
  name: localized("茨城空港", "Ibaraki Airport", "茨城机场", "茨城機場", "이바라키공항"),
  airport: [140.4147, 36.1817],
  gateway: { coordinate: [140.2796, 36.1915], label: localized("石岡駅", "Ishioka Station", "石冈站", "石岡站", "이시오카역") },
  links: {
    arrivals: "https://www.ibaraki-airport.net/flight/",
    departures: "https://www.ibaraki-airport.net/flight/",
    airlines: "https://www.ibaraki-airport.net/flight/",
    alerts: "https://www.ibaraki-airport.net/",
    access: "https://www.ibaraki-airport.net/access/",
    rail: "https://www.ibaraki-airport.net/access/",
    bus: "https://www.ibaraki-airport.net/access/bus/",
    busAll: "https://www.ibaraki-airport.net/access/bus/",
    taxi: "https://www.ibaraki-airport.net/access/taxi/",
    overnight: "https://www.ibaraki-airport.net/facilities/",
    stay: "https://www.ibaraki-airport.net/facilities/",
    wifi: "https://www.ibaraki-airport.net/facilities/",
    accessibility: "https://www.ibaraki-airport.net/facilities/",
    disaster: "https://www.bousai.ibaraki.jp/",
    municipality: "https://www.city.omitama.lg.jp/viewer/sitemap.html?idSubTop=3",
    multilingual: "https://www.japan.travel/en/plan/emergencies/"
  },
  services: [
    { id: "ibr-bus", category: "bus", label: localized("茨城空港アクセスバス", "Ibaraki Airport access buses", "茨城机场接驳巴士", "茨城機場接駁巴士", "이바라키공항 액세스 버스"), detail: localized("石岡・水戸・つくば・東京方面を確認", "Check Ishioka, Mito, Tsukuba and Tokyo routes"), linkKey: "busAll", evidence: "source_only" },
    { id: "ibr-road", category: "road", label: localized("常磐道・東関東道水戸線", "Joban / Higashi-Kanto Mito roads", "常磐道・东关东道水户线", "常磐道・東關東道水戶線", "조반도·히가시칸토 미토선"), detail: localized("通行規制・駐車場・タクシーを確認", "Check restrictions, parking and taxis"), linkKey: "expressway", evidence: "source_only" },
    { id: "ibr-alerts", category: "facility", label: localized("茨城空港からのお知らせ", "Ibaraki Airport updates", "茨城机场通知", "茨城機場公告", "이바라키공항 안내"), detail: localized("フライト・空港施設・アクセスへの影響", "Flight, terminal and ground-access updates"), linkKey: "alerts", evidence: "source_only" }
  ],
  regions: [
    ["ishioka", localized("石岡駅", "Ishioka Station"), localized("最寄りのJR駅。空港連絡バスを確認", "Nearest JR station; check the airport bus")],
    ["mito", localized("水戸駅", "Mito Station"), localized("高速・一般道経由のバスを比較", "Compare expressway and local-road buses")],
    ["tsukuba", localized("つくば", "Tsukuba"), localized("つくば方面バスの運行情報を確認", "Check the Tsukuba bus")],
    ["tokyo", localized("東京駅", "Tokyo Station"), localized("東京方面バスと代替経路を確認", "Check the Tokyo bus and alternatives")]
  ],
  support: [
    { id: "airport", title: localized("空港内で待機", "Wait inside the airport"), detail: localized("空港係員と公式通知を確認", "Ask airport staff and check official updates"), linkKey: "alerts" },
    { id: "ibaraki", title: localized("茨城県防災ポータル", "Ibaraki disaster portal"), detail: localized("警報・避難情報・県内避難所", "Warnings, evacuation notices and shelters"), linkKey: "disaster" },
    { id: "omitama", title: localized("小美玉市の防災情報", "Omitama City disaster information"), detail: localized("空港所在地の避難所・ハザード情報", "Shelters and hazards in the airport municipality"), linkKey: "municipality" },
    { id: "multilingual", title: localized("訪日旅行者向け緊急情報", "Emergency information for visitors"), detail: localized("JNTOの多言語案内", "JNTO multilingual information"), linkKey: "multilingual" }
  ],
  directFlights: { source: "https://www.ibaraki-airport.net/flight/", checkedAt: "2026-08-17", routes: ["Seoul/Incheon (suspended during the published period)", "Cheongju (scheduled to resume September 2026)"] },
  routeCoordinates: IBR_BUS_COORDINATES,
  routeLabel: localized("石岡駅方面 空港バス経路", "Airport bus to Ishioka Station")
});

const AKJ = regionalAirport({
  id: "akj",
  code: "AKJ",
  region: "hokkaido",
  name: localized("旭川空港", "Asahikawa Airport", "旭川机场", "旭川機場", "아사히카와공항"),
  airport: [142.4475, 43.6708],
  gateway: { coordinate: [142.3570, 43.7635], label: localized("旭川駅", "Asahikawa Station", "旭川站", "旭川站", "아사히카와역") },
  links: {
    arrivals: "https://www.hokkaido-airports.com/ja/asahikawa/airport/",
    departures: "https://www.hokkaido-airports.com/ja/asahikawa/airport/",
    airlines: "https://www.hokkaido-airports.com/ja/asahikawa/airport/time/",
    alerts: "https://www.hokkaido-airports.com/ja/asahikawa/",
    access: "https://www.hokkaido-airports.com/ja/asahikawa/access/",
    rail: "https://www.hokkaido-airports.com/ja/asahikawa/access/bus/",
    bus: "https://www.hokkaido-airports.com/ja/asahikawa/access/bus/",
    busAll: "https://www.hokkaido-airports.com/ja/asahikawa/access/bus/",
    taxi: "https://www.hokkaido-airports.com/ja/asahikawa/access/taxi/",
    overnight: "https://www.hokkaido-airports.com/ja/asahikawa/service/",
    stay: "https://www.hokkaido-airports.com/ja/asahikawa/service/",
    wifi: "https://www.hokkaido-airports.com/ja/asahikawa/service/",
    accessibility: "https://www.hokkaido-airports.com/ja/asahikawa/service/",
    disaster: "https://www.bousai-hokkaido.jp/fp/?areaCd=014532",
    municipality: "https://www.town.higashikagura.lg.jp/c4_bosai/",
    multilingual: "https://www.japan.travel/en/plan/emergencies/"
  },
  services: [
    { id: "akj-bus", category: "bus", label: localized("旭川空港バス", "Asahikawa Airport buses", "旭川机场巴士", "旭川機場巴士", "아사히카와공항 버스"), detail: localized("旭川駅・美瑛・富良野・旭岳方面を確認", "Check Asahikawa, Biei, Furano and Asahidake routes"), linkKey: "busAll", evidence: "source_only" },
    { id: "akj-road", category: "road", label: localized("国道237号・周辺道路", "Route 237 and nearby roads", "国道237号及周边道路", "國道237號及周邊道路", "국도 237호·주변 도로"), detail: localized("積雪・通行規制・タクシーを確認", "Check snow, road restrictions and taxis"), linkKey: "expressway", evidence: "source_only" },
    { id: "akj-alerts", category: "facility", label: localized("旭川空港からのお知らせ", "Asahikawa Airport updates", "旭川机场通知", "旭川機場公告", "아사히카와공항 안내"), detail: localized("フライト・空港施設・アクセスへの影響", "Flight, terminal and ground-access updates"), linkKey: "alerts", evidence: "source_only" }
  ],
  regions: [
    ["asahikawa", localized("旭川駅・市内", "Asahikawa Station / city"), localized("空港専用バス・路線バス・タクシーを比較", "Compare airport buses, local buses and taxis")],
    ["biei-furano", localized("美瑛・富良野", "Biei / Furano"), localized("ラベンダー号など方面別バスを確認", "Check regional buses such as the Lavender service")],
    ["asahidake", localized("東川・旭岳", "Higashikawa / Asahidake"), localized("路線バスの運行日・時刻を確認", "Check operating days and times")]
  ],
  support: [
    { id: "airport", title: localized("空港内で待機", "Wait inside the airport"), detail: localized("空港係員と公式通知を確認", "Ask airport staff and check official updates"), linkKey: "alerts" },
    { id: "hokkaido", title: localized("北海道防災ポータル", "Hokkaido disaster portal"), detail: localized("東神楽町の避難・気象情報", "Evacuation and weather information for Higashikagura"), linkKey: "disaster" },
    { id: "higashikagura", title: localized("東神楽町の防災情報", "Higashikagura disaster information"), detail: localized("空港所在地の避難場所・緊急情報", "Shelters and emergency information in the airport municipality"), linkKey: "municipality" },
    { id: "multilingual", title: localized("訪日旅行者向け緊急情報", "Emergency information for visitors"), detail: localized("JNTOの多言語案内", "JNTO multilingual information"), linkKey: "multilingual" }
  ],
  directFlights: { source: "https://www.hokkaido-airports.com/ja/asahikawa/airport/time/", checkedAt: "2026-08-17", routes: ["International flights listed by the airport; confirm the current date and airline on the official schedule"] },
  routeCoordinates: AKJ_BUS_COORDINATES,
  routeLabel: localized("旭川駅方面 空港バス経路", "Airport bus to Asahikawa Station")
});

function catalogAirport(item) {
  const airportName = item.name;
  const gatewayName = item.gateway.label;
  const localSupport = item.localSupport;
  const municipalityName = localSupport.municipality;
  const railAccess = DIRECT_RAIL_AIRPORT_IDS.has(item.id) ? "direct" : "none";
  return regionalAirport({
    id: item.id,
    code: item.code,
    region: item.region,
    name: airportName,
    airport: item.airport,
    gateway: item.gateway,
    links: {
      arrivals: item.flight,
      departures: item.flight,
      airlines: item.flight,
      alerts: item.home,
      access: item.access,
      rail: item.access,
      bus: item.access,
      busAll: item.access,
      taxi: item.access,
      overnight: item.home,
      stay: item.home,
      wifi: item.home,
      accessibility: item.home,
      disaster: localSupport.disaster,
      municipality: localSupport.shelter,
      multilingual: localSupport.multilingual
    },
    services: [
      ...(railAccess === "direct" ? [{
        id: `${item.id}-rail`,
        category: "railway",
        label: localized(`${gatewayName.ja}方面の鉄道`, `Rail to ${gatewayName.en}`),
        detail: localized("空港公式アクセス案内で鉄道を確認", "Check rail service on the airport's official access guide"),
        linkKey: "access",
        evidence: "source_only"
      }] : []),
      {
        id: `${item.id}-bus`,
        category: "bus",
        label: localized(`${airportName.ja}の空港バス`, `${airportName.en} buses`),
        detail: localized("方面・乗り場・運行会社を空港公式案内で確認", "Check destinations, stops and operators on the airport's official guide"),
        linkKey: "busAll",
        evidence: "source_only"
      },
      {
        id: `${item.id}-road`,
        category: "road",
        label: localized(`${airportName.ja}周辺の道路・タクシー`, `Roads and taxis around ${airportName.en}`),
        detail: localized("道路規制はJARTIC、乗り場は空港公式案内で確認", "Check road restrictions with JARTIC and taxi stops on the airport guide"),
        linkKey: "expressway",
        evidence: "source_only"
      },
      {
        id: `${item.id}-alerts`,
        category: "facility",
        label: localized(`${airportName.ja}からのお知らせ`, `${airportName.en} updates`),
        detail: localized("フライト・空港施設・地上アクセスへの影響", "Flight, terminal and ground-access updates"),
        linkKey: "alerts",
        evidence: "source_only"
      }
    ],
    regions: [
      [item.gateway.label.ja, gatewayName, localized("空港公式アクセス案内で利用可能な交通手段を比較", "Compare available transport on the airport's official guide")]
    ],
    support: [
      { id: "airport", title: localized("空港内の案内を確認", "Check information inside the airport"), detail: localized("空港係員と空港公式サイトで確認", "Ask airport staff and check the official airport site"), linkKey: "alerts" },
      { id: "local-disaster", title: localized(`${municipalityName.ja}の防災情報`, `${municipalityName.en} disaster information`), detail: localized("避難情報・防災マップ・自治体の最新発表", "Evacuation information, hazard maps and local updates"), linkKey: "disaster" },
      { id: "local-shelter", title: localized(`${municipalityName.ja}の避難所`, `${municipalityName.en} shelters`), detail: localized("災害種別と開設状況を確認してから利用", "Confirm the applicable hazard and that a shelter is open before going"), linkKey: "municipality" },
      { id: "multilingual", title: localized("外国人旅行者向け緊急支援", "Emergency support for international visitors"), detail: localized("多言語情報と訪日旅行者ホットライン", "Multilingual information and the visitor hotline"), linkKey: "multilingual" }
    ],
    directFlights: {
      source: item.directFlights.source,
      checkedAt: item.directFlights.checkedAt,
      routes: [`2026 summer plan: ${item.directFlights.weeklyFlights} direct international flights/week`]
    },
    routeCoordinates: NATIONAL_AIRPORT_ROUTES[item.id],
    routeLabel: localized(`${gatewayName.ja}方面 主要アクセス経路`, `Main access route to ${gatewayName.en}`),
    railAccess
  });
}

const NATIONAL_AIRPORTS = NATIONAL_AIRPORT_CATALOG.map(catalogAirport);

export const AIRPORT_REGION_ORDER = Object.freeze([
  "hokkaido", "tohoku", "kanto", "hokuriku", "tokai", "kansai", "chugoku", "shikoku", "kyushu", "okinawa"
]);

export const AIRPORT_REGION_LABELS = Object.freeze({
  hokkaido: localized("北海道", "Hokkaido", "北海道", "北海道", "홋카이도"),
  tohoku: localized("東北", "Tohoku", "东北", "東北", "도호쿠"),
  kanto: localized("関東", "Kanto", "关东", "關東", "간토"),
  hokuriku: localized("北陸・甲信越", "Hokuriku / Koshinetsu", "北陆・甲信越", "北陸・甲信越", "호쿠리쿠·고신에쓰"),
  tokai: localized("東海", "Tokai", "东海", "東海", "도카이"),
  kansai: localized("関西", "Kansai", "关西", "關西", "간사이"),
  chugoku: localized("中国", "Chugoku", "中国地方", "中國地方", "주고쿠"),
  shikoku: localized("四国", "Shikoku", "四国", "四國", "시코쿠"),
  kyushu: localized("九州", "Kyushu", "九州", "九州", "규슈"),
  okinawa: localized("沖縄", "Okinawa", "冲绳", "沖繩", "오키나와")
});

export const AIRPORTS = Object.freeze(Object.fromEntries(
  [NRT, TAK, IBR, AKJ, ...NATIONAL_AIRPORTS].map((item) => [item.id, item])
));
export const AIRPORT_IDS = Object.freeze(Object.keys(AIRPORTS));

export function airportText(value, locale = "ja") {
  if (typeof value === "string") return value;
  return value?.[locale] ?? value?.en ?? value?.ja ?? "";
}

export function resolveAirport(search = globalThis.location?.search ?? "") {
  const id = new URLSearchParams(search).get("airport")?.toLowerCase();
  return AIRPORTS[id] ?? AIRPORTS.nrt;
}

export function airportUrl(id, locationHref = globalThis.location?.href ?? "http://localhost/") {
  const url = new URL(locationHref);
  if (id === "nrt") url.searchParams.delete("airport");
  else url.searchParams.set("airport", id);
  url.searchParams.delete("view");
  url.searchParams.delete("start");
  url.searchParams.delete("end");
  url.hash = "";
  return url.toString();
}

export function regionalCurrentData(airport, now = new Date()) {
  if (!airport || airport.id === "nrt") throw new Error("regionalCurrentData requires a regional airport");
  const generatedAt = now.toISOString();
  return {
    type: "FeatureCollection",
    metadata: {
      generated_at: generatedAt,
      status: "source_only",
      mode: "official_links",
      airport_id: airport.id,
      source_policy: "official_link_only",
      source_observations: []
    },
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: airport.airport },
        properties: {
          id: `${airport.id}-airport-reference`,
          category: "facility",
          status: "unknown",
          title: airport.name.ja,
          title_en: airport.name.en,
          source: airport.name.ja,
          source_en: airport.name.en,
          source_url: airport.links.alerts,
          updated_at: generatedAt,
          source_scope: "network_reference_only"
        }
      }
    ]
  };
}
