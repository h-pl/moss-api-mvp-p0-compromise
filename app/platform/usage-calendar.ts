import { DAY, dateKey, makeUsageRequests, type RequestRecord } from './data.ts';
import type { BillLine } from './bill-data.ts';

export const EXTENDED_USAGE_FROM = '2026-10-16';
export const EXTENDED_USAGE_THROUGH = '2026-11-30';
const labels = ['输入-缓存命中', '输入-缓存未命中', '输出'];
const tokenLimits = [100_000_000, 200_000_000, Infinity];
const tokenRates = [[2, 20, 100], [1.6, 16, 80], [1.2, 12, 60]];
const tokenLabels = ['≤100', '>100', '>200'];
const asrLimits = [500 * 3600, 1000 * 3600, Infinity];
const asrRates = [.553, .45, .35];
const asrLabels = ['≤500', '>500', '>1,000'];
const tierFor = (total: number, limits: number[]) => limits.findIndex(limit => total < limit);

// One-time ledger migration: retain settled requests, extend the calendar and
// replace only the future Kimi/ASR seeds with monthly progressive settlements.
export function extendUsageCalendar(saved: RequestRecord[], anchor: number): RequestRecord[] {
  const groupKey = (row: RequestRecord) => `${dateKey(row.start)}:${row.context}:${row.keyId}:${row.model}`;
  const existing = new Set(saved.map(groupKey));
  const baseline = [...saved, ...makeUsageRequests(anchor).filter(row => dateKey(row.start) >= EXTENDED_USAGE_FROM && dateKey(row.start) <= EXTENDED_USAGE_THROUGH && !existing.has(groupKey(row)))];
  const rows = baseline.filter(row => !(row.context === 'enterprise' && dateKey(row.start) >= EXTENDED_USAGE_FROM && dateKey(row.start) <= EXTENDED_USAGE_THROUGH && ['kimi-k3', 'moss-transcribe'].includes(row.model))).map(row => ({ ...row }));
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.context !== 'enterprise' || !['kimi-k3', 'moss-transcribe'].includes(row.model)) continue;
    const key = `${dateKey(row.start).slice(0, 7)}:${row.model}`;
    totals.set(key, (totals.get(key) ?? 0) + row.units);
    // Preserve actual cents/units from the saved first-tier ASR requests.
    if (dateKey(row.start).startsWith('2026-10') && row.model === 'moss-transcribe' && !row.billing) {
      row.billing = { kind: 'ASR', lines: [{ units: row.units / 3600, unit: '小时', rates: ['0.553 元 / 小时'], cents: row.cents, threshold: '≤500' }] };
    }
  }
  const from = Date.parse(`${EXTENDED_USAGE_FROM}T00:00:00+08:00`);
  const through = Date.parse(`${EXTENDED_USAGE_THROUGH}T00:00:00+08:00`);
  for (let day = from, index = 0; day <= through; day += DAY, index++) {
    const date = dateKey(day), month = date.slice(0, 7), dayOfMonth = Number(date.slice(8));
    const weekday = new Date(day + 8 * 3600_000).getUTCDay();
    const factor = [.85, 1.05, 1, 1.1, 1, 1.08, .92][weekday];
    const budgets = {
      'kimi-k3': Math.round((month === '2026-10' ? .8 + index * 1.7 : 17 + dayOfMonth % 5) * factor * 1_000_000),
      'moss-transcribe': Math.round((month === '2026-10' ? 4 + index * 10 : 115 + dayOfMonth % 5 * 5) * factor * 3600),
    };
    for (const model of ['kimi-k3', 'moss-transcribe'] as const) {
      const token = model === 'kimi-k3', key = `${month}:${model}`, limits = token ? tokenLimits : asrLimits;
      let remaining = budgets[model], ordinal = 0;
      while (remaining > 0) {
        const cumulative = totals.get(key) ?? 0, tier = tierFor(cumulative, limits);
        // End a request at a boundary so each request is counted exactly once.
        const units = Math.min(remaining, limits[tier] - cumulative, token ? 190000 + ordinal % 7 * 10000 : 1200 + ordinal % 7 * 300);
        let lines: BillLine[];
        if (token) {
          const hit = Math.floor(units * .96), miss = Math.floor(units * .035);
          lines = [hit, miss, units - hit - miss].map((quantity, category) => ({ label: labels[category], units: quantity / 1_000_000, unit: 'M tokens', rates: [`${tokenRates[tier][category].toFixed(3)} 元 / M tokens`], cents: Math.round(quantity * tokenRates[tier][category] * 2000 / 1_000_000) }));
        } else {
          lines = [{ units: units / 3600, unit: '小时', rates: [`${asrRates[tier].toFixed(3)} 元 / 小时`], threshold: asrLabels[tier], cents: Math.round(units * asrRates[tier] * 2000 / 3600) }];
        }
        const start = day + 6 * 3600_000 + Math.floor((budgets[model] - remaining) / budgets[model] * 16 * 3600_000);
        rows.push({ id: `req_ledger_${date}_${model}_${ordinal++}`, context: 'enterprise', keyId: token ? 'ent-key-2' : 'ent-key-3', model, start, end: start + 1000, status: '成功', units, cents: lines.reduce((sum, line) => sum + line.cents, 0), billing: { kind: token ? 'LLM' : 'ASR', threshold: token ? tokenLabels[tier] : undefined, lines } });
        totals.set(key, cumulative + units); remaining -= units;
      }
    }
  }
  return rows.sort((a, b) => b.start - a.start);
}
