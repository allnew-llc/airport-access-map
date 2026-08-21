export const MAX_HISTORY_LOOKBACK_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET = "+09:00";

export class HistoryRangeError extends Error {
  constructor(code) {
    super(code);
    this.name = "HistoryRangeError";
    this.code = code;
  }
}

function parseIso(value, code = "historyRangeInvalid") {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new HistoryRangeError(code);
  return timestamp;
}

function isSampleHistoryIndex(index) {
  return index?.sample_data === true
    && index?.fictional === true
    && index?.not_for_travel_decisions === true;
}

export function validateHistoryIndex(index) {
  if (index?.schema_version !== "history-index/1" || index?.type !== "HistoryIndex") {
    throw new HistoryRangeError("historyRangeUnavailable");
  }
  if (index.time_zone !== "Asia/Tokyo" || index.retention_days !== MAX_HISTORY_LOOKBACK_DAYS) {
    throw new HistoryRangeError("historyRangeUnavailable");
  }
  const availableStart = parseIso(index.available_start, "historyRangeUnavailable");
  const availableEnd = parseIso(index.available_end, "historyRangeUnavailable");
  const sampleIndex = isSampleHistoryIndex(index);
  if (availableStart >= availableEnd || !Array.isArray(index.files) || index.files.length === 0) {
    throw new HistoryRangeError("historyRangeUnavailable");
  }
  if (!sampleIndex || availableEnd - availableStart > MAX_HISTORY_LOOKBACK_DAYS * DAY_MS) {
    throw new HistoryRangeError("historyRangeUnavailable");
  }
  let previousStart = -Infinity;
  for (const file of index.files) {
    const start = parseIso(file.period_start, "historyRangeUnavailable");
    const end = parseIso(file.period_end, "historyRangeUnavailable");
    if (start > end || start < previousStart || !/^history-[a-zA-Z0-9-]+\.json$/.test(file.path ?? "")) {
      throw new HistoryRangeError("historyRangeUnavailable");
    }
    if (file.format !== "sample-history/1") throw new HistoryRangeError("historyRangeUnavailable");
    if (!/^[a-f0-9]{64}$/.test(file.sha256 ?? "")) throw new HistoryRangeError("historyRangeUnavailable");
    previousStart = start;
  }
  return index;
}

export function historyBounds(index, now = Date.now()) {
  validateHistoryIndex(index);
  return {
    earliest: Date.parse(index.available_start),
    latest: Date.parse(index.available_end)
  };
}

export function parseJstDateTimeInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value ?? "")) {
    throw new HistoryRangeError("historyRangeInvalid");
  }
  return parseIso(`${value}:00${JST_OFFSET}`);
}

export function formatJstDateTimeInput(value) {
  const date = new Date(typeof value === "number" ? value : parseIso(value));
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo"
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function historyRangeToUrlValue(value) {
  return `${formatJstDateTimeInput(value)}:00${JST_OFFSET}`;
}

export function validateHistoryRange({ start, end }, index, now = Date.now()) {
  const startTime = typeof start === "number" ? start : parseIso(start);
  const endTime = typeof end === "number" ? end : parseIso(end);
  const { earliest, latest } = historyBounds(index, now);
  if (startTime >= endTime) throw new HistoryRangeError("historyRangeInvalidOrder");
  if (startTime < earliest || endTime > latest || endTime - startTime > MAX_HISTORY_LOOKBACK_DAYS * DAY_MS) {
    throw new HistoryRangeError("historyRangeOutsideRetention");
  }
  return { start: startTime, end: endTime };
}

export function defaultHistoryRange(index, now = Date.now()) {
  const { earliest, latest } = historyBounds(index, now);
  return { start: earliest, end: latest };
}

export function historyRangeFromSearch(searchParams, index, now = Date.now()) {
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) return defaultHistoryRange(index, now);
  try {
    return validateHistoryRange({ start, end }, index, now);
  } catch {
    return defaultHistoryRange(index, now);
  }
}

export function filesForHistoryRange(index, range) {
  const selected = index.files.filter((file) =>
    Date.parse(file.period_end) >= range.start && Date.parse(file.period_start) <= range.end
  );
  if (selected.length === 0) throw new HistoryRangeError("historyRangeNoData");
  return selected;
}

export function replayIndicesForRange(replay, range) {
  const indices = replay.snapshots.flatMap((snapshot, index) => {
    const observedAt = Date.parse(snapshot.observed_at);
    return observedAt >= range.start && observedAt <= range.end ? [index] : [];
  });
  if (indices.length === 0) throw new HistoryRangeError("historyRangeNoData");
  return indices;
}
