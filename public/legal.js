const STORAGE_KEY = "narita-chiba-map-locale";
const supported = ["ja", "en", "zh-CN", "zh-TW", "ko"];

function resolveLocale(value) {
  if (supported.includes(value)) return value;
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) return "zh-TW";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("en")) return "en";
  return "ja";
}

function setLocale(nextLocale) {
  const locale = resolveLocale(nextLocale);
  document.documentElement.lang = locale;
  for (const panel of document.querySelectorAll("[data-legal-locale]")) {
    panel.hidden = panel.dataset.legalLocale !== locale;
  }
  for (const button of document.querySelectorAll("[data-legal-language]")) {
    const active = button.dataset.legalLanguage === locale;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  try { globalThis.localStorage?.setItem(STORAGE_KEY, locale); } catch { /* optional */ }
}

for (const button of document.querySelectorAll("[data-legal-language]")) {
  button.addEventListener("click", () => setLocale(button.dataset.legalLanguage));
}

let storedLocale;
try { storedLocale = globalThis.localStorage?.getItem(STORAGE_KEY); } catch { /* optional */ }
setLocale(storedLocale ?? navigator.language);
