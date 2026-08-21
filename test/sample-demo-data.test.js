import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AIRPORTS } from "../src/airport-registry.js";
import { defaultHistoryRange, validateHistoryIndex } from "../src/history-range.js";
import { validateSampleHistoryForBrowser } from "../src/sample-history.js";

const sampleUrl = (path) => new URL(`../public/data/sample/${path}`, import.meta.url);
const invalidNormalReason = /障害(?:・異常)?情報(?:が)?(?:ありま)?せん|障害情報なし|情報がないため|No (?:disruption|incident|issue|information)|without (?:disruption|incident)|无(?:故障|异常|相关)?信息|沒有(?:故障|異常|相關)?資訊|無(?:障礙|異常|相關)?資訊|정보(?:가)? 없음|이상 없음/i;
const translatedLocales = ["en", "zh-CN", "zh-TW", "ko"];
const expectedDirections = {
  railwayDirect: { ja: "空港方面・市街地方面", en: "Toward the airport / city", "zh-CN": "机场方向・市区方向", "zh-TW": "機場方向・市區方向", ko: "공항 방면·도심 방면" },
  bus: { ja: "空港発・空港行", en: "From and to the airport", "zh-CN": "机场出发・前往机场", "zh-TW": "機場出發・前往機場", ko: "공항 출발·공항행" },
  road: { ja: "空港方面・周辺地域方面", en: "Toward the airport / surrounding areas", "zh-CN": "机场方向・周边地区方向", "zh-TW": "機場方向・周邊地區方向", ko: "공항 방면·주변 지역 방면" },
  facility: { ja: "空港周辺", en: "Airport area", "zh-CN": "机场周边", "zh-TW": "機場周邊", ko: "공항 주변" },
  weather: { ja: "空港周辺", en: "Airport area", "zh-CN": "机场周边", "zh-TW": "機場周邊", ko: "공항 주변" }
};
const directJourneyAlternatives = {
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
const connectingJourneyAlternatives = {
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
const expectedNormalReasons = {
  ja: "平常状態として設定した架空サンプル",
  en: "Fictional sample configured for normal operation",
  "zh-CN": "设定为正常运行的虚构示例",
  "zh-TW": "設定為正常運行的虛構示範",
  ko: "정상 운행으로 설정한 가상 샘플"
};
const nrtRailRouteIds = {
  "sample-nrt-jr-narita": ["jr-sobu", "jr-narita"],
  "sample-nrt-keisei": ["keisei-main", "sky-access"],
  "sample-nrt-hokuso": ["hokuso"]
};

test("sample demo contains exactly seven days for every airport and transport category", async () => {
  const manifest = JSON.parse(await readFile(sampleUrl("manifest.json"), "utf8"));
  assert.equal(manifest.sample_data, true);
  assert.equal(manifest.fictional, true);
  assert.equal(manifest.airport_count, Object.keys(AIRPORTS).length);
  assert.equal(Date.parse(manifest.period_end) - Date.parse(manifest.period_start), 7 * 24 * 60 * 60 * 1000);

  for (const airport of Object.values(AIRPORTS)) {
    const history = validateSampleHistoryForBrowser(JSON.parse(await readFile(sampleUrl(`${airport.id}/history-sample-week.json`), "utf8")));
    const historyIndex = validateHistoryIndex(JSON.parse(await readFile(sampleUrl(`${airport.id}/history-index.json`), "utf8")));
    const current = JSON.parse(await readFile(sampleUrl(`${airport.id}/latest.json`), "utf8"));
    assert.equal(historyIndex.sample_data, true);
    assert.equal(historyIndex.fictional, true);
    assert.equal(historyIndex.not_for_travel_decisions, true);
    assert.deepEqual(defaultHistoryRange(historyIndex, Date.parse("2030-01-01T00:00:00+09:00")), {
      start: Date.parse(historyIndex.available_start),
      end: Date.parse(historyIndex.available_end)
    });
    assert.equal(history.snapshots.length, 29);
    assert.equal(current.metadata.scenario, "normal_operations");
    assert.ok(current.features.every((feature) => feature.properties.status === "normal"));
    const features = history.snapshots[0].collection.features;
    const categories = new Set(features.map((feature) => feature.properties.category));
    assert.deepEqual(
      [...categories].sort(),
      airport.railAccess === "direct"
        ? ["bus", "facility", "railway", "road", "weather"]
        : ["bus", "facility", "road", "weather"]
    );
    for (const feature of features) {
      for (const field of ["section", "direction", "reason", "alternative"]) {
        assert.ok(feature.properties[field]?.trim(), `${airport.id}.${feature.properties.id}.${field}`);
        for (const locale of translatedLocales) {
          assert.ok(feature.properties.translations?.[locale]?.[field]?.trim(), `${airport.id}.${feature.properties.id}.${locale}.${field}`);
        }
      }
    }
    const allFeatures = [
      ...current.features,
      ...history.snapshots.flatMap((snapshot) => snapshot.collection.features)
    ];
    for (const feature of allFeatures) {
      const properties = feature.properties;
      assert.equal(properties.sample_data, true);
      assert.equal(properties.source_scope, "synthetic_sample");
      assert.equal(properties.evidence_class, "synthetic_sample");
      if (properties.category === "railway") {
        assert.equal(airport.railAccess, "direct", `${airport.id} must not contain synthetic rail without an airport station`);
        assert.equal(properties.access_semantics, "direct_rail", `${airport.id}.${properties.id}.access_semantics`);
        if (airport.id !== "nrt") {
          assert.deepEqual(feature.geometry, { type: "Point", coordinates: airport.airport }, `${airport.id}.${properties.id}.airport station anchor`);
        }
        if (airport.id === "nrt") {
          assert.deepEqual(properties.affected_route_ids, nrtRailRouteIds[properties.id], `${properties.id}.affected_route_ids`);
        }
      }
      if (properties.category === "road" && airport.id !== "nrt") {
        assert.deepEqual(feature.geometry, { type: "Point", coordinates: airport.airport }, `${airport.id}.${properties.id}.airport road status anchor`);
      }
      const directionKey = properties.category === "railway"
        ? "railwayDirect"
        : properties.category;
      assert.equal(properties.direction, expectedDirections[directionKey].ja, `${airport.id}.${properties.id}.direction`);
      for (const locale of translatedLocales) {
        assert.equal(
          properties.translations[locale].direction,
          expectedDirections[directionKey][locale],
          `${airport.id}.${properties.id}.${locale}.direction`
        );
      }
      if (properties.status === "normal") {
        assert.doesNotMatch(properties.reason, invalidNormalReason, `${airport.id}.${properties.id}.reason`);
        assert.equal(properties.reason, expectedNormalReasons.ja, `${airport.id}.${properties.id}.normal reason`);
        for (const locale of translatedLocales) {
          assert.doesNotMatch(properties.translations[locale].reason, invalidNormalReason, `${airport.id}.${properties.id}.${locale}.reason`);
          assert.equal(
            properties.translations[locale].reason,
            expectedNormalReasons[locale],
            `${airport.id}.${properties.id}.${locale}.normal reason`
          );
        }
      }
      if (["railway", "bus", "road"].includes(properties.category)) {
        const expectedAlternative = (airport.railAccess === "direct" ? directJourneyAlternatives : connectingJourneyAlternatives)[properties.category];
        assert.ok(properties.alternative_from_airport?.trim(), `${airport.id}.${properties.id}.alternative_from_airport`);
        assert.ok(properties.alternative_to_airport?.trim(), `${airport.id}.${properties.id}.alternative_to_airport`);
        assert.notEqual(properties.alternative_from_airport, properties.alternative_to_airport);
        assert.equal(properties.alternative_from_airport, expectedAlternative.from.ja, `${airport.id}.${properties.id}.alternative_from_airport`);
        assert.equal(properties.alternative_to_airport, expectedAlternative.to.ja, `${airport.id}.${properties.id}.alternative_to_airport`);
        for (const locale of translatedLocales) {
          const translated = properties.translations[locale];
          assert.ok(translated.alternative_from_airport?.trim(), `${airport.id}.${properties.id}.${locale}.alternative_from_airport`);
          assert.ok(translated.alternative_to_airport?.trim(), `${airport.id}.${properties.id}.${locale}.alternative_to_airport`);
          assert.notEqual(
            translated.alternative_from_airport,
            translated.alternative_to_airport,
            `${airport.id}.${properties.id}.${locale}.direction-specific alternative`
          );
          assert.equal(translated.alternative_from_airport, expectedAlternative.from[locale], `${airport.id}.${properties.id}.${locale}.alternative_from_airport`);
          assert.equal(translated.alternative_to_airport, expectedAlternative.to[locale], `${airport.id}.${properties.id}.${locale}.alternative_to_airport`);
        }
      }
    }
    if (airport.id === "nrt") {
      const railGeometryVariants = new Set(current.features
        .filter((feature) => feature.properties.category === "railway")
        .map((feature) => JSON.stringify(feature.geometry.coordinates)));
      assert.equal(railGeometryVariants.size, 3, "NRT rail operators must not share one schematic line");
    }
  }
});
