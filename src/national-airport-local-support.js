const localized = (ja, en, zhCN = en, zhTW = zhCN, ko = en) => Object.freeze({
  ja,
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ko
});

const JNTO_VISITOR_SUPPORT = "https://www.japan.travel/en/plan/emergencies/";

const support = ({ municipality, disaster, shelter, multilingual = JNTO_VISITOR_SUPPORT }) => Object.freeze({
  municipality,
  disaster,
  shelter,
  multilingual,
  checkedAt: "2026-08-17",
  sourcePolicy: "official_link_only"
});

// 空港旅客ターミナルの所在地を基準にした自治体公式の防災・避難所導線。
// 避難所は常時開設されているとは限らないため、施設名や開設状態を再配信せず、
// 利用者が自治体の最新発表を直接確認できるリンクとして扱う。
export const NATIONAL_AIRPORT_LOCAL_SUPPORT = Object.freeze({
  obo: support({
    municipality: localized("帯広市", "Obihiro City"),
    disaster: "https://www.city.obihiro.hokkaido.jp/kurashi/bousai/index.html",
    shelter: "https://www.city.obihiro.hokkaido.jp/kurashi/bousai/1007324/1002242.html"
  }),
  cts: support({
    municipality: localized("千歳市", "Chitose City"),
    disaster: "https://www.city.chitose.lg.jp/c50/1002703/index.html",
    shelter: "https://www.city.chitose.lg.jp/c50/1002703/1002705/1005103.html"
  }),
  hkd: support({
    municipality: localized("函館市", "Hakodate City"),
    disaster: "https://www.city.hakodate.hokkaido.jp/docs/2021110200164/",
    shelter: "https://www.city.hakodate.hokkaido.jp/docs/2016051600074/"
  }),
  aoj: support({
    municipality: localized("青森市", "Aomori City"),
    disaster: "https://www.city.aomori.aomori.jp/anzen_kinkyu/bousai_shoubou/",
    shelter: "https://www.city.aomori.aomori.jp/anzen_kinkyu/bousai_shoubou/1002619/1002622.html"
  }),
  hna: support({
    municipality: localized("花巻市", "Hanamaki City"),
    disaster: "https://www.city.hanamaki.iwate.jp/kurashi/anshin_anzen/bousai_saigai/index.html",
    shelter: "https://www.city.hanamaki.iwate.jp/kurashi/anshin_anzen/bousai_saigai/1007078/index.html"
  }),
  sdj: support({
    municipality: localized("名取市", "Natori City"),
    disaster: "https://www.city.natori.miyagi.jp/site/bousai-keiiban/",
    shelter: "https://www.city.natori.miyagi.jp/site/bousai-keiiban/24982.html"
  }),
  hnd: support({
    municipality: localized("大田区", "Ota City"),
    disaster: "https://www.city.ota.tokyo.jp/koujiya_haneda/bousai/index.html",
    shelter: "https://www.city.ota.tokyo.jp/koujiya_haneda/bousai/index.html"
  }),
  kij: support({
    municipality: localized("新潟市", "Niigata City"),
    disaster: "https://www.city.niigata.lg.jp/kurashi/bosai/",
    shelter: "https://www.city.niigata.lg.jp/kurashi/bosai/hinanjo/hinanjo.html"
  }),
  toy: support({
    municipality: localized("富山市", "Toyama City"),
    disaster: "https://www.city.toyama.lg.jp/bosai/bosai/1010655/index.html",
    shelter: "https://www.city.toyama.lg.jp/bosai/bosai/1010655/1010656/1007904.html"
  }),
  kmq: support({
    municipality: localized("小松市", "Komatsu City"),
    disaster: "https://www.city.komatsu.lg.jp/kurasi_tetuzuki/bosai_kyukyu/",
    shelter: "https://www.city.komatsu.lg.jp/kurasi_tetuzuki/bosai_kyukyu/1/3/7216.html"
  }),
  fsz: support({
    municipality: localized("牧之原市", "Makinohara City"),
    disaster: "https://www.city.makinohara.shizuoka.jp/life/5/22/",
    shelter: "https://www.city.makinohara.shizuoka.jp/life/5/22/103/index.html"
  }),
  ngo: support({
    municipality: localized("常滑市", "Tokoname City"),
    disaster: "https://www.city.tokoname.aichi.jp/kurashi/bousai/index.html",
    shelter: "https://www.city.tokoname.aichi.jp/kurashi/bousai/1003742/1003743.html"
  }),
  kix: support({
    municipality: localized("泉佐野市", "Izumisano City"),
    disaster: "https://www.city.izumisano.lg.jp/kakuka/kikikanri/bousai/menu/bou/index.html",
    shelter: "https://www.city.izumisano.lg.jp/kakuka/kikikanri/bousai/menu/bou/index.html"
  }),
  okj: support({
    municipality: localized("岡山市", "Okayama City"),
    disaster: "https://www.city.okayama.jp/kurashi/0000011520.html",
    shelter: "https://www.city.okayama.jp/0000011516.html"
  }),
  hij: support({
    municipality: localized("三原市", "Mihara City"),
    disaster: "https://www.city.mihara.hiroshima.jp/soshiki/19/index.html",
    shelter: "https://www.city.mihara.hiroshima.jp/soshiki/19/120225.html"
  }),
  ygj: support({
    municipality: localized("境港市", "Sakaiminato City"),
    disaster: "https://www.city.sakaiminato.lg.jp/index.php?view=106852",
    shelter: "https://www.city.sakaiminato.lg.jp/index.php?view=106852"
  }),
  tks: support({
    municipality: localized("松茂町", "Matsushige Town"),
    disaster: "https://www.town.matsushige.tokushima.jp/docs/2026032900024/",
    shelter: "https://www.town.matsushige.tokushima.jp/docs/2026032900024/"
  }),
  myj: support({
    municipality: localized("松山市", "Matsuyama City"),
    disaster: "https://www.city.matsuyama.ehime.jp/kurashi/bosai/bousai/index.html",
    shelter: "https://www.city.matsuyama.ehime.jp/kurashi/bosai/bousai/hinansyo/index.html"
  }),
  kkj: support({
    municipality: localized("北九州市", "Kitakyushu City"),
    disaster: "https://www.city.kitakyushu.lg.jp/contents/13801050.html",
    shelter: "https://www.city.kitakyushu.lg.jp/contents/13801050.html"
  }),
  fuk: support({
    municipality: localized("福岡市", "Fukuoka City"),
    disaster: "https://www.city.fukuoka.lg.jp/bousai/hinanmain.html",
    shelter: "https://www.city.fukuoka.lg.jp/bousai/shiteihinannbasyooyobishiteihinannjyoitirann.html"
  }),
  hsg: support({
    municipality: localized("佐賀市", "Saga City"),
    disaster: "https://www.city.saga.lg.jp/bosai-anzen/bosai/3/1136.html",
    shelter: "https://www.city.saga.lg.jp/bosai-anzen/bosai/2/3575.html"
  }),
  ngs: support({
    municipality: localized("大村市", "Omura City"),
    disaster: "https://www.city.omura.nagasaki.jp/kurashi/anzen/bosai/index.html",
    shelter: "https://www.city.omura.nagasaki.jp/bousai/kurashi/anzen/bosai/hinanjo.html"
  }),
  oit: support({
    municipality: localized("国東市", "Kunisaki City"),
    disaster: "https://www.city.kunisaki.oita.jp/soshiki/kikikanri/index.html",
    shelter: "https://www.city.kunisaki.oita.jp/soshiki/kikikanri/hinanbasyo.html"
  }),
  kmj: support({
    municipality: localized("益城町", "Mashiki Town"),
    disaster: "https://www.town.mashiki.lg.jp/bousai/",
    shelter: "https://www.town.mashiki.lg.jp/bousai/list01037.html"
  }),
  kmi: support({
    municipality: localized("宮崎市", "Miyazaki City"),
    disaster: "https://www.city.miyazaki.miyazaki.jp/evacuation_site.html",
    shelter: "https://www.city.miyazaki.miyazaki.jp/e_shelter/list/item413/"
  }),
  koj: support({
    municipality: localized("霧島市", "Kirishima City"),
    disaster: "https://www.city-kirishima.jp/anshin/ooame.html",
    shelter: "https://www.city-kirishima.jp/anshin/shobo/bosai/hinanbasho/mizobe.html"
  }),
  oka: support({
    municipality: localized("那覇市", "Naha City"),
    disaster: "https://www.city.naha.okinawa.jp/safety/saigai/1001598/index.html",
    shelter: "https://www.city.naha.okinawa.jp/kurasitetuduki/soudan/1002347/1008499.html",
    multilingual: "https://www.city.naha.okinawa.jp/kurasitetuduki/soudan/1002347/1008499.html"
  }),
  shi: support({
    municipality: localized("宮古島市", "Miyakojima City"),
    disaster: "https://www.city.miyakojima.lg.jp/website/saigaijyouhou/",
    shelter: "https://www.city.miyakojima.lg.jp/kurashi/bousai/bousaijyouhou/bousaimap.html"
  }),
  isg: support({
    municipality: localized("石垣市", "Ishigaki City"),
    disaster: "https://www.city.ishigaki.okinawa.jp/kurashi_gyosei/kurashi/anshin_anzen/bosai/index.html",
    shelter: "https://www.city.ishigaki.okinawa.jp/soshiki/1/2/info_taihu/1328.html"
  })
});

export const VISITOR_EMERGENCY_SUPPORT = JNTO_VISITOR_SUPPORT;
