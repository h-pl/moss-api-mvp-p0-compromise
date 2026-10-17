import { kimiContractCategories, kimiContractTiers } from './pricing-data.ts';
import { dateKey, type RequestRecord } from './data.ts';
import type { BillLine } from './bill-data.ts';

// Keep recent requests small, but cross a monthly boundary during October 9–15.
// Earlier October traffic is spread across eight days, never injected into one day.
export function applyRecentTierFixture(saved: RequestRecord[]): RequestRecord[] {
  const targets = ['kimi-k3', 'moss-transcribe'];
  const selected = saved.filter(row => row.context === 'enterprise' && targets.includes(row.model) && dateKey(row.start) >= '2026-10-01' && dateKey(row.start) <= '2026-10-15');
  const selectedIds = new Set(selected.map(row => row.id));
  const result = saved.filter(row => !selectedIds.has(row.id));
  for (const model of targets) {
    const token = model === 'kimi-k3';
    const rows = selected.filter(row => row.model === model).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
    const early = rows.filter(row => dateKey(row.start) < '2026-10-09' && row.status === '成功');
    const quantities = new Map(early.map((row, index) => {
      const budget = token ? 99_300_000 : 499.3 * 3600;
      return [row.id, Math.floor(budget * (index + 1) / early.length) - Math.floor(budget * index / early.length)];
    }));
    let cumulative = 0;
    for (const row of rows) {
      if (row.status !== '成功') { result.push(row); continue; }
      let remaining = quantities.get(row.id) ?? row.units;
      const total = remaining;
      let segment = 0;
      while (remaining > 0) {
        const limits = token ? kimiContractTiers.map(tier => tier.upperTokens) : [500 * 3600, 1000 * 3600, Infinity];
        const tier = limits.findIndex(limit => cumulative < limit);
        const units = Math.min(remaining, limits[tier] - cumulative);
        const labels = kimiContractCategories;
        let lines: BillLine[];
        if (token) {
          const original = row.billing!.lines;
          const hit = quantities.has(row.id) ? Math.floor(units * .98) : Math.floor(units * Math.round(original[0].units * 1_000_000) / row.units);
          const miss = quantities.has(row.id) ? Math.floor(units * .018) : Math.floor(units * Math.round(original[1].units * 1_000_000) / row.units);
          const rates = kimiContractTiers[tier].yuan;
          lines = [hit, miss, units - hit - miss].map((quantity, category) => ({ label: labels[category], units: quantity / 1_000_000, unit: 'M tokens', rates: [`${rates[category].toFixed(3)} 元 / M tokens`], cents: Math.round(quantity * rates[category] * 2000 / 1_000_000) }));
        } else {
          const rate = [.553, .45, .35][tier];
          lines = [{ units: units / 3600, unit: '小时', rates: [`${rate.toFixed(3)} 元 / 小时`], threshold: ['≤500', '>500', '>1,000'][tier], cents: Math.round(units * rate * 2000 / 3600) }];
        }
        const start = row.start + segment;
        result.push({ ...row, id: segment ? `${row.id}_tier_${segment}` : row.id, start, end: Math.max(row.end, start + 1), units, cents: lines.reduce((sum, line) => sum + line.cents, 0), billing: { kind: token ? 'LLM' : 'ASR', threshold: token ? kimiContractTiers[tier].threshold : undefined, lines } });
        remaining -= units; cumulative += units; segment++;
      }
      if (!total) result.push(row);
    }
  }
  return result.sort((a, b) => b.start - a.start);
}
