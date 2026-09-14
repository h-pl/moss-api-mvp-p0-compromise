import { chargeCents, rateFor, type RatePolicy } from './pricing-data.ts';
/** Prototype repository. No production credentials or billing records are used. */
export type Context = 'enterprise' | 'personal';
export type Page = 'keys' | 'usage' | 'profile' | 'pricing';
export type Model = { id: string; kind: 'TTS' | 'ASR'; limit: number; unit: string; color: string };
export type KeyRecord = { id: string; context: Context; name: string; masked: string; note: string; policies: Record<string, number>; enabled: boolean; createdAt: number; deletedAt?: number };
export type RequestRecord = { id: string; context: Context; keyId: string; model: string; start: number; end: number; status: '成功' | '失败'; units: number; cents: number; rate?: RatePolicy };
export type Store = { version: 1; anchor: number; context: Context; keys: KeyRecord[] };
export type Filters = { from: string; to: string; model: string; key: string };
export const STORAGE_KEY = 'moss-platform-owner-v1';
export const DAY = 86_400_000;
export const models: Model[] = [
  { id: 'moss-tts-1.0-pro', kind: 'TTS', limit: 100, unit: '字符', color: '#f38b32' },
  { id: 'moss-tts-1.5-flash', kind: 'TTS', limit: 80, unit: '字符', color: '#76ab8d' },
  { id: 'moss-transcribe', kind: 'ASR', limit: 40, unit: '秒', color: '#789cc6' },
  { id: 'moss-ttsd-1.0', kind: 'TTS', limit: 60, unit: '字符', color: '#b49acb' },
  { id: 'moss-voice-generator-1.0', kind: 'TTS', limit: 40, unit: '字符', color: '#d4b46f' },
  { id: 'moss-transcribe-diarize-pro', kind: 'ASR', limit: 30, unit: '秒', color: '#c9848f' },
];
export function contextModels(context: Context) { return models.map(m => ({ ...m, limit: context === 'enterprise' ? m.limit : 5 })); }
export const points = (cents: number) => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dateKey = (time: number) => new Date(time + 8 * 3_600_000).toISOString().slice(0, 10);
export const timeLabel = (time: number) => new Date(time + 8 * 3_600_000).toISOString().slice(0, 19).replace('T', ' ');
export function makeStore(now = Date.now()): Store {
  const anchor = Math.floor(now / 60_000) * 60_000;
  const names = ['语音产品生产环境', '内容生成服务', '实时转写服务', '研发联调', '离线批处理'];
  const limits = [{ 0: 80, 1: 60 }, { 0: 70, 1: 60 }, { 2: 30 }, { 0: 20, 1: 20, 2: 10 }, { 0: 50 }];
  const notes = ['语音产品 · 线上调用', '内容团队 · 短视频配音', '客服业务 · 语音转写', '开发测试使用', '批量配音任务，暂时停用'];
  const keys: KeyRecord[] = names.map((name, i) => ({ id: `ent-key-${i + 1}`, context: 'enterprise', name, masked: `sk-••••••${['a7f2', 'b3e8', 'c9d1', 'd2a6', 'e4b9'][i]}`, note: notes[i], policies: Object.fromEntries(Object.entries(limits[i]).map(([index, limit]) => [models[Number(index)].id, limit])), enabled: i !== 4, createdAt: anchor - (45 - i * 3) * DAY }));
  keys.push({ id: 'personal-key-1', context: 'personal', name: '个人项目', masked: 'sk-••••••f8c3', note: '', policies: Object.fromEntries(models.map(m => [m.id, 5])), enabled: true, createdAt: anchor - 40 * DAY });
  keys.push({ id: 'ent-key-six-model-preview', context: 'enterprise', name: '多模型语音服务', masked: 'sk-••••••f6a2', note: '双人对话、音色设计与说话人分离', policies: Object.fromEntries(models.slice(3).map(m => [m.id, m.limit])), enabled: true, createdAt: anchor - 31 * DAY });
  return { version: 1, anchor, context: 'enterprise', keys };
}
// An immutable request fixture is independent of current key policy, deletion or status.
// Shared-pool peaks are computed from overlapping accepted request intervals.
export function makeRequests(anchor: number): RequestRecord[] {
  const original = makeStore(anchor).keys;
  const requests: RequestRecord[] = [];
  for (let day = 0; day < 30; day++) {
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
      const model = models[modelIndex];
      const batch = anchor - day * DAY - (modelIndex + 1) * 3_600_000;
      original.forEach((key, keyIndex) => {
        if (!key.policies[model.id] || !key.enabled) return;
        const count = key.context === 'personal' ? 2 : Math.min(key.policies[model.id], 7 + (day * 7 + keyIndex * 11 + modelIndex * 3) % 24);
        for (let n = 0; n < count; n++) {
          const start = batch + n * 110 + (keyIndex % 2) * 600;
          const status = n === 2 && day % 9 === 0 ? '失败' : '成功';
          const units = status === '成功' ? (model.kind === 'TTS' ? 240 + (n * 37 + day * 19) % 900 : 15 + n % 60) : 0;
          requests.push({ id: `req_${day.toString(16).padStart(2, '0')}${modelIndex}${keyIndex}${n.toString(16).padStart(4, '0')}`, context: key.context, keyId: key.id, model: model.id, start, end: start + 12_000 + (n % 5) * 1000, status, units, cents: chargeCents(units, rateFor(key.context, model.id)), rate: rateFor(key.context, model.id) });
        }
      });
    }
  }
  return requests.sort((a, b) => b.start - a.start);
}
export function filterRequests(requests: RequestRecord[], context: Context, filters: Filters, settledBefore?: number) {
  const start = new Date(`${filters.from}T00:00:00+08:00`).getTime();
  const end = new Date(`${filters.to}T00:00:00+08:00`).getTime() + DAY;
  return requests.filter(r => r.context === context && r.start >= start && r.start < end && (settledBefore === undefined || r.start < settledBefore) && (filters.model === 'all' || r.model === filters.model) && (filters.key === 'all' || r.keyId === filters.key));
}
export type Aggregate = { model: string; keyId: string; count: number; billedCount: number; units: number; cents: number; rate?: RatePolicy };
export function aggregate(requests: RequestRecord[], byKey = false): Aggregate[] {
  const rows = new Map<string, Aggregate>();
  requests.forEach(r => {
    const id = r.model + (byKey ? `:${r.keyId}` : '');
    const row = rows.get(id) ?? { model: r.model, keyId: byKey ? r.keyId : '', count: 0, billedCount: 0, units: 0, cents: 0 };
    row.count++; if (r.cents > 0) row.billedCount++; row.units += r.units; row.cents += r.cents; rows.set(id, row);
  });
  return [...rows.values()].sort((a, b) => models.findIndex(m => m.id === a.model) - models.findIndex(m => m.id === b.model) || a.keyId.localeCompare(b.keyId));
}
export function concurrencyPeak(requests: RequestRecord[], context: Context, model: string, key: string, now: number) {
  const from = now - DAY;
  const events: [number, number][] = [];
  for (const r of requests) if (r.context === context && r.model === model && (key === 'all' || r.keyId === key) && r.end > from && r.start <= now) {
    events.push([Math.max(r.start, from), 1], [r.end, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0, peak = 0, at: number | null = null;
  for (const [time, delta] of events) { if (time > now) break; current += delta; if (current > peak) { peak = current; at = time; } }
  return { peak, at };
}
export function validateKey(name: string, note: string, policies: Record<string, number>, available: Model[]) {
  if (!name.trim() || name.trim().length > 50) return '请输入 1–50 个字符的 Key 名称。';
  if (note.length > 200) return '备注最多 200 个字符。';
  if (!Object.keys(policies).length) return '请至少选择一个授权模型。';
  for (const [id, limit] of Object.entries(policies)) {
    const model = available.find(m => m.id === id);
    if (!model || !Number.isInteger(limit) || limit < 1 || limit > model.limit) return `${id} 的并发上限须为 1–${model?.limit ?? 0} 的整数。`;
  }
  return null;
}
export function parseStore(raw: string): Store {
  const s = JSON.parse(raw) as Store;
  if (s.version !== 1 || !Number.isFinite(s.anchor) || !['enterprise', 'personal'].includes(s.context) || !Array.isArray(s.keys)) throw new Error('存储版本不兼容');
  for (const k of s.keys) { if (k.policies && 'moss-asr-1.0' in k.policies) { k.policies['moss-transcribe'] = k.policies['moss-asr-1.0']; delete k.policies['moss-asr-1.0']; } }
  for (const k of s.keys) if (!k.id || !['enterprise', 'personal'].includes(k.context) || typeof k.masked !== 'string' || typeof k.enabled !== 'boolean' || !Number.isFinite(k.createdAt) || validateKey(k.name, k.note, k.policies, contextModels(k.context))) throw new Error('Key 数据不完整');
  if (!s.keys.some(k => k.id === 'ent-key-six-model-preview')) s.keys.push(makeStore(s.anchor).keys.find(k => k.id === 'ent-key-six-model-preview')!);
  return s;
}
export function csv(headers: string[], rows: (string | number)[][]) {
  const cell = (value: string | number) => { let text = String(value); if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text; return `"${text.replaceAll('"', '""')}"`; };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}
export function rangeFor(value: string, now: number) {
  // Usage is synchronized the next day; presets contain completed Beijing days.
  const end = now - DAY;
  const to = dateKey(end);
  return { from: value === 'month' ? to.slice(0, 7) + '-01' : dateKey(end - (Number(value) - 1) * DAY), to };
}
