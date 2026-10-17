import { DAY, distributeMockUsageKeys, makeStore, type RequestRecord } from './data.ts';

// Redistribute the settled October demo without changing request quantities,
// charges, tier snapshots or their chronological order. Weight by billed spend
// so the points chart has modest daily variation even across price boundaries.
export function spreadOctoberUsage(saved: RequestRecord[], anchor: number): RequestRecord[] {
  if (!saved.some(row => row.id.startsWith('req_ledger_2026-10-16_'))) return saved;
  const from = Date.parse('2026-10-01T00:00:00+08:00');
  const through = from + 16 * DAY;
  const keys = new Map(makeStore(anchor).keys.map(key => [key.id, key]));
  const replacements = new Map<string, RequestRecord>();
  for (const [modelIndex, model] of ['kimi-k3', 'moss-transcribe'].entries()) {
    const rows = saved.filter(row => row.context === 'enterprise' && row.model === model && row.start >= from && row.start < through)
      .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
    const weights = Array.from({ length: 16 }, (_, day) => {
      const weekday = new Date(from + day * DAY + 8 * 3600_000).getUTCDay();
      return [.86, 1.08, 1.02, 1.12, .98, 1.06, .88][weekday] + ((day * 3 + modelIndex * 2) % 5 - 2) * .025;
    });
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const total = rows.reduce((sum, row) => sum + Math.max(1, row.cents), 0);
    let spent = 0, day = 0, lower = 0;
    for (const row of rows) {
      const weight = Math.max(1, row.cents);
      const position = (spent + weight / 2) / total * weightSum;
      while (day < weights.length - 1 && position >= lower + weights[day]) lower += weights[day++];
      const start = from + day * DAY + 6 * 3600_000 + Math.floor((position - lower) / weights[day] * 16 * 3600_000);
      const key = keys.get(row.keyId);
      const keyId = key && key.createdAt > start ? model === 'kimi-k3' ? 'ent-key-2' : 'ent-key-3' : row.keyId;
      replacements.set(row.id, { ...row, start, end: start + row.end - row.start, keyId });
      spent += weight;
    }
  }
  return distributeMockUsageKeys(saved.map(row => replacements.get(row.id) ?? row), anchor).sort((a, b) => b.start - a.start);
}
