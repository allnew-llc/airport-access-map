import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AIRPORTS, airportText } from "../src/airport-registry.js";
import {
  CURRENT_STATUS_GROUPS as NRT_STATUS_GROUPS,
  OFFICIAL_LINKS as NRT_LINKS,
  travelerMessages
} from "../src/journey-guidance.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.join(ROOT, "public", "data", "sample");
const LOCALES = ["ja", "en", "zh-CN", "zh-TW", "ko"];
const PERIOD_START = "2026-08-10T00:00:00+09:00";
const PERIOD_END = "2026-08-17T00:00:00+09:00";
const SNAPSHOT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEMO_URL = "https://allnew.work/demo/airport-access/";

const STATUS_LABELS = {
  normal: { ja: "正常", en: "Normal", "zh-CN": "正常", "zh-TW": "正常", ko: "정상" },
  warning: { ja: "遅延・注意", en: "Delay / caution", "zh-CN": "延误・注意", "zh-TW": "延誤・注意", ko: "지연·주의" },
  suspended: { ja: "運休・通行止め", en: "Suspended / closed", "zh-CN": "停运・封闭", "zh-TW": "停駛・封閉", ko: "운행 중단·통행 금지" }
};

const CATEGORY_STATUS_LABELS = {
  railway: {
    normal: { ja: "平常運転", en: "Operating normally", "zh-CN": "正常运行", "zh-TW": "正常運行", ko: "정상 운행" },
    warning: { ja: "遅延", en: "Delayed", "zh-CN": "延误", "zh-TW": "延誤", ko: "지연" },
    suspended: { ja: "運転見合わせ", en: "Suspended", "zh-CN": "暂停运行", "zh-TW": "暫停運行", ko: "운행 중단" }
  },
  bus: {
    normal: { ja: "平常運行", en: "Operating normally", "zh-CN": "正常运行", "zh-TW": "正常運行", ko: "정상 운행" },
    warning: { ja: "遅延・一部運休", en: "Delayed / some trips cancelled", "zh-CN": "延误・部分停运", "zh-TW": "延誤・部分停駛", ko: "지연·일부 운휴" },
    suspended: { ja: "運休", en: "Suspended", "zh-CN": "停运", "zh-TW": "停駛", ko: "운휴" }
  },
  road: {
    normal: { ja: "通常通行", en: "Open", "zh-CN": "正常通行", "zh-TW": "正常通行", ko: "정상 통행" },
    warning: { ja: "通行規制", en: "Restricted", "zh-CN": "交通管制", "zh-TW": "交通管制", ko: "통행 규제" },
    suspended: { ja: "通行止め", en: "Closed", "zh-CN": "封闭", "zh-TW": "封閉", ko: "통행 금지" }
  },
  weather: {
    normal: { ja: "警報なし", en: "No warning", "zh-CN": "无警报", "zh-TW": "無警報", ko: "경보 없음" },
    warning: { ja: "警戒", en: "Warning", "zh-CN": "警戒", "zh-TW": "警戒", ko: "경계" },
    suspended: { ja: "重大警報", en: "Severe warning", "zh-CN": "重大警报", "zh-TW": "重大警報", ko: "중대 경보" }
  },
  facility: {
    normal: STATUS_LABELS.normal,
    warning: STATUS_LABELS.warning,
    suspended: STATUS_LABELS.suspended
  }
};

function categoryStatusLabel(category, status) {
  return CATEGORY_STATUS_LABELS[category]?.[status] ?? STATUS_LABELS[status];
}

const SAMPLE_SOURCE = {
  ja: "AllNew 架空サンプルデータ",
  en: "AllNew fictional sample data",
  "zh-CN": "AllNew 虚构示例数据",
  "zh-TW": "AllNew 虛構示範資料",
  ko: "AllNew 가상 샘플 데이터"
};

const SAMPLE_DESCRIPTION = {
  normal: {
    ja: "この架空サンプルでは平常状態として設定されています。",
    en: "This fictional sample is configured as a normal-service scenario.",
    "zh-CN": "此虚构示例被设定为正常运行场景。",
    "zh-TW": "此虛構示範被設定為正常運行場景。",
    ko: "이 가상 샘플은 정상 운행 시나리오로 설정되어 있습니다."
  },
  warning: {
    ja: "この時点のサンプルでは遅延または規制があります。",
    en: "A delay or restriction applies in the selected sample snapshot.",
    "zh-CN": "在所选示例时点，存在延误或管制。",
    "zh-TW": "在所選示例時點，存在延誤或管制。",
    ko: "선택한 샘플 시점에는 지연 또는 통제가 있습니다."
  },
  suspended: {
    ja: "この時点のサンプルでは運休または通行止めです。",
    en: "This service is suspended or closed in the selected sample snapshot.",
    "zh-CN": "在所选示例时点，该交通服务停运或道路封闭。",
    "zh-TW": "在所選示例時點，該交通服務停駛或道路封閉。",
    ko: "선택한 샘플 시점에는 운행 중단 또는 통행 금지 상태입니다."
  }
};

const DIRECTION_LABELS = {
  railwayDirect: { ja: "空港方面・市街地方面", en: "Toward the airport / city", "zh-CN": "机场方向・市区方向", "zh-TW": "機場方向・市區方向", ko: "공항 방면·도심 방면" },
  bus: { ja: "空港発・空港行", en: "From and to the airport", "zh-CN": "机场出发・前往机场", "zh-TW": "機場出發・前往機場", ko: "공항 출발·공항행" },
  road: { ja: "空港方面・周辺地域方面", en: "Toward the airport / surrounding areas", "zh-CN": "机场方向・周边地区方向", "zh-TW": "機場方向・周邊地區方向", ko: "공항 방면·주변 지역 방면" },
  area: { ja: "空港周辺", en: "Airport area", "zh-CN": "机场周边", "zh-TW": "機場周邊", ko: "공항 주변" }
};

const STATUS_REASONS = {
  normal: {
    ja: "平常状態として設定した架空サンプル", en: "Fictional sample configured for normal operation", "zh-CN": "设定为正常运行的虚构示例", "zh-TW": "設定為正常運行的虛構示範", ko: "정상 운행으로 설정한 가상 샘플"
  },
  warning: {
    ja: "大雨による速度規制・混雑", en: "Reduced speeds and congestion due to heavy rain", "zh-CN": "因大雨限速及拥堵", "zh-TW": "因大雨限速及壅塞", ko: "폭우로 인한 감속 운행 및 혼잡"
  },
  suspended: {
    ja: "大雨による安全確認", en: "Safety inspection due to heavy rain", "zh-CN": "因大雨进行安全检查", "zh-TW": "因大雨進行安全檢查", ko: "폭우로 인한 안전 점검"
  }
};

const CATEGORY_ALTERNATIVES = {
  railway: { ja: "空港バスまたは道路交通と比較", en: "Compare airport buses and road transport", "zh-CN": "比较机场巴士和道路交通", "zh-TW": "比較機場巴士和道路交通", ko: "공항버스 또는 도로 교통과 비교" },
  bus: { ja: "鉄道またはタクシーと比較", en: "Compare rail and taxi options", "zh-CN": "比较铁路和出租车", "zh-TW": "比較鐵路和計程車", ko: "철도 또는 택시와 비교" },
  road: { ja: "鉄道・空港バスと比較", en: "Compare rail and airport bus options", "zh-CN": "与铁路和机场巴士比较", "zh-TW": "與鐵路和機場巴士比較", ko: "철도·공항버스와 비교" },
  facility: { ja: "空港係員と航空会社の案内を確認", en: "Check airport staff and airline guidance", "zh-CN": "确认机场工作人员和航空公司指引", "zh-TW": "確認機場工作人員和航空公司指引", ko: "공항 직원과 항공사 안내 확인" },
  weather: { ja: "屋内待機と時間に余裕のある移動を検討", en: "Consider waiting indoors and allow extra travel time", "zh-CN": "考虑室内等候并预留充足时间", "zh-TW": "考慮室內等候並預留充足時間", ko: "실내 대기와 충분한 이동 시간 확보" }
};

const JOURNEY_ALTERNATIVES = {
  railway: {
    from: { ja: "空港発のバス・タクシーと比較", en: "Compare buses and taxis from the airport", "zh-CN": "与机场出发的巴士和出租车比较", "zh-TW": "與機場出發的巴士和計程車比較", ko: "공항 출발 버스·택시와 비교" },
    to: { ja: "空港行きのバス・道路交通と比較", en: "Compare airport-bound buses and road transport", "zh-CN": "与前往机场的巴士和道路交通比较", "zh-TW": "與前往機場的巴士和道路交通比較", ko: "공항행 버스·도로 교통과 비교" }
  },
  bus: {
    from: { ja: "空港発の鉄道・タクシーと比較", en: "Compare trains and taxis from the airport", "zh-CN": "与机场出发的铁路和出租车比较", "zh-TW": "與機場出發的鐵路和計程車比較", ko: "공항 출발 철도·택시와 비교" },
    to: { ja: "空港行きの鉄道・タクシーと比較", en: "Compare airport-bound trains and taxis", "zh-CN": "与前往机场的铁路和出租车比较", "zh-TW": "與前往機場的鐵路和計程車比較", ko: "공항행 철도·택시와 비교" }
  },
  road: {
    from: { ja: "空港発の鉄道・バスと比較", en: "Compare trains and buses from the airport", "zh-CN": "与机场出发的铁路和巴士比较", "zh-TW": "與機場出發的鐵路和巴士比較", ko: "공항 출발 철도·버스와 비교" },
    to: { ja: "空港行きの鉄道・バスと比較", en: "Compare airport-bound trains and buses", "zh-CN": "与前往机场的铁路和巴士比较", "zh-TW": "與前往機場的鐵路和巴士比較", ko: "공항행 철도·버스와 비교" }
  }
};

const CONNECTING_JOURNEY_ALTERNATIVES = {
  railway: {
    from: { ja: "他の空港バス・タクシーと比較", en: "Compare other airport buses and taxis", "zh-CN": "比较其他机场巴士和出租车", "zh-TW": "比較其他機場巴士和計程車", ko: "다른 공항버스·택시와 비교" },
    to: { ja: "空港行きのバス・タクシーと比較", en: "Compare airport-bound buses and taxis", "zh-CN": "比较前往机场的巴士和出租车", "zh-TW": "比較前往機場的巴士和計程車", ko: "공항행 버스·택시와 비교" }
  },
  bus: {
    from: { ja: "他の空港バス・タクシーと比較", en: "Compare other airport buses and taxis", "zh-CN": "比较其他机场巴士和出租车", "zh-TW": "比較其他機場巴士和計程車", ko: "다른 공항버스·택시와 비교" },
    to: { ja: "空港行きの別便・タクシーと比較", en: "Compare other airport-bound buses and taxis", "zh-CN": "比较前往机场的其他班次和出租车", "zh-TW": "比較前往機場的其他班次和計程車", ko: "다른 공항행 버스·택시와 비교" }
  },
  road: {
    from: { ja: "空港発のバスと比較", en: "Compare buses from the airport", "zh-CN": "与机场出发的巴士比较", "zh-TW": "與機場出發的巴士比較", ko: "공항 출발 버스와 비교" },
    to: { ja: "空港行きのバスと比較", en: "Compare airport-bound buses", "zh-CN": "与前往机场的巴士比较", "zh-TW": "與前往機場的巴士比較", ko: "공항행 버스와 비교" }
  }
};

const CONNECTING_CATEGORY_ALTERNATIVES = {
  railway: { ja: "空港バス・タクシーと比較", en: "Compare airport buses and taxis", "zh-CN": "比较机场巴士和出租车", "zh-TW": "比較機場巴士和計程車", ko: "공항버스·택시와 비교" },
  bus: { ja: "他の空港バス・タクシーと比較", en: "Compare other airport buses and taxis", "zh-CN": "比较其他机场巴士和出租车", "zh-TW": "比較其他機場巴士和計程車", ko: "다른 공항버스·택시와 비교" },
  road: { ja: "空港バスと比較", en: "Compare airport buses", "zh-CN": "与机场巴士比较", "zh-TW": "與機場巴士比較", ko: "공항버스와 비교" }
};

const NRT_SAMPLE_SECTIONS = {
  "jr-narita": { ja: "東京駅 〜 成田空港", en: "Tokyo Station – Narita Airport", "zh-CN": "东京站 〜 成田机场", "zh-TW": "東京站 〜 成田機場", ko: "도쿄역 〜 나리타공항" },
  keisei: { ja: "京成上野 〜 成田空港", en: "Keisei Ueno – Narita Airport", "zh-CN": "京成上野 〜 成田机场", "zh-TW": "京成上野 〜 成田機場", ko: "게이세이 우에노 〜 나리타공항" },
  hokuso: { ja: "新鎌ヶ谷 〜 印旛日本医大", en: "Shin-Kamagaya – Inba-Nihon-Idai", "zh-CN": "新镰谷 〜 印旛日本医大", "zh-TW": "新鎌谷 〜 印旛日本醫大", ko: "신카마가야 〜 인바니혼이다이" },
  "airport-bus": { ja: "成田空港 〜 東京駅・新宿方面", en: "Narita Airport – Tokyo Station / Shinjuku", "zh-CN": "成田机场 〜 东京站・新宿方向", "zh-TW": "成田機場 〜 東京站・新宿方向", ko: "나리타공항 〜 도쿄역・신주쿠 방면" },
  "limousine-bus": { ja: "成田空港 〜 東京シティエアターミナル", en: "Narita Airport – Tokyo City Air Terminal", "zh-CN": "成田机场 〜 东京城市航空总站", "zh-TW": "成田機場 〜 東京城市航空總站", ko: "나리타공항 〜 도쿄 시티 에어 터미널" },
  "keisei-bus": { ja: "成田空港 〜 千葉県内・都心方面", en: "Narita Airport – Chiba / central Tokyo", "zh-CN": "成田机场 〜 千叶县内・东京都心", "zh-TW": "成田機場 〜 千葉縣內・東京都心", ko: "나리타공항 〜 지바현・도쿄 도심" },
  expressway: { ja: "東関東自動車道 E51 成田IC付近", en: "E51 Higashi-Kanto Expressway near Narita IC", "zh-CN": "东关东高速公路 E51 成田IC附近", "zh-TW": "東關東高速公路 E51 成田IC附近", ko: "E51 히가시칸토 자동차도 나리타 IC 부근" },
  "general-roads": { ja: "国道295号・51号 成田空港周辺", en: "Routes 295 and 51 around Narita Airport", "zh-CN": "成田机场周边国道295号・51号", "zh-TW": "成田機場周邊國道295號・51號", ko: "나리타공항 주변 국도 295・51호" },
  "airport-alerts": { ja: "成田空港 各ターミナル", en: "Narita Airport terminals", "zh-CN": "成田机场各航站楼", "zh-TW": "成田機場各航廈", ko: "나리타공항 각 터미널" },
  "nrt-weather": { ja: "成田市・富里市・芝山町周辺", en: "Narita, Tomisato and Shibayama area", "zh-CN": "成田市・富里市・芝山町周边", "zh-TW": "成田市・富里市・芝山町周邊", ko: "나리타시・도미사토시・시바야마마치 주변" }
};

const NRT_SAMPLE_ROUTE_IDS = Object.freeze({
  "jr-narita": ["jr-sobu", "jr-narita"],
  keisei: ["keisei-main", "sky-access"],
  hokuso: ["hokuso"]
});

// Schematic station-to-station paths are kept distinct per operator. The
// precise on-map geometry comes from access-network.geojson.
const NRT_SAMPLE_RAIL_PATHS = Object.freeze({
  "jr-narita": [[139.7671, 35.6812], [139.9852, 35.7018], [140.1135, 35.6134], [140.2259, 35.7097], [140.3131, 35.7770], [140.3877, 35.7730], [140.3863, 35.7720]],
  keisei: [[139.7747, 35.7113], [139.7713, 35.7278], [139.8564, 35.7459], [139.9858, 35.7008], [140.2300, 35.7243], [140.3170, 35.7766], [140.3877, 35.7730], [140.3863, 35.7720]],
  hokuso: [[139.8674, 35.7509], [139.9441, 35.7704], [139.9988, 35.7792], [140.2021, 35.7877]]
});

function localizedFromKey(key) {
  return Object.fromEntries(LOCALES.map((locale) => [locale, travelerMessages[locale]?.[key] ?? travelerMessages.ja[key] ?? key]));
}

function nrtServices() {
  const categoryByGroup = { rail: "railway", bus: "bus", road: "road", airport: "facility" };
  return NRT_STATUS_GROUPS.flatMap((group) => group.items.map((item) => ({
    id: item.id,
    category: categoryByGroup[group.id],
    label: localizedFromKey(item.labelKey),
    detail: localizedFromKey(item.detailKey),
    linkKey: item.linkKey
  })));
}

function sampleServices(airport) {
  const base = airport.id === "nrt" ? nrtServices() : airport.services;
  return [
    ...base,
    {
      id: `${airport.id}-weather`,
      category: "weather",
      label: {
        ja: `${airport.name.ja}周辺の気象`,
        en: `Weather around ${airport.name.en}`,
        "zh-CN": `${airport.name["zh-CN"]}周边天气`,
        "zh-TW": `${airport.name["zh-TW"]}周邊天氣`,
        ko: `${airport.name.ko} 주변 기상`
      },
      detail: SAMPLE_DESCRIPTION.normal,
      linkKey: "weather"
    }
  ];
}

function airportLinks(airport) {
  return airport.id === "nrt" ? { ...NRT_LINKS, weather: "https://www.jma.go.jp/bosai/map.html" } : airport.links;
}

function syntheticStatus(airportIndex, serviceIndex, snapshotIndex) {
  const value = (snapshotIndex + airportIndex * 3 + serviceIndex * 5) % 20;
  if (value >= 17) return "suspended";
  if (value >= 12) return "warning";
  return "normal";
}

function lineGeometry(airport, category, serviceId) {
  if (airport.id === "nrt" && category === "railway" && NRT_SAMPLE_RAIL_PATHS[serviceId]) {
    return { type: "LineString", coordinates: NRT_SAMPLE_RAIL_PATHS[serviceId] };
  }
  const route = airport.routeCoordinates ?? airport.network?.features?.find((feature) => feature.geometry?.type === "LineString")?.geometry?.coordinates;
  if (category === "bus" && Array.isArray(route) && route.length >= 2) {
    return { type: "LineString", coordinates: route };
  }
  const [airportLon, airportLat] = airport.airport;
  const [gatewayLon, gatewayLat] = airport.gateway.coordinate;
  const bend = category === "road" ? 0.012 : -0.008;
  return {
    type: "LineString",
    coordinates: [
      airport.gateway.coordinate,
      [(airportLon + gatewayLon) / 2 + bend, (airportLat + gatewayLat) / 2 - bend / 2],
      airport.airport
    ]
  };
}

function weatherGeometry(airport) {
  const [lon, lat] = airport.airport;
  const dx = 0.065;
  const dy = 0.045;
  return {
    type: "Polygon",
    coordinates: [[
      [lon - dx, lat - dy], [lon + dx, lat - dy], [lon + dx, lat + dy],
      [lon - dx, lat + dy], [lon - dx, lat - dy]
    ]]
  };
}

function geometryFor(airport, service) {
  if (service.category === "facility") return { type: "Point", coordinates: airport.airport };
  if (service.category === "weather") return weatherGeometry(airport);
  // Only Narita currently has a verified, route-specific rail geometry data
  // set. For other rail-served airports, anchor the sample status at the
  // airport station instead of drawing a schematic line on a geographic map.
  if (["railway", "road"].includes(service.category) && airport.id !== "nrt") {
    return { type: "Point", coordinates: airport.airport };
  }
  return lineGeometry(airport, service.category, service.id);
}

function localizedFeatureCopy(service, status) {
  const statusLabel = categoryStatusLabel(service.category, status);
  const title = Object.fromEntries(LOCALES.map((locale) => [
    locale,
    `${airportText(service.label, locale)} — ${statusLabel[locale]}`
  ]));
  const description = Object.fromEntries(LOCALES.map((locale) => [locale, SAMPLE_DESCRIPTION[status][locale]]));
  return { title, description, statusLabel };
}

function localizedFeatureFacts(airport, service, status) {
  const section = airport.id === "nrt" && NRT_SAMPLE_SECTIONS[service.id]
    ? NRT_SAMPLE_SECTIONS[service.id]
    : Object.fromEntries(LOCALES.map((locale) => {
    const airportName = airportText(airport.name, locale);
    const gatewayName = airportText(airport.gateway.label, locale);
    const areaConnector = locale === "ja" ? " 〜 " : " – ";
    return [locale, service.category === "weather" || service.category === "facility"
      ? airportName
      : `${gatewayName}${areaConnector}${airportName}`];
    }));
  const directRailAccess = airport.railAccess === "direct";
  const direction = service.category === "railway"
    ? DIRECTION_LABELS.railwayDirect
    : DIRECTION_LABELS[service.category] ?? DIRECTION_LABELS.area;
  const journeyAlternative = (directRailAccess ? JOURNEY_ALTERNATIVES : CONNECTING_JOURNEY_ALTERNATIVES)[service.category];
  const categoryAlternative = directRailAccess
    ? CATEGORY_ALTERNATIVES[service.category]
    : CONNECTING_CATEGORY_ALTERNATIVES[service.category] ?? CATEGORY_ALTERNATIVES[service.category];
  return {
    section,
    direction,
    reason: STATUS_REASONS[status],
    alternative: categoryAlternative ?? CATEGORY_ALTERNATIVES.facility,
    alternativeFromAirport: journeyAlternative?.from,
    alternativeToAirport: journeyAlternative?.to
  };
}

function featureFor({ airport, service, status, observedAt }) {
  const copy = localizedFeatureCopy(service, status);
  const facts = localizedFeatureFacts(airport, service, status);
  return {
    type: "Feature",
    geometry: geometryFor(airport, service),
    properties: {
      id: `sample-${airport.id}-${service.id}`,
      status_item_id: service.id,
      category: service.category,
      ...(service.category === "railway" ? {
        access_semantics: "direct_rail",
        ...(airport.id === "nrt" && NRT_SAMPLE_ROUTE_IDS[service.id]
          ? { affected_route_ids: NRT_SAMPLE_ROUTE_IDS[service.id] }
          : {})
      } : {}),
      status,
      status_label: copy.statusLabel.ja,
      title: copy.title.ja,
      description: copy.description.ja,
      section: facts.section.ja,
      direction: facts.direction.ja,
      reason: facts.reason.ja,
      alternative: facts.alternative.ja,
      ...(facts.alternativeFromAirport ? { alternative_from_airport: facts.alternativeFromAirport.ja } : {}),
      ...(facts.alternativeToAirport ? { alternative_to_airport: facts.alternativeToAirport.ja } : {}),
      source: SAMPLE_SOURCE.ja,
      source_url: DEMO_URL,
      updated_at: observedAt,
      data_mode: "synthetic_sample",
      source_scope: "synthetic_sample",
      evidence_class: "synthetic_sample",
      sample_data: true,
      fictional: true,
      content_language: "ja",
      translations: Object.fromEntries(LOCALES.filter((locale) => locale !== "ja").map((locale) => [locale, {
        title: copy.title[locale],
        status_label: copy.statusLabel[locale],
        description: copy.description[locale],
        section: facts.section[locale],
        direction: facts.direction[locale],
        reason: facts.reason[locale],
        alternative: facts.alternative[locale],
        ...(facts.alternativeFromAirport ? { alternative_from_airport: facts.alternativeFromAirport[locale] } : {}),
        ...(facts.alternativeToAirport ? { alternative_to_airport: facts.alternativeToAirport[locale] } : {}),
        source: SAMPLE_SOURCE[locale]
      }]))
    }
  };
}

function snapshotCopy(airport, worstStatus) {
  return Object.fromEntries(LOCALES.map((locale) => [locale, {
    headline: `${airportText(airport.name, locale)} — ${STATUS_LABELS[worstStatus][locale]}`,
    summary: SAMPLE_DESCRIPTION[worstStatus][locale]
  }]));
}

function collectionFor(airport, airportIndex, services, snapshotIndex, observedAt, forcedStatus) {
  const features = services.map((service, serviceIndex) => featureFor({
    airport,
    service,
    status: forcedStatus ?? syntheticStatus(airportIndex, serviceIndex, snapshotIndex),
    observedAt
  }));
  return {
    type: "FeatureCollection",
    metadata: {
      generated_at: observedAt,
      observed_at: observedAt,
      status: "normal",
      mode: "demo",
      airport_id: airport.id,
      ...(forcedStatus === "normal" ? { scenario: "normal_operations" } : {}),
      sample_data: true,
      fictional: true,
      not_for_travel_decisions: true,
      source_observations: []
    },
    features
  };
}

function historyFor(airport, airportIndex) {
  const services = sampleServices(airport);
  const start = Date.parse(PERIOD_START);
  const end = Date.parse(PERIOD_END);
  const snapshots = [];
  for (let observedTime = start, snapshotIndex = 0; observedTime <= end; observedTime += SNAPSHOT_INTERVAL_MS, snapshotIndex += 1) {
    const observedAt = new Date(observedTime).toISOString();
    const collection = collectionFor(airport, airportIndex, services, snapshotIndex, observedAt);
    const rank = { normal: 1, warning: 2, suspended: 3 };
    const worstStatus = collection.features.reduce((worst, feature) => (
      rank[feature.properties.status] > rank[worst] ? feature.properties.status : worst
    ), "normal");
    const localizedCopy = snapshotCopy(airport, worstStatus);
    snapshots.push({
      id: `sample-${airport.id}-${String(snapshotIndex).padStart(2, "0")}`,
      observed_at: observedAt,
      event_kind: "traffic",
      evidence_class: "synthetic_sample",
      headline: localizedCopy.ja.headline,
      summary: localizedCopy.ja.summary,
      source_url: DEMO_URL,
      translations: Object.fromEntries(LOCALES.filter((locale) => locale !== "ja").map((locale) => [locale, localizedCopy[locale]])),
      collection
    });
  }
  return {
    schema_version: "sample-history/1",
    type: "SampleHistory",
    metadata: {
      airport_id: airport.id,
      airport_code: airport.code,
      generated_at: PERIOD_END,
      period_start: PERIOD_START,
      period_end: PERIOD_END,
      time_zone: "Asia/Tokyo",
      sample_data: true,
      fictional: true,
      not_for_travel_decisions: true,
      transport_categories: ["railway", "bus", "road", "facility", "weather"]
    },
    snapshots
  };
}

async function writeJson(filePath, value) {
  const text = `${JSON.stringify(value)}\n`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, "utf8");
  return createHash("sha256").update(text).digest("hex");
}

const manifestAirports = [];
for (const [airportIndex, airport] of Object.values(AIRPORTS).entries()) {
  const history = historyFor(airport, airportIndex);
  const normalCurrent = collectionFor(airport, airportIndex, sampleServices(airport), 0, PERIOD_END, "normal");
  const airportRoot = path.join(OUTPUT_ROOT, airport.id);
  const historyPath = path.join(airportRoot, "history-sample-week.json");
  const sha256 = await writeJson(historyPath, history);
  await writeJson(path.join(airportRoot, "latest.json"), normalCurrent);
  await writeJson(path.join(airportRoot, "history-index.json"), {
    schema_version: "history-index/1",
    type: "HistoryIndex",
    generated_at: PERIOD_END,
    time_zone: "Asia/Tokyo",
    retention_days: 31,
    sample_data: true,
    fictional: true,
    not_for_travel_decisions: true,
    available_start: PERIOD_START,
    available_end: PERIOD_END,
    files: [{
      path: "history-sample-week.json",
      format: "sample-history/1",
      period_start: PERIOD_START,
      period_end: PERIOD_END,
      sha256
    }]
  });
  manifestAirports.push({
    id: airport.id,
    code: airport.code,
    service_count: history.snapshots[0].collection.features.length,
    snapshot_count: history.snapshots.length,
    feature_record_count: history.snapshots.reduce((total, snapshot) => total + snapshot.collection.features.length, 0)
  });
}

await writeJson(path.join(OUTPUT_ROOT, "manifest.json"), {
  schema_version: "airport-sample-manifest/1",
  generated_at: PERIOD_END,
  period_start: PERIOD_START,
  period_end: PERIOD_END,
  sample_data: true,
  fictional: true,
  airport_count: manifestAirports.length,
  snapshot_interval_hours: 6,
  airports: manifestAirports,
  total_feature_records: manifestAirports.reduce((total, airport) => total + airport.feature_record_count, 0)
});

console.log(`Sample demo data: ${manifestAirports.length} airports, ${manifestAirports.reduce((total, airport) => total + airport.feature_record_count, 0)} feature records`);
