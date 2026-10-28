import type { RequestRecord } from './data.ts';

// Add one stable failed request to the local sample ledger without changing
// existing settlements. Reapplying the fixture keeps its identity and count.
export function addFailedRequestFixture(rows: RequestRecord[]): RequestRecord[] {
  const id = 'req_failed_2026-10-27_moss-transcribe';
  if (rows.some(row => row.id === id)) return rows;
  const source = rows.find(row => row.id === 'req_ledger_2026-10-27_moss-transcribe_195' && row.context === 'enterprise');
  if (!source) return rows;
  const start = Date.parse('2026-10-27T21:53:00+08:00');
  const failed: RequestRecord = {
    id, context: source.context, keyId: source.keyId, model: source.model,
    start, end: start + 1000, status: '失败', units: 0, cents: 0,
  };
  return [...rows, failed].sort((a, b) => b.start - a.start);
}
