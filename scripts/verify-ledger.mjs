import assert from 'node:assert/strict';
import { makeInitialUsageLedger, migrateUsageLedger, HISTORICAL_BILL_PERIOD } from '../app/platform/usage-ledger.ts';
import { makeUsageRequests, filterRequests } from '../app/platform/data.ts';
import { billGroups, billTotals } from '../app/platform/bill-data.ts';
import { mockBillGroups } from '../app/platform/bill-fixture.ts';
const anchor = Date.parse('2026-09-14T18:07:00+08:00');
const rows = makeInitialUsageLedger(anchor);
assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
const historical = { ...HISTORICAL_BILL_PERIOD, key: 'all', model: 'all' };
assert.deepEqual(billTotals(billGroups(rows, 'enterprise', historical)), billTotals(mockBillGroups()));
const ordinary = makeUsageRequests(anchor);
for (const range of [{from:'2026-10-01',to:'2026-10-31'}, {from:'2026-10-09',to:'2026-10-15'}]) {
  const scope = {...range, key:'all', model:'all'};
  assert.deepEqual(filterRequests(rows, 'enterprise', scope), filterRequests(ordinary, 'enterprise', scope));
}
assert.deepEqual(rows.filter(row=>row.context==='personal'), ordinary.filter(row=>row.context==='personal'));
// The saved structured data includes every request and rate snapshot, not a generator seed.
const restored = structuredClone(rows);
assert.deepEqual(billTotals(billGroups(restored, 'enterprise', historical)), billTotals(mockBillGroups()));
assert.deepEqual(restored, rows);
console.log(`Ledger checks passed: ${rows.length} durable requests; historical tiers; daily/monthly isolation; personal history preserved.`);

const migrated = migrateUsageLedger({ version: 1, createdAt: anchor, rows }, anchor);
assert.equal(migrated.version, 4);
assert.deepEqual(billTotals(billGroups(migrated.rows, 'enterprise', historical)), billTotals(mockBillGroups()));
assert.equal(migrateUsageLedger(migrated, anchor), migrated, 'Migration must not recreate saved data on refresh');
assert.equal(new Set(migrated.rows.map(row => row.id)).size, migrated.rows.length);
const recentScope = { from: '2026-10-01', to: '2026-10-15', key: 'all', model: 'all' };
const financial = selected => selected.map(row => { const copy = {...row}; delete copy.billing; return copy; });
assert.deepEqual(financial(filterRequests(migrated.rows, 'enterprise', recentScope).filter(row => !['kimi-k3','moss-transcribe'].includes(row.model))), financial(filterRequests(rows, 'enterprise', recentScope).filter(row => !['kimi-k3','moss-transcribe'].includes(row.model))));
assert.deepEqual(rows, restored, 'Migration must not mutate source records before committing');
for (const month of ['2026-10', '2026-11']) {
  const scope = {from: month+'-01', to: month+(month.endsWith('10')?'-31':'-30'), key:'all', model:'all'};
  const monthly = filterRequests(migrated.rows, 'enterprise', scope);
  const groups = billGroups(monthly, 'enterprise', scope);
  const kimi = groups.filter(group=>group.model==='kimi-k3');
  assert.deepEqual(kimi.map(group=>group.threshold), ['≤100','>100','>200']);
  for (const segment of kimi.slice(0,2)) assert.ok(Math.abs(segment.lines.reduce((sum,line)=>sum+line.units,0)-100)<1e-7);
  const asr = groups.find(group=>group.model==='moss-transcribe');
  assert.deepEqual(asr.lines.map(line=>line.threshold), ['≤500','>500','>1,000']);
  assert.ok(Math.abs(asr.lines[0].units-500)<1e-7);
  assert.ok(Math.abs(asr.lines[1].units-500)<1e-7);
  assert.equal(billTotals(groups).cents, monthly.reduce((sum,row)=>sum+row.cents,0));
  for (let day=1;day<=(month.endsWith('10')?31:30);day++) {
    const date = month+'-'+String(day).padStart(2,'0');
    assert.equal(new Set(monthly.filter(row=>new Date(row.start+8*3600000).toISOString().startsWith(date)).map(row=>row.model)).size,7);
  }
  console.log(month, JSON.stringify({tokens:kimi.reduce((sum,g)=>sum+g.lines.reduce((n,l)=>n+l.units,0),0),asrHours:asr.lines.reduce((sum,line)=>sum+line.units,0),points:billTotals(groups).cents/100,requests:monthly.length}));
}
console.log('Extended ledger verified through November: monthly resets, exact progressive boundaries, calendar completeness, idempotent migration.');

const duplicated = ordinary.filter(row=>row.context==='enterprise' && row.start>=Date.parse('2026-09-01T00:00:00+08:00') && row.start<Date.parse('2026-09-08T00:00:00+08:00'));
const repaired = migrateUsageLedger({...migrated,version:2,rows:[...migrated.rows,...duplicated]},anchor);
assert.deepEqual(billTotals(billGroups(repaired.rows,'enterprise',historical)),billTotals(mockBillGroups()));
assert.deepEqual(repaired.rows,migrated.rows);

// Recent usage crosses monthly thresholds without inflating recent requests/spend.
const week = {from:'2026-10-09',to:'2026-10-15',key:'all',model:'all'};
const weekGroups = billGroups(migrated.rows,'enterprise',week);
const weekKimi = weekGroups.filter(group=>group.model==='kimi-k3');
assert.deepEqual(weekKimi.map(group=>group.threshold), ['≤100','>100']);
assert.deepEqual(weekGroups.find(group=>group.model==='moss-transcribe').lines.map(line=>line.threshold), ['≤500','>500']);
const weekTotals = billTotals(weekKimi);
assert.ok(weekTotals.billedCount >= 100 && weekTotals.billedCount <= 250);
assert.ok(weekTotals.cents >= 10000 && weekTotals.cents < 100000);
assert.equal(billTotals(weekGroups).cents,filterRequests(migrated.rows,'enterprise',week).reduce((sum,row)=>sum+row.cents,0));
const upgraded = migrateUsageLedger({version:3,createdAt:anchor,rows},anchor);
assert.deepEqual(upgraded,migrated);
console.log('Recent week: Kimi and ASR cross tiers; Kimi remains below 1,000 points; v3 migration preserves other models.');
