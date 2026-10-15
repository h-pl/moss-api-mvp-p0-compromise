import { aggregate, filterRequests, models, type Context, type Filters, type RequestRecord } from './data.ts';
import { estimateYuan, ratePoints } from './pricing-data.ts';

export type BillUnit = '字符' | '小时' | 'M tokens';
export type BillLine = { label?: string; rates: string[]; threshold?: string; units: number; unit: BillUnit; cents: number };
export type BillGroup = { model: string; kind: string; billedCount: number; threshold?: string; lines: BillLine[] };

const number = (value: number, digits = 0) => value.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const billUnits = (value: number, unit: BillUnit) => `${number(value, unit === '字符' ? 0 : 2)} ${unit}`;
export const billAmount = (cents: number) => `¥${number(estimateYuan(cents), 2)}`;


export function billGroups(rows: RequestRecord[], context: Context, filters: Filters): BillGroup[] {
  rows = filterRequests(rows, context, filters);
  const settled = new Map<string, BillGroup>();
  for (const request of rows) {
    if (!request.billing) continue;
    const id = `${request.model}:${request.billing.threshold ?? ''}`;
    const group = settled.get(id) ?? { model: request.model, kind: request.billing.kind, billedCount: 0, threshold: request.billing.threshold, lines: [] };
    if (request.cents > 0) group.billedCount++;
    for (const line of request.billing.lines) {
      const target = group.lines.find(existing => existing.label === line.label && existing.threshold === line.threshold && existing.rates.join('|') === line.rates.join('|'));
      if (target) { target.units += line.units; target.cents += line.cents; }
      else group.lines.push({ ...line });
    }
    settled.set(id, group);
  }
  const rank = (group: BillGroup) => { const index = models.findIndex(model => model.id === group.model); return index < 0 ? models.length : index; };
  const tierOrder = (threshold?: string) => threshold ? Number(threshold.replace(/[^\d]/g, '')) * 2 + Number(threshold.startsWith('>')) : -1;
  for (const group of settled.values()) if (group.kind === 'ASR') group.lines.sort((a, b) => tierOrder(a.threshold) - tierOrder(b.threshold));
  const legacy: BillGroup[] = aggregate(rows.filter(row => !row.billing)).map(row => {
    const kind = models.find(model => model.id === row.model)?.kind ?? 'TTS';
    const policies = [...new Map(rows.filter(request => !request.billing && request.model === row.model && request.rate).map(request => [JSON.stringify(request.rate), request.rate!])).values()];
    return { model: row.model, kind, billedCount: row.billedCount, lines: [{ rates: policies.length ? policies.map(policy => `${estimateYuan(ratePoints(policy) * 100).toFixed(3)} 元 / ${policy.basisLabel}`) : ['—'], units: kind === 'ASR' ? row.units / 3600 : row.units, unit: kind === 'ASR' ? '小时' : '字符', cents: row.cents }] };
  });
  // A different data source does not create another bill row for the same model.
  // Preserve distinct historical rates/thresholds inside the model's group.
  for (const group of legacy) {
    const id = `${group.model}:`;
    const target = settled.get(id);
    if (!target) { settled.set(id, group); continue; }
    target.billedCount += group.billedCount;
    for (const line of group.lines) {
      const existing = target.lines.find(item => item.unit === line.unit && item.threshold === line.threshold && item.label === line.label && item.rates.join('|') === line.rates.join('|'));
      if (existing) { existing.units += line.units; existing.cents += line.cents; }
      else target.lines.push(line);
    }
  }
  return [...settled.values()].sort((a, b) => rank(a) - rank(b) || tierOrder(a.threshold) - tierOrder(b.threshold));
}
export function billTotals(groups: BillGroup[]) {
  const units = new Map<BillUnit, number>();
  let cents = 0;
  for (const group of groups) for (const line of group.lines) {
    units.set(line.unit, (units.get(line.unit) ?? 0) + line.units);
    cents += line.cents;
  }
  return { modelCount: new Set(groups.map(group => group.model)).size, billedCount: groups.reduce((sum, group) => sum + group.billedCount, 0), cents, units: [...units].map(([unit, value]) => billUnits(value, unit)) };
}

// Heights in template units; keep each multi-line group intact across pages.
export function paginateBill(groups: BillGroup[]) {
  const pages: BillGroup[][] = [[]];
  let used = 0;
  for (const [index, group] of groups.entries()) {
    const height = 15 + group.lines.reduce((sum, line) => sum + Math.max(1, line.rates.length) * 15, 0) + (group.lines.length - 1) * 4.5;
    const lastPage = pages[pages.length - 1];
    const capacity = pages.length === 1 ? 240 : 420;
    if (lastPage.length && (used + height + (index === groups.length - 1 ? 48 : 0) > capacity || group.kind === 'LLM' && lastPage.some(row => row.kind !== 'LLM'))) {
      pages.push([]); used = 0;
    }
    pages[pages.length - 1].push(group); used += height;
  }
  return pages;
}
