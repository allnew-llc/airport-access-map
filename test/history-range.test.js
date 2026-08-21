import assert from "node:assert/strict";
import test from "node:test";
import {
  HistoryRangeError,
  MAX_HISTORY_LOOKBACK_DAYS,
  filesForHistoryRange,
  defaultHistoryRange,
  formatJstDateTimeInput,
  historyRangeFromSearch,
  historyRangeToUrlValue,
  parseJstDateTimeInput,
  replayIndicesForRange,
  validateHistoryIndex,
  validateHistoryRange
} from "../src/history-range.js";

const index = {
  schema_version: "history-index/1",
  type: "HistoryIndex",
  time_zone: "Asia/Tokyo",
  retention_days: 31,
  sample_data: true,
  fictional: true,
  not_for_travel_decisions: true,
  available_start: "2026-08-13T00:00:00+09:00",
  available_end: "2026-08-14T23:59:59+09:00",
  files: [{
    path: "history-sample-week.json",
    format: "sample-history/1",
    period_start: "2026-08-13T00:00:00+09:00",
    period_end: "2026-08-14T23:59:59+09:00",
    sha256: "a".repeat(64)
  }]
};
const now = Date.parse("2026-08-17T00:00:00+09:00");

test("history index fixes the public retention window at 31 days", () => {
  assert.equal(MAX_HISTORY_LOOKBACK_DAYS, 31);
  assert.equal(validateHistoryIndex(index), index);
  assert.throws(() => validateHistoryIndex({ ...index, retention_days: 32 }), HistoryRangeError);
});

test("history index rejects non-sample history files", () => {
  const unsupported = {
    ...index,
    files: [{ ...index.files[0], format: "rolling-history/1" }]
  };
  assert.throws(() => validateHistoryIndex(unsupported), HistoryRangeError);
});

test("explicit fictional sample history remains replayable after the live retention window", () => {
  const sampleIndex = index;
  assert.deepEqual(defaultHistoryRange(sampleIndex, Date.parse("2030-01-01T00:00:00+09:00")), {
    start: Date.parse(sampleIndex.available_start),
    end: Date.parse(sampleIndex.available_end)
  });
  assert.throws(
    () => validateHistoryIndex({ ...sampleIndex, fictional: false }),
    HistoryRangeError
  );
  assert.throws(
    () => validateHistoryIndex({ ...index, sample_data: undefined }),
    HistoryRangeError
  );
});

test("JST datetime-local values do not depend on the visitor device timezone", () => {
  const timestamp = parseJstDateTimeInput("2026-08-13T15:02");
  assert.equal(timestamp, Date.parse("2026-08-13T15:02:00+09:00"));
  assert.equal(formatJstDateTimeInput(timestamp), "2026-08-13T15:02");
  assert.equal(historyRangeToUrlValue(timestamp), "2026-08-13T15:02:00+09:00");
});

test("history range rejects reversed, future and older-than-retention input", () => {
  assert.throws(() => validateHistoryRange({ start: "2026-08-14T10:00:00+09:00", end: "2026-08-14T09:00:00+09:00" }, index, now), /historyRangeInvalidOrder/);
  assert.throws(() => validateHistoryRange({ start: "2026-08-13T10:00:00+09:00", end: "2026-08-17T01:00:00+09:00" }, index, now), /historyRangeOutsideRetention/);
  assert.throws(() => validateHistoryRange({ start: "2026-07-01T10:00:00+09:00", end: "2026-08-14T09:00:00+09:00" }, index, now), /historyRangeOutsideRetention/);
});

test("shared URL range is accepted only inside available history", () => {
  const query = new URLSearchParams({ start: "2026-08-13T15:00:00+09:00", end: "2026-08-14T09:00:00+09:00" });
  assert.deepEqual(historyRangeFromSearch(query, index, now), {
    start: Date.parse("2026-08-13T15:00:00+09:00"),
    end: Date.parse("2026-08-14T09:00:00+09:00")
  });
  assert.equal(filesForHistoryRange(index, historyRangeFromSearch(query, index, now)).length, 1);
});

test("replay exposes only change points inside the selected period", () => {
  const replay = { snapshots: [
    { observed_at: "2026-08-13T14:00:00+09:00" },
    { observed_at: "2026-08-13T16:00:00+09:00" },
    { observed_at: "2026-08-14T10:00:00+09:00" }
  ] };
  assert.deepEqual(replayIndicesForRange(replay, {
    start: Date.parse("2026-08-13T15:00:00+09:00"),
    end: Date.parse("2026-08-14T09:00:00+09:00")
  }), [1]);
});
