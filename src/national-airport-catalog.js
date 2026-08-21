import { NATIONAL_AIRPORT_LOCAL_SUPPORT } from "./national-airport-local-support.js";

const localized = (ja, en, zhCN = en, zhTW = zhCN, ko = en) => Object.freeze({
  ja,
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ko
});

const MLIT_2026_SUMMER_DIRECT = "https://www.mlit.go.jp/koku/content/002000598.pdf";

const airport = ({
  id,
  code,
  region,
  name,
  airportCoordinate,
  gateway,
  gatewayCoordinate,
  home,
  flight,
  access,
  weeklyFlights
}) => {
  const localSupport = NATIONAL_AIRPORT_LOCAL_SUPPORT[id];
  if (!localSupport) throw new Error(`Missing local support configuration for ${code}`);
  return Object.freeze({
    id,
    code,
    region,
    name,
    airport: airportCoordinate,
    gateway: Object.freeze({ coordinate: gatewayCoordinate, label: gateway }),
    home,
    flight,
    access,
    localSupport,
    directFlights: Object.freeze({
      source: MLIT_2026_SUMMER_DIRECT,
      checkedAt: "2026-08-17",
      schedule: "2026-03-29/2026-10-24",
      weeklyFlights
    })
  });
};

// 国土交通省「2026年夏ダイヤ 国際定期便（直行便）」掲載空港のうち、
// NRT / TAK / IBR（既存設定）を除く空港。AKJは利用者指定により別設定で維持する。
export const NATIONAL_AIRPORT_CATALOG = Object.freeze([
  airport({
    id: "obo", code: "OBO", region: "hokkaido",
    name: localized("とかち帯広空港", "Tokachi-Obihiro Airport", "带广机场", "帶廣機場", "오비히로공항"),
    airportCoordinate: [143.2172, 42.7333],
    gateway: localized("帯広駅", "Obihiro Station"), gatewayCoordinate: [143.2044, 42.9177],
    home: "https://www.hokkaido-airports.com/ja/obihiro/",
    flight: "https://www.hokkaido-airports.com/ja/obihiro/airport/time/",
    access: "https://www.hokkaido-airports.com/ja/obihiro/access/",
    weeklyFlights: 2
  }),
  airport({
    id: "cts", code: "CTS", region: "hokkaido",
    name: localized("新千歳空港", "New Chitose Airport", "新千岁机场", "新千歲機場", "신치토세공항"),
    airportCoordinate: [141.6923, 42.7752],
    gateway: localized("札幌駅", "Sapporo Station", "札幌站", "札幌站", "삿포로역"), gatewayCoordinate: [141.3508, 43.0687],
    home: "https://www.hokkaido-airports.com/ja/new-chitose/",
    flight: "https://www.hokkaido-airports.com/ja/new-chitose/airport/time/",
    access: "https://www.hokkaido-airports.com/ja/new-chitose/access/",
    weeklyFlights: 130
  }),
  airport({
    id: "hkd", code: "HKD", region: "hokkaido",
    name: localized("函館空港", "Hakodate Airport", "函馆机场", "函館機場", "하코다테공항"),
    airportCoordinate: [140.8222, 41.7700],
    gateway: localized("函館駅", "Hakodate Station"), gatewayCoordinate: [140.7264, 41.7737],
    home: "https://www.hokkaido-airports.com/ja/hakodate/",
    flight: "https://www.hokkaido-airports.com/ja/hakodate/airport/time/",
    access: "https://www.hokkaido-airports.com/ja/hakodate/access/",
    weeklyFlights: 12
  }),
  airport({
    id: "aoj", code: "AOJ", region: "tohoku",
    name: localized("青森空港", "Aomori Airport", "青森机场", "青森機場", "아오모리공항"),
    airportCoordinate: [140.6908, 40.7347],
    gateway: localized("青森駅", "Aomori Station"), gatewayCoordinate: [140.7347, 40.8287],
    home: "https://www.aomori-airport.co.jp/",
    flight: "https://www.aomori-airport.co.jp/flight",
    access: "https://www.aomori-airport.co.jp/access",
    weeklyFlights: 12
  }),
  airport({
    id: "hna", code: "HNA", region: "tohoku",
    name: localized("いわて花巻空港", "Iwate Hanamaki Airport", "花卷机场", "花卷機場", "하나마키공항"),
    airportCoordinate: [141.1353, 39.4286],
    gateway: localized("盛岡駅", "Morioka Station"), gatewayCoordinate: [141.1366, 39.7017],
    home: "https://www.hna-terminal.co.jp/",
    flight: "https://www.hna-terminal.co.jp/international-flight/",
    access: "https://www.hna-terminal.co.jp/access/",
    weeklyFlights: 2
  }),
  airport({
    id: "sdj", code: "SDJ", region: "tohoku",
    name: localized("仙台空港", "Sendai Airport", "仙台机场", "仙台機場", "센다이공항"),
    airportCoordinate: [140.9169, 38.1397],
    gateway: localized("仙台駅", "Sendai Station"), gatewayCoordinate: [140.8824, 38.2601],
    home: "https://www.sendai-airport.co.jp/",
    flight: "https://www.sendai-airport.co.jp/flight/",
    access: "https://www.sendai-airport.co.jp/access/",
    weeklyFlights: 35
  }),
  airport({
    id: "hnd", code: "HND", region: "kanto",
    name: localized("羽田空港", "Tokyo Haneda Airport", "羽田机场", "羽田機場", "하네다공항"),
    airportCoordinate: [139.7798, 35.5494],
    gateway: localized("東京駅", "Tokyo Station", "东京站", "東京站", "도쿄역"), gatewayCoordinate: [139.7671, 35.6812],
    home: "https://tokyo-haneda.com/index.html",
    flight: "https://tokyo-haneda.com/flight/index.html",
    access: "https://tokyo-haneda.com/access/index.html",
    weeklyFlights: 1120
  }),
  airport({
    id: "kij", code: "KIJ", region: "hokuriku",
    name: localized("新潟空港", "Niigata Airport", "新潟机场", "新潟機場", "니가타공항"),
    airportCoordinate: [139.1207, 37.9559],
    gateway: localized("新潟駅", "Niigata Station"), gatewayCoordinate: [139.0619, 37.9120],
    home: "https://www.niigata-airport.gr.jp/",
    flight: "https://www.niigata-airport.gr.jp/flight/",
    access: "https://www.niigata-airport.gr.jp/access/",
    weeklyFlights: 5
  }),
  airport({
    id: "toy", code: "TOY", region: "hokuriku",
    name: localized("富山空港", "Toyama Airport", "富山机场", "富山機場", "도야마공항"),
    airportCoordinate: [137.1878, 36.6483],
    gateway: localized("富山駅", "Toyama Station"), gatewayCoordinate: [137.2137, 36.7014],
    home: "https://www.toyama-airport.jp/",
    flight: "https://www.toyama-airport.jp/flight",
    access: "https://www.toyama-airport.jp/access",
    weeklyFlights: 2
  }),
  airport({
    id: "kmq", code: "KMQ", region: "hokuriku",
    name: localized("小松空港", "Komatsu Airport", "小松机场", "小松機場", "고마쓰공항"),
    airportCoordinate: [136.4066, 36.3946],
    gateway: localized("金沢駅", "Kanazawa Station"), gatewayCoordinate: [136.6486, 36.5781],
    home: "https://www.komatsuairport.jp/",
    flight: "https://www.komatsuairport.jp/flight/",
    access: "https://www.komatsuairport.jp/access/",
    weeklyFlights: 19
  }),
  airport({
    id: "fsz", code: "FSZ", region: "tokai",
    name: localized("富士山静岡空港", "Mt. Fuji Shizuoka Airport", "静冈机场", "靜岡機場", "시즈오카공항"),
    airportCoordinate: [138.1894, 34.7960],
    gateway: localized("静岡駅", "Shizuoka Station"), gatewayCoordinate: [138.3891, 34.9717],
    home: "https://www.mtfuji-shizuokaairport.jp/",
    flight: "https://www.mtfuji-shizuokaairport.jp/timetable/",
    access: "https://www.mtfuji-shizuokaairport.jp/access/",
    weeklyFlights: 17
  }),
  airport({
    id: "ngo", code: "NGO", region: "tokai",
    name: localized("中部国際空港", "Chubu Centrair International Airport", "中部国际机场", "中部國際機場", "주부국제공항"),
    airportCoordinate: [136.8054, 34.8584],
    gateway: localized("名古屋駅", "Nagoya Station"), gatewayCoordinate: [136.8815, 35.1709],
    home: "https://www.centrair.jp/",
    flight: "https://www.centrair.jp/flight/",
    access: "https://www.centrair.jp/access/",
    weeklyFlights: 248
  }),
  airport({
    id: "kix", code: "KIX", region: "kansai",
    name: localized("関西国際空港", "Kansai International Airport", "关西国际机场", "關西國際機場", "간사이국제공항"),
    airportCoordinate: [135.2441, 34.4347],
    gateway: localized("大阪駅", "Osaka Station"), gatewayCoordinate: [135.4959, 34.7025],
    home: "https://www.kansai-airport.or.jp/",
    flight: "https://www.kansai-airport.or.jp/flight/search",
    access: "https://www.kansai-airport.or.jp/access/from-airport",
    weeklyFlights: 1219
  }),
  airport({
    id: "okj", code: "OKJ", region: "chugoku",
    name: localized("岡山桃太郎空港", "Okayama Momotaro Airport", "冈山机场", "岡山機場", "오카야마공항"),
    airportCoordinate: [133.8553, 34.7569],
    gateway: localized("岡山駅", "Okayama Station"), gatewayCoordinate: [133.9195, 34.6663],
    home: "https://www.okayama-airport.org/",
    flight: "https://www.okayama-airport.org/flight",
    access: "https://www.okayama-airport.org/access",
    weeklyFlights: 13
  }),
  airport({
    id: "hij", code: "HIJ", region: "chugoku",
    name: localized("広島空港", "Hiroshima Airport", "广岛机场", "廣島機場", "히로시마공항"),
    airportCoordinate: [132.9194, 34.4361],
    gateway: localized("広島駅", "Hiroshima Station"), gatewayCoordinate: [132.4753, 34.3974],
    home: "https://www.hij.airport.jp/",
    flight: "https://www.hij.airport.jp/flight/",
    access: "https://www.hij.airport.jp/access/",
    weeklyFlights: 32
  }),
  airport({
    id: "ygj", code: "YGJ", region: "chugoku",
    name: localized("米子鬼太郎空港", "Yonago Kitaro Airport", "米子机场", "米子機場", "요나고공항"),
    airportCoordinate: [133.2364, 35.4922],
    gateway: localized("米子駅", "Yonago Station"), gatewayCoordinate: [133.3315, 35.4233],
    home: "https://www.yonago-air.com/",
    flight: "https://www.yonago-air.com/flight",
    access: "https://www.yonago-air.com/access",
    weeklyFlights: 5
  }),
  airport({
    id: "tks", code: "TKS", region: "shikoku",
    name: localized("徳島阿波おどり空港", "Tokushima Awaodori Airport", "德岛机场", "德島機場", "도쿠시마공항"),
    airportCoordinate: [134.5946, 34.1328],
    gateway: localized("徳島駅", "Tokushima Station"), gatewayCoordinate: [134.5514, 34.0742],
    home: "https://www.tokushima-airport.co.jp/",
    flight: "https://www.tokushima-airport.co.jp/flight/",
    access: "https://www.tokushima-airport.co.jp/access/",
    weeklyFlights: 3
  }),
  airport({
    id: "myj", code: "MYJ", region: "shikoku",
    name: localized("松山空港", "Matsuyama Airport", "松山机场", "松山機場", "마쓰야마공항"),
    airportCoordinate: [132.6997, 33.8272],
    gateway: localized("松山駅", "Matsuyama Station"), gatewayCoordinate: [132.7515, 33.8393],
    home: "https://www.matsuyama-airport.co.jp/",
    flight: "https://www.matsuyama-airport.co.jp/flight/",
    access: "https://www.matsuyama-airport.co.jp/access/",
    weeklyFlights: 26
  }),
  airport({
    id: "kkj", code: "KKJ", region: "kyushu",
    name: localized("北九州空港", "Kitakyushu Airport", "北九州机场", "北九州機場", "기타큐슈공항"),
    airportCoordinate: [131.0347, 33.8459],
    gateway: localized("小倉駅", "Kokura Station"), gatewayCoordinate: [130.8834, 33.8869],
    home: "https://www.kitakyu-air.jp/",
    flight: "https://www.kitakyu-air.jp/rev-boarding/timetable.php",
    access: "https://www.kitakyu-air.jp/rev-access/rev-access.php",
    weeklyFlights: 10
  }),
  airport({
    id: "fuk", code: "FUK", region: "kyushu",
    name: localized("福岡空港", "Fukuoka Airport", "福冈机场", "福岡機場", "후쿠오카공항"),
    airportCoordinate: [130.4517, 33.5859],
    gateway: localized("博多駅", "Hakata Station"), gatewayCoordinate: [130.4207, 33.5902],
    home: "https://www.fukuoka-airport.jp/",
    flight: "https://www.fukuoka-airport.jp/flight/",
    access: "https://www.fukuoka-airport.jp/access/",
    weeklyFlights: 503
  }),
  airport({
    id: "hsg", code: "HSG", region: "kyushu",
    name: localized("九州佐賀国際空港", "Kyushu Saga International Airport", "佐贺机场", "佐賀機場", "사가공항"),
    airportCoordinate: [130.3020, 33.1497],
    gateway: localized("佐賀駅", "Saga Station"), gatewayCoordinate: [130.2988, 33.2646],
    home: "https://www.pref.saga.lg.jp/airport/",
    flight: "https://www.pref.saga.lg.jp/airport/",
    access: "https://www.pref.saga.lg.jp/airport/",
    weeklyFlights: 7
  }),
  airport({
    id: "ngs", code: "NGS", region: "kyushu",
    name: localized("長崎空港", "Nagasaki Airport", "长崎机场", "長崎機場", "나가사키공항"),
    airportCoordinate: [129.9136, 32.9169],
    gateway: localized("長崎駅", "Nagasaki Station"), gatewayCoordinate: [129.8737, 32.7520],
    home: "https://nagasaki-airport.jp/",
    flight: "https://nagasaki-airport.jp/flight/",
    access: "https://nagasaki-airport.jp/access/",
    weeklyFlights: 8
  }),
  airport({
    id: "oit", code: "OIT", region: "kyushu",
    name: localized("大分空港", "Oita Airport", "大分机场", "大分機場", "오이타공항"),
    airportCoordinate: [131.7367, 33.4794],
    gateway: localized("大分駅", "Oita Station"), gatewayCoordinate: [131.6063, 33.2333],
    home: "https://www.oita-airport.jp/",
    flight: "https://www.oita-airport.jp/timetable/",
    access: "https://www.oita-airport.jp/access/",
    weeklyFlights: 3
  }),
  airport({
    id: "kmj", code: "KMJ", region: "kyushu",
    name: localized("阿蘇くまもと空港", "Aso Kumamoto Airport", "熊本机场", "熊本機場", "구마모토공항"),
    airportCoordinate: [130.8551, 32.8373],
    gateway: localized("熊本駅", "Kumamoto Station"), gatewayCoordinate: [130.6890, 32.7900],
    home: "https://www.kumamoto-airport.co.jp/",
    flight: "https://www.kumamoto-airport.co.jp/flight-int/",
    access: "https://www.kumamoto-airport.co.jp/access/",
    weeklyFlights: 37
  }),
  airport({
    id: "kmi", code: "KMI", region: "kyushu",
    name: localized("宮崎ブーゲンビリア空港", "Miyazaki Bougainvillea Airport", "宫崎机场", "宮崎機場", "미야자키공항"),
    airportCoordinate: [131.4486, 31.8772],
    gateway: localized("宮崎駅", "Miyazaki Station"), gatewayCoordinate: [131.4319, 31.9157],
    home: "https://www.miyazaki-airport.co.jp/",
    flight: "https://www.miyazaki-airport.co.jp/flight",
    access: "https://www.miyazaki-airport.co.jp/access",
    weeklyFlights: 5
  }),
  airport({
    id: "koj", code: "KOJ", region: "kyushu",
    name: localized("鹿児島空港", "Kagoshima Airport", "鹿儿岛机场", "鹿兒島機場", "가고시마공항"),
    airportCoordinate: [130.7194, 31.8034],
    gateway: localized("鹿児島中央駅", "Kagoshima-Chuo Station"), gatewayCoordinate: [130.5411, 31.5839],
    home: "https://www.koj-ab.co.jp/",
    flight: "https://www.koj-ab.co.jp/flight/today-int-departure.html",
    access: "https://www.koj-ab.co.jp/ground-transportation/access.html",
    weeklyFlights: 11
  }),
  airport({
    id: "oka", code: "OKA", region: "okinawa",
    name: localized("那覇空港", "Naha Airport", "那霸机场", "那霸機場", "나하공항"),
    airportCoordinate: [127.6461, 26.1958],
    gateway: localized("旭橋駅・那覇バスターミナル", "Asahibashi / Naha Bus Terminal"), gatewayCoordinate: [127.6750, 26.2115],
    home: "https://www.naha-airport.co.jp/",
    flight: "https://www.naha-airport.co.jp/flight/",
    access: "https://www.naha-airport.co.jp/access/",
    weeklyFlights: 208
  }),
  airport({
    id: "shi", code: "SHI", region: "okinawa",
    name: localized("みやこ下地島空港", "Miyako Shimojishima Airport", "下地岛机场", "下地島機場", "시모지시마공항"),
    airportCoordinate: [125.1447, 24.8267],
    gateway: localized("平良市街地", "Hirara city center"), gatewayCoordinate: [125.2815, 24.8057],
    home: "https://shimojishima.jp/",
    flight: "https://shimojishima.jp/flight_top/",
    access: "https://shimojishima.jp/access_top/",
    weeklyFlights: 7.5
  }),
  airport({
    id: "isg", code: "ISG", region: "okinawa",
    name: localized("南ぬ島石垣空港", "Painushima Ishigaki Airport", "石垣机场", "石垣機場", "이시가키공항"),
    airportCoordinate: [124.2450, 24.3964],
    gateway: localized("石垣バスターミナル", "Ishigaki Bus Terminal"), gatewayCoordinate: [124.1556, 24.3368],
    home: "https://www.ishigaki-airport.co.jp/",
    flight: "https://www.ishigaki-airport.co.jp/fly/timetable/index.html",
    access: "https://www.ishigaki-airport.co.jp/access/index.html",
    weeklyFlights: 16
  })
]);

export const MLIT_DIRECT_FLIGHT_SOURCE = MLIT_2026_SUMMER_DIRECT;
