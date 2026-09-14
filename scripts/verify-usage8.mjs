import assert from "node:assert/strict";
import { test } from "node:test";
import { csvUsage8, dailyUsage8, groupUsage8, makeUsage8Demo, selectUsage8, sumUsage8, usage8Range, usage8Snapshot } from "../app/v3/usage8-data.ts";

const models = [{ id: "tts", name: "MOSS TTS", kind: "TTS" }, { id: "asr", name: "MOSS ASR", kind: "ASR" }];
const keys = [
  { id: "key_credentials7_alice_1", name: "production", masked: "••••A101", userId: "alice", user: "Alice", createdAt: "2026-08-01" },
  { id: "key_credentials7_bob_2", name: "production", masked: "••••A101", userId: "bob", user: "Bob", createdAt: "2026-08-02" },
  { id: "key_credentials7_alice_13", name: "unused", masked: "••••B103", userId: "alice", user: "Alice", createdAt: "2026-08-01" },
];
const fixture = makeUsage8Demo(keys, models);
const defaults = { period: "2026-09", window: "month", modelId: "all", userId: "all", keyId: "all" };
const owner = { userId: "alice", enterpriseWide: true, modelIds: ["tts", "asr"] };
const developer = { userId: "alice", enterpriseWide: false, modelIds: ["tts"] };

test("UTC+8 calendar window intersects billing period without broadening", () => {
  assert.equal(usage8Range("2026-09", "7d").startDate, "2026-09-02");
  assert.equal(usage8Range("2026-09", "15d").startDate, "2026-09-01");
  assert.equal(usage8Range("2026-08", "7d").empty, true);
  assert.equal(usage8Range("2026-08", "15d").startDate, "2026-08-25");
  assert.equal(usage8Range("2026-08", "15d").endDate, "2026-08-31");
  const fifteenDays = usage8Range("2026-09", "15d", "2026-09-20T21:00:00+08:00");
  assert.equal(fifteenDays.startDate, "2026-09-06");
  assert.equal(dailyUsage8([], fifteenDays).length, 15);
  assert.equal(usage8Range("2026-02", "month").endDate, "2026-02-28");
  assert.equal(usage8Range("2028-02", "month", "2028-03-01T00:00:00+08:00").endDate, "2028-02-29");
});

test("all metric totals agree across cards, daily charts/heatmap and aggregate table", () => {
  for (const period of ["2026-08", "2026-09"]) for (const window of ["month", "7d", "15d"]) for (const modelId of ["all", "tts", "asr"]) {
    const filters = { ...defaults, period, window, modelId };
    const selected = selectUsage8(fixture, filters, owner);
    assert.deepEqual(sumUsage8(selected), sumUsage8(dailyUsage8(selected, usage8Range(period, window))));
    assert.deepEqual(sumUsage8(selected), sumUsage8(groupUsage8(selected)));
    assert.ok(selected.every(row => Number.isInteger(row.calls) && Number.isInteger(row.asrDeciseconds)));
  }
});

test("Developer cannot broaden user/model scope, including through export", () => {
  const selected = selectUsage8(fixture, defaults, developer);
  assert.ok(selected.length > 0);
  assert.ok(selected.every(row => row.userId === "alice" && row.modelId === "tts"));
  assert.equal(selectUsage8(fixture, { ...defaults, userId: "bob" }, developer).length, 0);
  assert.equal(selectUsage8(fixture, { ...defaults, keyId: keys[1].id }, developer).length, 0);
  const csv = csvUsage8(selected, defaults, models, keys);
  assert.ok(!csv.includes('"Bob"') && !csv.includes(keys[1].id));
});

test("same-name keys stay separate by stable identifiers", () => {
  const selected = selectUsage8(fixture, { ...defaults, keyId: keys[0].id }, owner);
  assert.ok(selected.every(row => row.keyId === keys[0].id && row.userId === "alice"));
  assert.equal(selectUsage8(fixture, { ...defaults, keyId: keys[2].id }, owner).length, 0);
});

test("empty intersection does not fabricate zero days; covered dates without usage are zero", () => {
  assert.deepEqual(dailyUsage8([], usage8Range("2026-08", "7d")), []);
  const days = dailyUsage8([], usage8Range("2026-09", "7d"));
  assert.equal(days.length, 7);
  assert.equal(days[0].date, "2026-09-02");
  assert.equal(days.at(-1).date, "2026-09-08");
  assert.deepEqual(sumUsage8(days), { calls: 0, ttsCharacters: 0, asrDeciseconds: 0 });
});

test("CSV exports all filtered aggregate rows, exact seconds and no single-call fields", () => {
  const selected = selectUsage8(fixture, defaults, owner);
  const csv = csvUsage8(selected, defaults, models, keys);
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines.length - 1, groupUsage8(selected).length);
  assert.ok(!/request_id|trace_id|task_id|MeterEvent|success|latency|concurrency/i.test(csv));
  const fields = lines.slice(1).map(line => line.slice(1, -1).split('","'));
  const totals = sumUsage8(selected);
  assert.equal(fields.reduce((sum, row) => sum + Number(row[7]), 0), totals.calls);
  assert.equal(fields.reduce((sum, row) => sum + Number(row[8]), 0), totals.ttsCharacters);
  assert.equal(Math.round(fields.reduce((sum, row) => sum + Number(row[9]) * 10, 0)), totals.asrDeciseconds);
  assert.ok(fields.every(row => row[2] === "2026-09-08 21:00:00"));
});

test("current balance snapshot is independent of query scope", () => {
  const before = { ...usage8Snapshot };
  selectUsage8(fixture, { ...defaults, period: "2026-08", keyId: keys[0].id }, developer);
  assert.deepEqual(usage8Snapshot, before);
});

test("CSV escapes customer-controlled key names", () => {
  const selected = selectUsage8(fixture, { ...defaults, keyId: keys[0].id }, owner);
  const csv = csvUsage8(selected, defaults, models, [{ ...keys[0], name: '=HYPERLINK("example")' }]);
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));
});
