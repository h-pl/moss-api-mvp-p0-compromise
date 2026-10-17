import assert from 'node:assert/strict';
import { makeInitialUsageLedger, migrateUsageLedger, HISTORICAL_BILL_PERIOD } from '../app/platform/usage-ledger.ts';
import { extendUsageCalendar } from '../app/platform/usage-calendar.ts';
import { applyRecentTierFixture } from '../app/platform/recent-tier-fixture.ts';
import { chargeCents, rateFor } from '../app/platform/pricing-data.ts';
import { makeUsageRequests, filterRequests, makeStore, aggregate, distributeMockUsageKeys, rangeFor, settledUsageCutoff } from '../app/platform/data.ts';
import { usageExport } from '../app/platform/export-data.ts';
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
assert.equal(migrated.version, 8);
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

const unspread = distributeMockUsageKeys(extendUsageCalendar(applyRecentTierFixture(rows),anchor),anchor);
const duplicated = ordinary.filter(row=>row.context==='enterprise' && row.start>=Date.parse('2026-09-01T00:00:00+08:00') && row.start<Date.parse('2026-09-08T00:00:00+08:00'));
const repaired = migrateUsageLedger({...migrated,version:2,rows:[...unspread,...duplicated]},anchor);
assert.deepEqual(billTotals(billGroups(repaired.rows,'enterprise',historical)),billTotals(mockBillGroups()));
assert.deepEqual(repaired.rows,migrated.rows);

// Recent filtered totals remain consistent after daily redistribution.
const week = {from:'2026-10-09',to:'2026-10-15',key:'all',model:'all'};
const weekGroups = billGroups(migrated.rows,'enterprise',week);
assert.equal(billTotals(weekGroups).cents,filterRequests(migrated.rows,'enterprise',week).reduce((sum,row)=>sum+row.cents,0));
const upgraded = migrateUsageLedger({version:3,createdAt:anchor,rows},anchor);
assert.deepEqual(upgraded,migrated);

// A saved v4 browser ledger must be repaired without recreating keys or requests.
const legacyPersonal = rows.map(row => {
  if (row.context !== 'personal') return row;
  const rate = { ...row.rate, version: 'platform-list-2026-09', standardCents: row.model === 'moss-transcribe' ? 1300 : row.model === 'moss-transcribe-diarize-pro' ? 1700 : 2000, minimumCents: row.model.includes('transcribe') ? 2 : 10 };
  return { ...row, rate, cents: chargeCents(row.units, rate) };
});
const saved = {version:4, createdAt:anchor, rows:legacyPersonal};
const savedCopy = structuredClone(saved);
const fixed = migrateUsageLedger(saved, anchor);
assert.equal(fixed.version, 8);
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

// Current-month preview must show all three tiers before the T−1 cutoff.
const now = Date.parse('2026-10-17T12:00:00+08:00');
const currentScope = {...rangeFor('month', now), model:'all', key:'all'};
const current = filterRequests(migrated.rows,'enterprise',currentScope,settledUsageCutoff(now));
const currentGroups = billGroups(current,'enterprise',currentScope);
const currentKimi = currentGroups.filter(group=>group.model==='kimi-k3');
const currentAsr = currentGroups.find(group=>group.model==='moss-transcribe');
assert.deepEqual(currentKimi.map(group=>group.threshold), ['≤100','>100','>200']);
assert.deepEqual(currentAsr.lines.map(line=>line.threshold), ['≤500','>500','>1,000']);
for (const group of currentKimi.slice(0,2)) assert.ok(Math.abs(group.lines.reduce((sum,line)=>sum+line.units,0)-100)<1e-7);
assert.ok(currentKimi[2].lines.every(line=>line.units>0));
assert.ok(Math.abs(currentAsr.lines[0].units-500)<1e-7);
assert.ok(Math.abs(currentAsr.lines[1].units-500)<1e-7);
assert.ok(currentAsr.lines[2].units>0);
const currentCents = current.reduce((sum,row)=>sum+row.cents,0);
assert.equal(billTotals(currentGroups).cents,currentCents);
for (const kind of ['keys','requests']) {
  const exported=usageExport(kind,current,keyStore.keys,'星河科技',currentScope);
  const pointIndex=exported.headers.indexOf('消耗积分');
  const yuanIndex=exported.headers.indexOf('折后金额（元）');
  assert.equal(exported.data.reduce((sum,row)=>sum+Math.round(Number(row[pointIndex])*100),0),currentCents);
  assert.equal(exported.data.reduce((sum,row)=>sum+Math.round(Number(row[yuanIndex])*10000),0),currentCents*5);
}
// Model a v6 cache with an incomplete October tail, retaining all other data.
const octoberTail=row=>row.context==='enterprise'&&['kimi-k3','moss-transcribe'].includes(row.model)&&row.id.startsWith('req_ledger_2026-10-');
const legacyTail=unspread.filter(row=>!octoberTail(row)||row.id.endsWith('_0'));
const legacyV6={version:6,createdAt:anchor,rows:legacyTail};
const legacyCopy=structuredClone(legacyV6);
const upgradedV7=migrateUsageLedger(legacyV6,anchor);
assert.equal(upgradedV7.version,8);
assert.deepEqual(legacyV6,legacyCopy);
assert.deepEqual(upgradedV7.rows.filter(row=>row.context==='personal'),legacyTail.filter(row=>row.context==='personal'));
assert.deepEqual(upgradedV7.rows,migrated.rows);
assert.equal(migrateUsageLedger(upgradedV7,anchor),upgradedV7);
console.log('Current-month three tiers verified: October 16 settlement, exact tier boundaries, both exports, scoped v6 migration and refresh idempotence.');

// v7 -> v8 preserves all billed values; only the current-month demo timing moves.
const v7={version:7,createdAt:anchor,rows:unspread};
const beforeV7=structuredClone(v7);
const spread=migrateUsageLedger(v7,anchor);
assert.deepEqual(v7,beforeV7);
assert.deepEqual(spread.rows,migrated.rows);
assert.equal(migrateUsageLedger(spread,anchor),spread);
const byId=new Map(unspread.map(row=>[row.id,row]));
for(const row of spread.rows) {
  const before=byId.get(row.id);
  assert.deepEqual({...row,start:before.start,end:before.end,keyId:before.keyId},before);
  if(row.start!==before.start) assert.equal(row.end-row.start,before.end-before.start);
}
assert.deepEqual(billTotals(currentGroups),billTotals(billGroups(unspread,'enterprise',currentScope)));
const totalsByDay=Array.from({length:16},(_,i)=> {
  const day='2026-10-'+String(i+1).padStart(2,'0');
  return current.filter(row=>new Date(row.start+8*3600_000).toISOString().startsWith(day)).reduce((sum,row)=>sum+row.cents,0);
});
const mean=totalsByDay.reduce((sum,n)=>sum+n,0)/totalsByDay.length;
assert.ok(totalsByDay.every(n=>n>mean*.65 && n<mean*1.35),'No day may dominate the monthly chart');
assert.ok(new Set(totalsByDay).size>8,'Daily usage should have modest variation');
for(const model of ['kimi-k3','moss-transcribe']) {
  const ordered=current.filter(row=>row.model===model).sort((a,b)=>a.start-b.start);
  const labels=model==='kimi-k3'?['≤100','>100','>200']:['≤500','>500','>1,000'];
  let lastTier=0;
  for(const row of ordered) {
    if(!row.billing) continue;
    const tier=labels.indexOf(row.billing.threshold??row.billing.lines[0].threshold);
    assert.ok(tier>=lastTier,'Redistribution must preserve progressive pricing order');
    lastTier=tier;
  }
  assert.equal(lastTier,2);
}
console.log('Daily distribution verified:',totalsByDay.map(n=>n/100),'points; monthly charges and all three tiers preserved.');
