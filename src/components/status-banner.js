export function updateStatusBanner(metadata, i18n) {
  const banner = document.querySelector("#status-banner");
  const dot = document.querySelector("#andon-dot");
  const label = document.querySelector("#andon-label");
  const updated = document.querySelector("#updated-at");
  const notice = document.querySelector("#demo-notice");
  const noticeTitle = notice.querySelector("strong");
  const noticeText = notice.querySelector("span");
  const isReplay = metadata.mode === "historical_replay";
  const isDemo = metadata.mode === "demo" || metadata.mode === "mixed";
  const generatedAt = Date.parse(metadata.generated_at);
  const isStale = !isReplay && !isDemo && Number.isFinite(generatedAt) && Date.now() - generatedAt > 30 * 60 * 1000;

  banner.dataset.state = isReplay ? "replay" : isDemo ? "demo" : isStale ? "stale" : "normal";
  dot.className = `andon-dot ${isDemo || isReplay || isStale ? "is-demo" : "is-normal"}`;
  label.textContent = i18n.t(isReplay ? "andonReplay" : isDemo ? "andonDemo" : isStale ? "staleStatusLabel" : "andonVerified");
  updated.dateTime = metadata.generated_at;
  updated.textContent = i18n.t("updatedAt", { date: i18n.formatDate(metadata.generated_at) });
  notice.hidden = !isDemo && !isReplay;
  noticeTitle.textContent = i18n.t(isReplay ? "historyDemoTitle" : "demoTitle");
  noticeText.textContent = i18n.t(isReplay ? "historyDemoText" : "demoNotice");
}

export function showStatusError(message, i18n) {
  const banner = document.querySelector("#status-banner");
  const dot = document.querySelector("#andon-dot");
  const label = document.querySelector("#andon-label");
  const updated = document.querySelector("#updated-at");
  banner.dataset.state = "blocked";
  dot.className = "andon-dot is-blocked";
  label.textContent = i18n.t("andonBlocked");
  updated.textContent = message;
}
