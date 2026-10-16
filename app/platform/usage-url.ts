import { usageModels as models, rangeFor, dateKey, DAY, type FilterSelection, type KeyRecord } from './data.ts';

export type UsageQuery = {
  range: string;
  custom: { from: string; to: string };
  model: FilterSelection;
  key: FilterSelection;
  tab: 'overview' | 'requests';
  page: number;
  pageSize: number;
};

export function readUsageQuery(search: string, keys: KeyRecord[], now: number, initialKey = 'all'): UsageQuery {
  const params = new URLSearchParams(search);
  const range = params.get('range') ?? '7';
  const from = params.get('from') ?? '', to = params.get('to') ?? '';
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const latest = dateKey(now - DAY);
  const validCustom = validDate(from) && validDate(to) && from <= to && from <= latest;
  const selection = (name: string, allowed: string[], fallback = 'all'): FilterSelection => {
    const values = params.has(name) ? params.getAll(name) : [fallback];
    if (values.includes('all')) return 'all';
    const valid = [...new Set(values.filter(value => allowed.includes(value)))];
    return valid.length > 1 ? valid : valid[0] ?? 'all';
  };
  const page = Number(params.get('page') ?? 1);
  const pageSize = Number(params.get('pageSize') ?? 10);
  return {
    range: range === 'month' || range === 'custom' && validCustom ? range : '7',
    custom: validCustom ? { from, to: to > latest ? latest : to } : rangeFor('7', now),
    model: selection('model', models.map(model => model.id)),
    key: selection('key', keys.map(key => key.id), initialKey),
    tab: params.get('tab') === 'requests' ? 'requests' : 'overview',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: [5, 10, 20].includes(pageSize) ? pageSize : 10,
  };
}

export function writeUsageQuery(search: string, state: UsageQuery) {
  const params = new URLSearchParams(search);
  for (const key of ['range', 'from', 'to', 'model', 'key', 'tab', 'page', 'pageSize']) params.delete(key);
  params.set('range', state.range);
  if (state.range === 'custom') { params.set('from', state.custom.from); params.set('to', state.custom.to); }
  for (const name of ['model', 'key'] as const) {
    const value = state[name];
    if (value !== 'all') for (const id of Array.isArray(value) ? value : [value]) params.append(name, id);
  }
  if (state.tab !== 'overview') params.set('tab', state.tab);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.pageSize !== 10) params.set('pageSize', String(state.pageSize));
  return params.toString();
}
