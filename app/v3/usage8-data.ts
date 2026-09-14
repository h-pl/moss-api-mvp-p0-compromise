// Customer-facing daily aggregates. No request or metering-event records enter this candidate.
export const usage8AsOf = "2026-09-08T21:00:00+08:00";
export const usage8Snapshot = { points: 230748.98, asOf: "2026-09-08 21:00", expiresAt: "2027-02-28" };
export type Usage8Metric = "calls" | "ttsCharacters" | "asrDeciseconds";
export type Usage8Window = "month" | "7d" | "15d";
export type Usage8Totals = Record<Usage8Metric, number>;
export type Usage8Model = { id: string; name: string; kind: "TTS" | "ASR" };
export type Usage8Key = { id: string; name: string; masked: string; userId: string; user: string; createdAt: string };
export type Usage8Row = Usage8Totals & { date: string; modelId: string; keyId: string; userId: string };
export type Usage8Filters = { period: string; window: Usage8Window; modelId: string; userId: string; keyId: string };
export type Usage8Access = { userId: string; enterpriseWide: boolean; modelIds: string[] };
export const emptyUsage8 = (): Usage8Totals => ({ calls: 0, ttsCharacters: 0, asrDeciseconds: 0 });
const dayMs = 86400000;
const localDate = (time: number) => new Date(time + 8 * 3600000).toISOString().slice(0, 10);
const midnight = (date: string) => Date.parse(`${date}T00:00:00+08:00`);

export function usage8Range(period: string, window: Usage8Window, asOf = usage8AsOf) {
  const [year, month] = period.split("-").map(Number);
  const periodStart = midnight(`${period}-01`);
  const periodEnd = Date.UTC(year, month, 1) - 8 * 3600000 - 1;
  const now = Date.parse(asOf);
  const windowStart = window === "month" ? periodStart : midnight(localDate(now)) - (window === "7d" ? 6 : 14) * dayMs;
  const start = Math.max(periodStart, windowStart);
  const end = Math.min(periodEnd, now);
  return { start, end, empty: start > end, startDate: localDate(start), endDate: localDate(end) };
}

export function usage8Dates(startDate: string, endDate: string) {
  const dates: string[] = [];
  for (let time = midnight(startDate); time <= midnight(endDate); time += dayMs) dates.push(localDate(time));
  return dates;
}

const hash = (text: string) => [...text].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 7);

export function makeUsage8Demo(keys: Usage8Key[], models: Usage8Model[]): Usage8Row[] {
  const rows: Usage8Row[] = [];
  const days = usage8Dates("2026-08-01", "2026-09-08");
  keys.forEach(key => {
    // Only seeded credentials have demo history; newly created/unused keys correctly have none.
    const match = key.id.match(/^key_credentials7_.+_(\d+)$/);
    if (!match || Number(match[1]) > 12) return;
    const index = Number(match[1]) - 1;
    const modelAssignments = [[0, 3], [5], [4, 5], [0, 1], [0, 3], [2], [4], [4, 5], [0, 4], [3, 5], [0, 5], [5]];
    const selectedModels = models.filter((_, i) => modelAssignments[index].some(modelIndex => modelIndex % models.length === i));
    selectedModels.forEach((model, modelIndex) => days.forEach((date, dayIndex) => {
      if (date <= key.createdAt.slice(0, 10)) return;
      const seed = hash(`${key.id}:${model.id}`);
      if ((dayIndex + seed) % 13 === 0) return;
      const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
      const wave = 0.9 + Math.sin(dayIndex * 0.73 + seed % 7) * 0.25;
      const calls = Math.round((75 + seed % 380) * wave * (weekday === 0 || weekday === 6 ? 0.48 : 1) * (date === "2026-09-08" ? 0.875 : 1) / (modelIndex + 1));
      rows.push({ date, modelId: model.id, keyId: key.id, userId: key.userId, calls,
        ttsCharacters: model.kind === "TTS" ? calls * (280 + seed % 1800) : 0,
        asrDeciseconds: model.kind === "ASR" ? calls * (900 + seed % 8000) : 0 });
    }));
  });
  return rows;
}

export function selectUsage8<T extends Usage8Row>(rows: T[], filters: Usage8Filters, access: Usage8Access) {
  const range = usage8Range(filters.period, filters.window);
  if (range.empty) return [];
  const allowedModels = new Set(access.modelIds);
  return rows.filter(row => allowedModels.has(row.modelId)
    && (access.enterpriseWide || row.userId === access.userId)
    && row.date >= range.startDate && row.date <= range.endDate
    && (filters.modelId === "all" || row.modelId === filters.modelId)
    && (filters.userId === "all" || row.userId === filters.userId)
    && (filters.keyId === "all" || row.keyId === filters.keyId));
}

export function sumUsage8(rows: Usage8Totals[]) {
  return rows.reduce((total, row) => ({ calls: total.calls + row.calls,
    ttsCharacters: total.ttsCharacters + row.ttsCharacters,
    asrDeciseconds: total.asrDeciseconds + row.asrDeciseconds }), emptyUsage8());
}

export function dailyUsage8(rows: Usage8Row[], range: ReturnType<typeof usage8Range>) {
  if (range.empty) return [];
  const days = new Map(usage8Dates(range.startDate, range.endDate).map(date => [date, { date, ...emptyUsage8() }]));
  rows.forEach(row => { const day = days.get(row.date); if (day) days.set(row.date, { date: row.date, ...sumUsage8([day, row]) }); });
  return [...days.values()];
}

export function groupUsage8(rows: Usage8Row[]) {
  const groups = new Map<string, Usage8Row>();
  rows.forEach(row => {
    const id = JSON.stringify([row.modelId, row.userId, row.keyId]);
    const previous = groups.get(id);
    groups.set(id, previous ? { ...previous, ...sumUsage8([previous, row]) } : { ...row });
  });
  return [...groups.values()].sort((a, b) => b.calls - a.calls || a.keyId.localeCompare(b.keyId));
}

const csvCell = (value: string | number) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
export function csvUsage8(rows: Usage8Row[], filters: Usage8Filters, models: Usage8Model[], keys: Usage8Key[]) {
  const range = usage8Range(filters.period, filters.window);
  const values: (string | number)[][] = [["账期", "统计开始（UTC+8）", "统计结束（UTC+8）", "模型", "用户", "API Key 名称", "API Key 标识", "计费调用次数（次）", "TTS 计费字符（字符）", "ASR 计费音频时长（秒）"]];
  groupUsage8(rows).forEach(row => {
    const key = keys.find(key => key.id === row.keyId);
    values.push([filters.period, `${range.startDate} 00:00:00`, range.end === Date.parse(usage8AsOf) ? "2026-09-08 21:00:00" : `${range.endDate} 23:59:59`, models.find(model => model.id === row.modelId)?.name ?? row.modelId, key?.user ?? row.userId, key?.name ?? "未知 Key", row.keyId, row.calls, row.ttsCharacters, (row.asrDeciseconds / 10).toFixed(1)]);
  });
  return "\uFEFF" + values.map(row => row.map(csvCell).join(",")).join("\r\n");
}
