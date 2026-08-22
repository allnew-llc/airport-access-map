const LOCALE_KEY = "narita-chiba-map-locale";
const CONSENT_KEY = "airport-access-demo-terms-v4";
const RETURN_KEY = "airport-access-demo-return";
const supported = ["ja", "en", "zh-CN", "zh-TW", "ko"];

const copy = {
  ja: {
    language: "言語", title: "空港周辺の交通・気象情報をまとめて確認", lead: "鉄道・バス・道路の運行・規制と気象情報を、空港ごとに確認できるオープンソースWebアプリです。",
    problemLabel: "これまで（複数の公式サイト）", sourceRailLong: "鉄道運行情報", sourceBusLong: "バス運行情報", sourceRoadLong: "道路交通情報", sourceWeatherLong: "気象情報",
    airportName: "成田国際空港（NRT）", sourceRail: "鉄道", sourceBus: "バス", sourceRoad: "道路", sourceWeather: "気象", statusNormal: "平常運転", statusDelay: "一部遅延", statusRoad: "通行規制", statusWeather: "大雨警戒", impactText: "移動への影響：一部あり",
    storyLabel: "開発者の想い", storyTitle: "情報を探し回った経験から始まりました", storyBody1: "公共交通機関の乱れに遭遇した際、運行状況や代替手段を知るために複数のサイトを行き来し、情報確認だけで多くの時間と労力がかかりました。この経験が出発点です。", storyBody2: "空港ごとに交通・気象情報を整理して多言語で届ける共通基盤があれば、利用者の判断を助け、事業者の案内対応やアクセス集中も軽減できます。このOSSを、そのためのたたき台として公開します。",
    proofAirports: "空港", proofAirportDetail: "国内主要空港をカバー", proofLanguages: "言語", proofLanguageDetail: "日本語・English・中文・한국어", proofHistory: "週間のデモ履歴", proofHistoryDetail: "時間変化も再生可能",
    noticeTitle: "本サービスはデモデータを使用しています", noticeText: "表示内容は実データではなく、機能確認用の架空サンプルです。", terms: "デモ利用規約", agreeSuffix: "に同意する", agree: "同意", privacy: "プライバシー"
  },
  en: {
    language: "Language", title: "Airport transport and weather in one view", lead: "Check train, bus, road and weather updates for each airport with this open-source web app.",
    problemLabel: "BEFORE: SEPARATE OFFICIAL SITES", sourceRailLong: "Rail status", sourceBusLong: "Bus status", sourceRoadLong: "Road traffic", sourceWeatherLong: "Weather",
    airportName: "Narita Airport (NRT)", sourceRail: "Rail", sourceBus: "Bus", sourceRoad: "Road", sourceWeather: "Weather", statusNormal: "Normal", statusDelay: "Delays", statusRoad: "Restricted", statusWeather: "Rain alert", impactText: "Travel impact: some disruption",
    storyLabel: "WHY WE BUILT IT", storyTitle: "It started with the burden of searching for answers", storyBody1: "During a public transport disruption, I had to move between several websites just to learn what was running and what alternatives remained. That burden became the starting point for this project.", storyBody2: "A shared, multilingual foundation for airport transport and weather could help travelers decide sooner while easing repeated enquiries and traffic to operator servers. This OSS is published as a practical starting point for that foundation.",
    proofAirports: "airports", proofAirportDetail: "Major Japanese airports", proofLanguages: "languages", proofLanguageDetail: "JA / EN / ZH / KO", proofHistory: "week of demo history", proofHistoryDetail: "Replay changes",
    noticeTitle: "Uses demo data", noticeText: "Fictional samples, not live conditions.", terms: "Demo Terms", agreeSuffix: " — I agree", agree: "Agree", privacy: "Privacy"
  },
  "zh-CN": {
    language: "语言", title: "机场周边交通与气象信息，一站式查看。", lead: "可按机场查看铁路、巴士、道路运行与管制状况以及气象信息的开源软件。",
    problemLabel: "以往（多个官方网站）", sourceRailLong: "铁路运行信息", sourceBusLong: "巴士运行信息", sourceRoadLong: "道路交通信息", sourceWeatherLong: "气象信息",
    airportName: "成田国际机场（NRT）", sourceRail: "铁路", sourceBus: "巴士", sourceRoad: "道路", sourceWeather: "气象", statusNormal: "正常运行", statusDelay: "部分延误", statusRoad: "交通管制", statusWeather: "暴雨警戒", impactText: "对出行的影响：部分受影响",
    storyLabel: "开发者的初衷", storyTitle: "源于一次四处查找信息的经历", storyBody1: "遇到公共交通中断时，为了确认哪些线路仍在运行、还有哪些替代方式，我不得不反复查看多个网站。这种信息确认负担成为本项目的起点。", storyBody2: "如果业界能建立一个按机场整理交通和气象信息并提供多语言服务的共享基础，就能帮助旅客更快作出判断，也能减轻运营方的重复咨询和访问集中负担。本项目为此提供一个开放的起点。",
    proofAirports: "个机场", proofAirportDetail: "覆盖日本主要机场", proofLanguages: "种语言", proofLanguageDetail: "日语・English・中文・한국어", proofHistory: "周演示历史", proofHistoryDetail: "可回放时间变化",
    noticeTitle: "本服务使用演示数据", noticeText: "显示内容并非实时数据，而是功能确认用的虚构示例。", terms: "演示使用条款", agreeSuffix: "，我同意", agree: "同意", privacy: "隐私"
  },
  "zh-TW": {
    language: "語言", title: "機場周邊交通與氣象資訊，一站式掌握。", lead: "可按機場查看鐵路、巴士、道路運行與管制狀況以及氣象資訊的開源軟體。",
    problemLabel: "以往（多個官方網站）", sourceRailLong: "鐵路運行資訊", sourceBusLong: "巴士運行資訊", sourceRoadLong: "道路交通資訊", sourceWeatherLong: "氣象資訊",
    airportName: "成田國際機場（NRT）", sourceRail: "鐵路", sourceBus: "巴士", sourceRoad: "道路", sourceWeather: "氣象", statusNormal: "正常運行", statusDelay: "部分延誤", statusRoad: "交通管制", statusWeather: "大雨警戒", impactText: "對移動的影響：部分受影響",
    storyLabel: "開發者的初衷", storyTitle: "源於一次四處查找資訊的經歷", storyBody1: "遇到公共交通中斷時，為了確認哪些路線仍在運行、還有哪些替代方式，我不得不反覆查看多個網站。這種資訊確認負擔成為本專案的起點。", storyBody2: "如果業界能建立一個按機場整理交通和氣象資訊並提供多語言服務的共享基礎，就能幫助旅客更快作出判斷，也能減輕營運方的重複諮詢和存取集中負擔。本專案為此提供一個開放的起點。",
    proofAirports: "座機場", proofAirportDetail: "涵蓋日本主要機場", proofLanguages: "種語言", proofLanguageDetail: "日語・English・中文・한국어", proofHistory: "週示範歷史", proofHistoryDetail: "可重播時間變化",
    noticeTitle: "本服務使用示範資料", noticeText: "顯示內容並非即時資料，而是功能確認用的虛構示範。", terms: "示範使用條款", agreeSuffix: "，我同意", agree: "同意", privacy: "隱私"
  },
  ko: {
    language: "언어", title: "공항 주변 교통·기상 정보를 한곳에서.", lead: "철도·버스·도로 운행 및 통제 상황과 기상 정보를 공항별로 확인할 수 있는 오픈 소스 소프트웨어입니다.",
    problemLabel: "기존(여러 공식 사이트)", sourceRailLong: "철도 운행 정보", sourceBusLong: "버스 운행 정보", sourceRoadLong: "도로 교통 정보", sourceWeatherLong: "기상 정보",
    airportName: "나리타 국제공항(NRT)", sourceRail: "철도", sourceBus: "버스", sourceRoad: "도로", sourceWeather: "기상", statusNormal: "정상 운행", statusDelay: "일부 지연", statusRoad: "통행 규제", statusWeather: "호우 경계", impactText: "이동 영향: 일부 있음",
    storyLabel: "개발자의 생각", storyTitle: "필요한 정보를 찾아 헤맨 경험에서 시작했습니다", storyBody1: "대중교통 운행에 차질이 생겼을 때 어떤 교통편이 운행 중인지, 다른 방법은 있는지 확인하려고 여러 웹사이트를 반복해서 살펴봐야 했습니다. 이 정보 확인 부담이 프로젝트의 출발점입니다.", storyBody2: "공항별 교통·기상 정보를 여러 언어로 전달하는 공통 기반이 업계에 마련된다면 이용자의 판단을 돕고, 운영자의 반복 문의와 접속 집중 부담도 줄일 수 있습니다. 이 오픈 소스 프로젝트를 그 기반을 위한 출발점으로 공개합니다.",
    proofAirports: "개 공항", proofAirportDetail: "일본 주요 공항 지원", proofLanguages: "개 언어", proofLanguageDetail: "日本語・English・中文・한국어", proofHistory: "주 데모 기록", proofHistoryDetail: "시간 변화도 재생 가능",
    noticeTitle: "본 서비스는 데모 데이터를 사용합니다", noticeText: "표시 내용은 실제 데이터가 아닌 기능 확인용 가상 샘플입니다.", terms: "데모 이용약관", agreeSuffix: "에 동의합니다", agree: "동의", privacy: "개인정보"
  }
};

function resolveLocale(value) {
  if (supported.includes(value)) return value;
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) return "zh-TW";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("en")) return "en";
  return "ja";
}

function setLocale(value) {
  const locale = resolveLocale(value);
  document.documentElement.lang = locale;
  document.querySelector("#intro-language").value = locale;
  for (const node of document.querySelectorAll("[data-copy]")) node.textContent = copy[locale][node.dataset.copy];
  try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* optional */ }
}

const checkbox = document.querySelector("#demo-consent-check");
const submit = document.querySelector("#demo-consent-submit");
checkbox.addEventListener("change", () => { submit.disabled = !checkbox.checked; });
document.querySelector("#intro-language").addEventListener("change", (event) => setLocale(event.target.value));
document.querySelector("#demo-consent-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!checkbox.checked) return;
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 4, accepted_at: new Date().toISOString() })); } catch { /* optional */ }
  let destination = "./app.html";
  try {
    const storedReturn = sessionStorage.getItem(RETURN_KEY);
    if (storedReturn?.startsWith("app.html")) destination = `./${storedReturn}`;
    sessionStorage.removeItem(RETURN_KEY);
  } catch { /* optional */ }
  const destinationUrl = new URL(destination, document.baseURI);
  destinationUrl.searchParams.set("lang", document.documentElement.lang);
  globalThis.location.assign(destinationUrl);
});

let storedLocale;
try { storedLocale = localStorage.getItem(LOCALE_KEY); } catch { /* optional */ }
const requestedLocale = new URLSearchParams(globalThis.location.search).get("lang");
setLocale(requestedLocale ?? storedLocale ?? navigator.language);
