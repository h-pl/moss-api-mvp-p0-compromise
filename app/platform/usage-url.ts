import { models, rangeFor, type KeyRecord } from './data.ts';

export type UsageQuery = {
  range: string;
  custom: { from: string; to: string };
  model: string;
  key: string;
  tab: 'overview' | 'requests';
  page: number;
  pageSize: number;
};

export function readUsageQuery(search: string, keys: KeyRecord[], now: number, initialKey = 'all'): UsageQuery {
  const params = new URLSearchParams(search);
  const range = params.get('range') ?? '7';
  const from = params.get('from') ?? '', to = params.get('to') ?? '';
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const validCustom = validDate(from) && validDate(to);
  const key = params.get('key') ?? initialKey;
  const page = Number(params.get('page') ?? 1);
  const pageSize = Number(params.get('pageSize') ?? 10);
  return {
    range: range === 'month' || range === 'custom' && validCustom ? range : '7',
    custom: validCustom ? { from, to } : rangeFor('7', now),
    model: models.some(model => model.id === params.get('model')) ? params.get('model')! : 'all',
    key: keys.some(item => item.id === key) ? key : 'all',
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
  if (state.model !== 'all') params.set('model', state.model);
  if (state.key !== 'all') params.set('key', state.key);
  if (state.tab !== 'overview') params.set('tab', state.tab);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.pageSize !== 10) params.set('pageSize', String(state.pageSize));
  return params.toString();
}
