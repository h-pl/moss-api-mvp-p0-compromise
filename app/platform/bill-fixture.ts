import type { BillGroup, BillLine, BillUnit } from './bill-data.ts';
import type { RequestRecord } from './data.ts';
export const BILL_MOCK_PERIOD = { from: '2026-10-01', to: '2026-10-07' };
// Approved statement fixture, independent of the older per-request voice demo.
// Monetary calculations use hundredths of a point (1 yuan = 2,000 point cents).
function line(rate: number, units: number, unit: BillUnit, threshold?: string, label?: string): BillLine {
  return { label, units, unit, threshold, rates: [`${rate.toFixed(3)} 元 / ${unit === '字符' ? '万字符' : unit}`], cents: Math.round(rate * units * 2000 / (unit === '字符' ? 10000 : 1)) };
}
export function mockBillGroups(): BillGroup[] {
  const voice: BillGroup[] = [
    { model: 'moss-tts-1.0-pro', kind: 'TTS', billedCount: 36400, lines: [line(.8, 26725500, '字符')] },
    { model: 'moss-tts-1.5-flash', kind: 'TTS', billedCount: 35600, lines: [line(.9, 26231000, '字符')] },
    { model: 'moss-transcribe', kind: 'ASR', billedCount: 19200, lines: [line(.553, 500, '小时', '≤500'), line(.45, 500, '小时', '>500'), line(.35, 250, '小时', '>1,000')] },
    { model: 'moss-ttsd-1.0', kind: 'TTS', billedCount: 11800, lines: [line(.9, 8669000, '字符')] },
    { model: 'moss-voice-generator-1.0', kind: 'TTS', billedCount: 13900, lines: [line(.85, 10128000, '字符')] },
    { model: 'moss-transcribe-diarize-pro', kind: 'ASR', billedCount: 13600, lines: [line(.68, 970, '小时')] },
  ];
  // The combined input/output volume fills 100 M, 100 M and 5 M segments.
  // Categories are the measured allocation within each segment, not separate ladders.
  const segments = [
    { threshold: '≤100', requests: 6400, units: [60, 31, 9], rates: [2, 20, 100] },
    { threshold: '>100', requests: 6100, units: [62, 29.5, 8.5], rates: [1.6, 16, 80] },
    { threshold: '>200', requests: 300, units: [3, 1.5, .5], rates: [1.2, 12, 60] },
  ];
  const labels = ['输入-缓存命中', '输入-缓存未命中', '输出'];
  return [...voice, ...segments.map(segment => ({ model: 'kimi-k3', kind: 'LLM', billedCount: segment.requests, threshold: segment.threshold, lines: labels.map((label, i) => line(segment.rates[i], segment.units[i], 'M tokens', undefined, label)) }))];
}


// Deterministic request-level allocations preserve the approved statement totals.
// Integer base units and point cents distribute rounding remainders across requests.
export function makeBillMockRequests(): RequestRecord[] {
  const from = Date.parse(`${BILL_MOCK_PERIOD.from}T00:00:00+08:00`);
  const duration = 7 * 86_400_000;
  const result: RequestRecord[] = [];
  const part = (total: number, count: number, i: number) => Math.floor(total * (i + 1) / count) - Math.floor(total * i / count);
  let tokenOffset = 0;
  for (const group of mockBillGroups()) {
    const isToken = group.kind === 'LLM';
    const batches = group.kind === 'ASR' && group.lines.length === 3
      ? group.lines.map((line, i) => ({ lines: [line], count: [7680, 7680, 3840][i] }))
      : [{ lines: group.lines, count: group.billedCount }];
    let offset = 0;
    for (const batch of batches) for (let i = 0; i < batch.count; i++) {
      const ordinal = offset + i;
      const start = from + Math.floor((isToken ? tokenOffset + ordinal : ordinal) * (duration - 60_000) / (isToken ? 12800 : group.billedCount));
      const lines = batch.lines.map(line => {
        const factor = line.unit === '小时' ? 3600 : line.unit === 'M tokens' ? 1_000_000 : 1;
        return { ...line, units: part(Math.round(line.units * factor), batch.count, i) / factor, cents: part(line.cents, batch.count, i) };
      });
      const units = lines.reduce((sum, line) => sum + Math.round(line.units * (line.unit === '小时' ? 3600 : line.unit === 'M tokens' ? 1_000_000 : 1)), 0);
      const keyId = isToken ? 'ent-key-2' : group.kind === 'ASR' ? (group.model === 'moss-transcribe' ? 'ent-key-3' : 'ent-key-six-model-preview') : group.model === 'moss-tts-1.0-pro' ? 'ent-key-1' : group.model === 'moss-tts-1.5-flash' ? 'ent-key-2' : 'ent-key-six-model-preview';
      result.push({ id: `req_bill_oct_${group.model}_${group.threshold ?? ''}_${ordinal}`, context: 'enterprise', keyId, model: group.model, start, end: start + 1000, status: '成功', units, cents: lines.reduce((sum, line) => sum + line.cents, 0), billing: { kind: group.kind, threshold: group.threshold, lines } });
      if (i === batch.count - 1) offset += batch.count;
    }
    if (isToken) tokenOffset += group.billedCount;
  }
  return result;
}
