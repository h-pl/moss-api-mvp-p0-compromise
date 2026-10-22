import assert from 'node:assert/strict';
import { billDisplayGroups, billGroups, billShowsTierThresholds, billTotals, paginateBill } from '../app/platform/bill-data.ts';
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
// All three token tiers must move together when only the first tier would fit.
const tierBoundaryGroups = [groups[0], groups[1], ...kimi];
const tierBoundaryPages = paginateBill(tierBoundaryGroups);
assert.deepEqual(tierBoundaryPages.map(page => page.length), [2, 3]);
assert.deepEqual(tierBoundaryPages[1], kimi);
assert.deepEqual(billTotals(tierBoundaryPages.flat()), billTotals(tierBoundaryGroups));
for (const [index, page] of tierBoundaryPages.entries()) {
  for (const group of page) assert.ok(tierBoundaryPages.every((other, otherIndex) => index === otherIndex || other.every(item => item.model !== group.model)), 'A model must never span print pages');
}
assert.deepEqual(paginateBill([]), [[]]);
assert.deepEqual(paginateBill(kimi), [kimi], 'A filtered multi-tier model must remain together');
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
const dailyFirstWeek = filterRequests(calendar, 'enterprise', filters);
assert.ok(dailyFirstWeek.length < 3000, 'Daily dashboard must not include the high-volume statement fixture');
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
assert.ok(recent.length >= 100 && recent.length <= 250);
assert.ok(recent.reduce((sum, row) => sum + row.cents, 0) >= 10000);
assert.ok(recent.reduce((sum, row) => sum + row.cents, 0) < 100000);
assert.ok(recent.every(row => row.billing.threshold === '≤100'));
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

assert.equal(paginateBill([groups[0], kimi[0]]).length, 1, 'Mixed models that fit must share a page');
const withScope = paginateBill([groups[0], kimi[0]], 100);
assert.equal(withScope.length, 2, 'Reserve footer scope height beside the final model and total');
assert.deepEqual(withScope.flat(), [groups[0], kimi[0]], 'Scope pagination must preserve every billing row');
const multiScope = { ...filters, model: ['moss-transcribe', 'kimi-k3'], key: ['ent-key-1', 'ent-key-2'] };
const multiRows = filterRequests(calendar, 'enterprise', multiScope);
assert.ok(multiRows.length > 0);
assert.ok(multiRows.every(row => multiScope.model.includes(row.model) && multiScope.key.includes(row.keyId)));
assert.equal(billTotals(billGroups(calendar, 'enterprise', multiScope)).cents, multiRows.reduce((sum, row) => sum + row.cents, 0));
for (const kind of ['keys', 'requests']) assert.equal(usageExport(kind, multiRows, [], '星河科技', multiScope).data.reduce((sum, row) => sum + Math.round(Number(row.at(-1)) * 10000), 0), multiRows.reduce((sum, row) => sum + row.cents, 0) * 5);

// A month must not jump from a special high-volume fixture to daily-scale data.
const dashboardMonth = filterRequests(calendar, 'enterprise', { ...filters, to: '2026-10-31' });
const dailyPoints = new Map();
for (const row of dashboardMonth) dailyPoints.set(dateKey(row.start), (dailyPoints.get(dateKey(row.start)) ?? 0) + row.cents / 100);
assert.equal(dailyPoints.size, 31);
assert.ok(Math.max(...dailyPoints.values()) / Math.min(...dailyPoints.values()) < 4, 'Daily usage should stay at a comparable scale');
assert.ok(new Set([...dailyPoints.values()].map(Math.round)).size > 20, 'Daily usage should have natural variation');
const dailyKimi = dashboardMonth.filter(row => row.model === 'kimi-k3');
assert.ok(dailyKimi.reduce((sum, row) => sum + row.units, 0) < 100_000_000);
assert.ok(dailyKimi.every(row => row.billing.threshold === '≤100'));
console.log('Daily mock checks passed: stable monthly scale, varied days, and token tiers matching actual volume.');

// Every configured tier keeps its threshold visible, including the first tier.
assert.equal(billShowsTierThresholds([kimi[0]]), true, 'First-tier Kimi retains its threshold');
assert.equal(billShowsTierThresholds(kimi), true, 'Full progressive Kimi must retain every threshold');
assert.equal(billShowsTierThresholds([kimi[2]]), true, 'Filtering to a later tier must retain its threshold');
assert.equal(billShowsTierThresholds([{ ...asr, lines: [asr.lines[0]] }]), true, 'First-tier ASR retains its threshold');
assert.equal(billShowsTierThresholds([asr]), true, 'Progressive ASR must retain thresholds');
assert.equal(billShowsTierThresholds(billGroups(recent, 'enterprise', recentScope)), true, 'Daily Kimi retains its first-tier threshold');
// Date/Key filters may contain only later tiers. Display all three without
// changing settled requests, usage, rates or money, including a zero first tier.
for (const source of [
  [{ ...asr, lines: asr.lines.slice(1) }, ...kimi.slice(1)],
  [{ ...asr, lines: asr.lines.slice(0, 1) }, kimi[0]],
  [{ ...asr, lines: [asr.lines[2]] }, kimi[2]],
]) {
  const before = structuredClone(source);
  const display = billDisplayGroups(source);
  assert.deepEqual(display[0].lines.map(line => line.threshold), ['≤500', '>500', '>1,000']);
  assert.deepEqual(display.slice(1).map(group => group.threshold), ['≤100', '>100', '>200']);
  assert.deepEqual(billTotals(display), billTotals(source));
  assert.deepEqual(source, before, 'Completing display tiers must not mutate settlement snapshots');
  assert.deepEqual(billDisplayGroups(display), display, 'Completing tiers is idempotent');
  for (const group of source) {
    const rendered = display.find(item => item.model === group.model && item.threshold === group.threshold);
    assert.equal(rendered.billedCount, group.billedCount);
    for (const line of group.lines) assert.ok(rendered.lines.includes(line), 'Keep original line snapshots');
  }
}
const laterOnly = billDisplayGroups([{ ...asr, lines: asr.lines.slice(1) }, ...kimi.slice(1)]);
assert.deepEqual(laterOnly[0].lines[0], { threshold: '≤500', rates: ['0.553 元 / 小时'], units: 0, unit: '小时', cents: 0 });
assert.equal(laterOnly[1].billedCount, 0);
assert.deepEqual(laterOnly[1].lines.map(line => line.rates[0]), ['2.000 元 / M tokens', '20.000 元 / M tokens', '100.000 元 / M tokens']);
assert.ok(laterOnly[1].lines.every(line => line.units === 0 && line.cents === 0));
assert.deepEqual(billDisplayGroups([]), []);
assert.deepEqual(billDisplayGroups(groups), groups);
const ordinary = billGroups(personalRows, 'personal', filters);
assert.deepEqual(billDisplayGroups(ordinary), ordinary, 'Ordinary personal pricing must not acquire enterprise tiers');
assert.equal(billShowsTierThresholds(ordinary), false);
console.log('Tier display checks passed: complete three-tier ladders, zero missing segments, preserved totals and snapshots.');

// Real paper metrics, independent of the narrow modal's wrapped scope text.
const filteredTiers = [{...asr,lines:asr.lines.slice(0,2)}, ...kimi.slice(0,2)];
const paperMetrics = {first:299,continuation:445,modelHeights:[50.25,139],ending:107};
assert.equal(paginateBill(filteredTiers,0,paperMetrics).length,1,'ASR and two Kimi tiers fit on one measured sheet');
assert.equal(paginateBill(filteredTiers,0,{...paperMetrics,ending:180}).length,2,'A larger measured ending must still reserve real space');
assert.deepEqual(paginateBill(filteredTiers,0,{...paperMetrics,ending:180}).flat(),filteredTiers);

// Reported regression: flash + ASR (two rates) + Kimi (two shared tiers).
// Keep the three-unit total and the full model/Key scope on the same sheet.
const threeModelTiers = [groups[1], ...filteredTiers];
const threeModelPaper = {first:331,continuation:458,modelHeights:[30.75,50,139],ending:109.25};
assert.equal(paginateBill(threeModelTiers,0,threeModelPaper).length,1,'Three-model recent bill must fit one sheet');
assert.equal(paginateBill(threeModelTiers,0,{...threeModelPaper,ending:123.25}).length,2,'An ending that exceeds paper capacity must move intact');
assert.deepEqual(paginateBill(threeModelTiers,0,threeModelPaper).flat(),threeModelTiers);
