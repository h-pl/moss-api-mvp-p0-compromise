import assert from 'node:assert/strict';
import { billGroups, billTotals, paginateBill } from '../app/platform/bill-data.ts';
import { makeRequests, makeUsageRequests, aggregate, filterRequests, rangeFor, dateKey } from '../app/platform/data.ts';
import { mockBillGroups, makeBillMockRequests, BILL_MOCK_PERIOD } from '../app/platform/bill-fixture.ts';
import { usageExport } from '../app/platform/export-data.ts';
const groups = mockBillGroups();
const totals = billTotals(groups);
assert.deepEqual(totals, { modelCount: 7, billedCount: 143300, cents: 20662640, units: ['71,753,500 字符', '2,220.00 小时', '205.00 M tokens'] });
const kimi = groups.filter(g => g.model === 'kimi-k3');
assert.deepEqual(kimi.map(g => g.lines.reduce((sum, line) => sum + line.units, 0)), [100, 100, 5]);
assert.deepEqual(kimi.map(g => g.billedCount), [6400, 6100, 300]);
assert.deepEqual(kimi.map(g => g.lines.reduce((sum, line) => sum + line.cents, 0)), [3280000, 2502400, 103200]);
assert.deepEqual([0, 1, 2].map(i => kimi.reduce((sum, g) => sum + g.lines[i].units, 0)), [125, 62, 18]);
assert.equal(billTotals(kimi).cents, 5885600);
const asr = groups.find(g => g.model === 'moss-transcribe');
assert.deepEqual(asr.lines.map(l => l.units), [500, 500, 250]);
assert.equal(billTotals([asr]).cents, 1178000);
const pages = paginateBill(groups);
assert.deepEqual(pages.map(p => p.length), [6, 3]);
assert.equal(pages[0].at(-1).model, 'moss-transcribe-diarize-pro');
assert.equal(pages[1][0].model, 'kimi-k3');
assert.deepEqual(billTotals(pages.flat()), totals);
const filters = { ...BILL_MOCK_PERIOD, model: 'all', key: 'all' };
const mockRequests = makeBillMockRequests();
assert.equal(mockRequests.length, 143300);
assert.equal(new Set(mockRequests.map(r => r.id)).size, 143300);
assert.deepEqual(billTotals(billGroups(mockRequests, 'enterprise', filters)), totals);
assert.deepEqual(billTotals(billGroups(mockRequests, 'enterprise', { ...filters, model: 'moss-transcribe' })), billTotals([asr]));
// A fixed mock ledger must never leak into other accounts, keys or dates.
for (const [context, scope] of [['personal', filters], ['enterprise', { ...filters, key: 'ent-key-1' }], ['enterprise', { ...filters, from: '2026-10-02' }]]) {
  assert.deepEqual(billGroups([], context, scope), []);
}
const requests = makeRequests(Date.parse('2026-10-08T12:00:00+08:00'));
const personalRows = filterRequests(requests, 'personal', filters);
const personal = billTotals(billGroups(personalRows, 'personal', filters));
assert.equal(personal.cents, aggregate(personalRows).reduce((sum, r) => sum + r.cents, 0));
assert.equal(personal.modelCount, 6);
assert.equal(paginateBill(billGroups(personalRows, 'personal', filters)).length, 1);
const calendar = makeUsageRequests(Date.parse('2026-10-08T12:00:00+08:00'));
const approved = filterRequests(calendar, 'enterprise', filters);
assert.equal(approved.length, 143300);
assert.deepEqual(billTotals(billGroups(approved, 'enterprise', filters)), totals);
for (const scope of [filters, { ...filters, model: 'kimi-k3' }, { ...filters, key: 'ent-key-2' }, { ...filters, from: '2026-10-03', to: '2026-10-04' }]) {
  const selected = filterRequests(calendar, 'enterprise', scope);
  const total = billTotals(billGroups(selected, 'enterprise', scope));
  assert.equal(total.billedCount, selected.length);
  assert.equal(total.cents, selected.reduce((sum, r) => sum + r.cents, 0));
  for (const kind of ['keys', 'requests']) {
    const csv = usageExport(kind, selected, [], '星河科技', scope);
    assert.equal(csv.data.reduce((sum, r) => sum + Math.round(Number(r.at(-1)) * 10000), 0), total.cents * 5);
  }
}
assert.ok(mockRequests.every(r => r.start >= Date.parse('2026-10-01T00:00:00+08:00') && r.end < Date.parse('2026-10-08T00:00:00+08:00')));
// A query crossing fixture dates must not split identical voice models by source.
const monthScope = { ...filters, to: '2026-10-14' };
const monthRows = filterRequests(calendar, 'enterprise', monthScope);
const monthGroups = billGroups(calendar, 'enterprise', monthScope);
for (const model of ['moss-ttsd-1.0', 'moss-voice-generator-1.0', 'moss-transcribe-diarize-pro']) {
  const matches = monthGroups.filter(group => group.model === model);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].lines.length, 1);
}
assert.equal(paginateBill(monthGroups).length, 2);
assert.equal(billTotals(monthGroups).cents, monthRows.reduce((sum, row) => sum + row.cents, 0));
const recentScope = { ...filters, ...rangeFor('7', Date.parse('2026-10-15T12:00:00+08:00')), model: 'kimi-k3' };
const recent = filterRequests(calendar, 'enterprise', recentScope);
assert.equal(new Set(recent.map(row => dateKey(row.start))).size, 7);
assert.ok(recent.length > 10000);
assert.ok(recent.reduce((sum, row) => sum + row.units, 0) > 150_000_000);
assert.ok(recent.every(row => row.billing.threshold === '>200'));
assert.equal(new Set(calendar.map(row => row.id)).size, calendar.length);
for (const scope of [monthScope, recentScope]) {
  const selected = filterRequests(calendar, 'enterprise', scope);
  const total = billTotals(billGroups(calendar, 'enterprise', scope));
  assert.equal(total.billedCount, selected.filter(row => row.cents > 0).length);
  for (const kind of ['keys', 'requests']) {
    const csv = usageExport(kind, selected, [], '星河科技', scope);
    assert.equal(csv.data.reduce((sum, row) => sum + Math.round(Number(row.at(-1)) * 10000), 0), total.cents * 5);
  }
}
console.log('Bill checks passed: shared token tiers, ASR, totals, pagination, filter isolation and personal fallback.');
