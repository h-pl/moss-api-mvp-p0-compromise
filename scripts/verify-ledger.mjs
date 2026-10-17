import assert from 'node:assert/strict';
import { makeInitialUsageLedger, migrateUsageLedger, HISTORICAL_BILL_PERIOD } from '../app/platform/usage-ledger.ts';
import { chargeCents, rateFor } from '../app/platform/pricing-data.ts';
import { makeUsageRequests, filterRequests, makeStore, aggregate, distributeMockUsageKeys } from '../app/platform/data.ts';
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
assert.equal(migrated.version, 6);
assert.deepEqual(billTotals(billGroups(migrated.rows, 'enterprise', historical)), billTotals(mockBillGroups()));
assert.equal(migrateUsageLedger(migrated, anchor), migrated, 'Migration must not recreate saved data on refresh');
assert.equal(new Set(migrated.rows.map(row => row.id)).size, migrated.rows.length);
const recentScope = { from: '2026-10-01', to: '2026-10-15', key: 'all', model: 'all' };
const financial = selected => selected.map(row => { const copy = {...row}; delete copy.billing; delete copy.keyId; return copy; });
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

// A saved v4 browser ledger must be repaired without recreating keys or requests.
const legacyPersonal = rows.map(row => {
  if (row.context !== 'personal') return row;
  const rate = { ...row.rate, version: 'platform-list-2026-09', standardCents: row.model === 'moss-transcribe' ? 1300 : row.model === 'moss-transcribe-diarize-pro' ? 1700 : 2000, minimumCents: row.model.includes('transcribe') ? 2 : 10 };
  return { ...row, rate, cents: chargeCents(row.units, rate) };
});
const saved = {version:4, createdAt:anchor, rows:legacyPersonal};
const savedCopy = structuredClone(saved);
const fixed = migrateUsageLedger(saved, anchor);
assert.equal(fixed.version, 6);
assert.equal(fixed.rows.length, saved.rows.length);
assert.deepEqual(saved, savedCopy);
assert.deepEqual(financial(fixed.rows.filter(row=>row.context==='enterprise')), financial(saved.rows.filter(row=>row.context==='enterprise')));
for (const [index, row] of fixed.rows.entries()) {
  const before = saved.rows[index];
  assert.equal(row.id, before.id);
  assert.equal(row.units, before.units);
  assert.equal(row.start, before.start);
  if (row.context === 'personal') {
    assert.deepEqual(row.rate, rateFor('personal',row.model));
    assert.equal(row.cents, chargeCents(row.units,row.rate));
  }
}
assert.equal(migrateUsageLedger(fixed, anchor), fixed);
const personalBill = billGroups(fixed.rows, 'personal', {...historical});
for (const group of personalBill) assert.deepEqual(group.lines[0].rates, [group.model==='moss-transcribe'?'0.800 元 / 小时':group.kind==='ASR'?'2.000 元 / 小时':'2.000 元 / 万字符']);
assert.equal(billTotals(personalBill).cents, filterRequests(fixed.rows,'personal',historical).reduce((sum,row)=>sum+row.cents,0));
console.log('Personal pricing verified against official rates; v4 snapshots repaired once, enterprise history unchanged.');

// Expanded Key fixtures have actual detail rows, while global bill totals remain exact.
const keyAnchor = Date.parse('2026-10-17T12:00:00+08:00');
const keyStore = makeStore(keyAnchor);
const keySource = makeUsageRequests(keyAnchor);
const distributed = distributeMockUsageKeys(keySource, keyAnchor);
const keyMap = new Map(keyStore.keys.map(key=>[key.id,key]));
assert.equal(distributed.length,keySource.length);
for (let i=0;i<distributed.length;i++) {
  const row=distributed[i], before=keySource[i];
  assert.deepEqual({...row,keyId:before.keyId},before);
  if(row.keyId!==before.keyId) {
    assert.ok(keyMap.get(row.keyId).createdAt<=row.start);
    assert.ok(keyMap.get(row.keyId).policies[row.model]);
  }
}
assert.deepEqual(distributeMockUsageKeys(distributed,keyAnchor),distributed);
const detailScope={from:'2026-10-10',to:'2026-10-16',model:'all',key:'all'};
const detailed=filterRequests(distributed,'enterprise',detailScope);
const keyCount=new Set(detailed.map(row=>row.keyId)).size;
assert.ok(keyCount>30,`Expected >30 keys with actual requests, got ${keyCount}`);
assert.deepEqual(aggregate(detailed),aggregate(filterRequests(keySource,'enterprise',detailScope)));
assert.equal(aggregate(detailed,true).reduce((n,row)=>n+row.cents,0),billTotals(billGroups(distributed,'enterprise',detailScope)).cents);
const onlyNew=filterRequests(distributed,'enterprise',{...detailScope,key:'ent-key-list-mock-1'});
assert.ok(onlyNew.length>0);
assert.ok(onlyNew.every(row=>row.keyId==='ent-key-list-mock-1'));
const v5={version:5,createdAt:keyAnchor,rows:keySource};
const v6=migrateUsageLedger(v5,keyAnchor);
assert.deepEqual(v6.rows,distributed);
assert.equal(migrateUsageLedger(v6,keyAnchor),v6);
console.log(`Expanded Key details verified: ${keyCount} keys in recent week; global totals, personal rows and original request snapshots preserved.`);
