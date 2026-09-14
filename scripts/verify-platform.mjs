import assert from 'node:assert/strict';
import { aggregate, concurrencyPeak, contextModels, csv, dateKey, filterRequests, makeRequests, makeStore, models, parseStore, rangeFor, validateKey, DAY } from '../app/platform/data.ts';
import { rateFor, ratePoints, chargeCents, estimateYuan } from '../app/platform/pricing-data.ts';
import { usageExport } from '../app/platform/export-data.ts';
import { readUsageQuery, writeUsageQuery } from '../app/platform/usage-url.ts';
let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`✓ ${name}`); };
const now = Date.parse('2026-09-14T10:00:00Z');
check('用量预设截至北京时间昨日，近 7 天包含七个完整日期', () => { assert.deepEqual(rangeFor('7', now), { from: '2026-09-07', to: '2026-09-13' }); assert.deepEqual(rangeFor('month', now), { from: '2026-09-01', to: '2026-09-13' }); assert.deepEqual(rangeFor('7', Date.parse('2026-09-13T16:00:00Z')), { from: '2026-09-07', to: '2026-09-13' }); });
const store = makeStore(now), requests = makeRequests(store.anchor), limits = contextModels('enterprise');
check('所有 fixture Key 均满足授权与单项并发边界', () => store.keys.forEach(k => assert.equal(validateKey(k.name, k.note, k.policies, contextModels(k.context)), null)));
check('共享池允许 Key 上限之和超过企业上限', () => { assert.ok(store.keys.filter(k => k.context === 'enterprise').reduce((sum, k) => sum + (k.policies[models[0].id] ?? 0), 0) > models[0].limit); });
for (const value of [0, -1, 1.5, 101, NaN]) check(`拒绝非法单项并发 ${value}`, () => assert.ok(validateKey('K', '', { [models[0].id]: value }, limits)));
check('允许边界 1 和企业上限', () => [1, 100].forEach(n => assert.equal(validateKey('K', '', { [models[0].id]: n }, limits), null)));
check('拒绝未授权模型与空授权', () => { assert.ok(validateKey('K', '', { unknown: 1 }, limits)); assert.ok(validateKey('K', '', {}, limits)); });
check('请求按企业与个人隔离', () => { const f = { ...rangeFor('30', now), model: 'all', key: 'all' }; assert.ok(filterRequests(requests, 'personal', f).every(r => r.context === 'personal')); assert.ok(filterRequests(requests, 'enterprise', f).every(r => r.context === 'enterprise')); });
const filters = { ...rangeFor('30', now), model: 'all', key: 'all' };
const rows = filterRequests(requests, 'enterprise', filters, Date.parse('2026-09-14T00:00:00+08:00'));
check('次日同步不包含当天未结算请求', () => assert.ok(rows.every(r => dateKey(r.start) < '2026-09-14')));
check('模型账单、模型-Key汇总与逐请求金额完全一致', () => { const total = rows.reduce((n, r) => n + r.cents, 0); for (const byKey of [true, false]) { const grouped = aggregate(rows, byKey); assert.equal(grouped.reduce((n, r) => n + r.cents, 0), total); assert.equal(grouped.reduce((n, r) => n + r.count, 0), rows.length); } });
check('模型与Key条件取交集', () => { const filtered = filterRequests(requests, 'enterprise', { ...filters, model: models[0].id, key: 'ent-key-1' }); assert.ok(filtered.length > 0); assert.ok(filtered.every(r => r.model === models[0].id && r.keyId === 'ent-key-1')); });
check('无交集返回空数据', () => assert.equal(filterRequests(requests, 'enterprise', { ...filters, model: models[2].id, key: 'ent-key-1' }).length, 0));
const event = (keyId, start, end) => ({ id: `${keyId}-${start}`, context: 'enterprise', keyId, model: 'm', start, end, units: 0, cents: 0, status: '成功' });
check('企业峰值不能累加各Key错峰峰值', () => { const sample = [event('a', now - 100, now - 80), event('a', now - 99, now - 81), event('b', now - 70, now - 50), event('b', now - 69, now - 51)]; assert.equal(concurrencyPeak(sample, 'enterprise', 'm', 'all', now).peak, 2); assert.equal(concurrencyPeak(sample, 'enterprise', 'm', 'a', now).peak, 2); });
check('结束边界不与同刻开始重复占用', () => assert.equal(concurrencyPeak([event('a', now - 20, now - 10), event('a', now - 10, now)], 'enterprise', 'm', 'all', now).peak, 1));
check('滚动24h计入跨窗口在途请求，不计未来请求', () => { const sample = [event('a', now - DAY - 100, now + 100), event('b', now - DAY - 100, now - DAY - 1), event('c', now + 1, now + 10)]; assert.equal(concurrencyPeak(sample, 'enterprise', 'm', 'all', now).peak, 1); });
check('共享峰值fixture不超过企业上限', () => { for (let day = 0; day < 29; day++) for (const model of models) assert.ok(concurrencyPeak(requests, 'enterprise', model.id, 'all', now - day * DAY).peak <= model.limit); });
check('编辑、停用、删除不改写历史计量记录', () => { const before = aggregate(rows, true); store.keys[0].policies = { [models[0].id]: 1 }; store.keys[0].enabled = false; store.keys[0].deletedAt = now; assert.deepEqual(aggregate(filterRequests(makeRequests(store.anchor), 'enterprise', filters, Date.parse('2026-09-14T00:00:00+08:00')), true), before); });
check('持久化仅保留掩码，不含完整密钥', () => { const serialized = JSON.stringify(store); assert.ok(!serialized.includes('sk-prototype-')); assert.deepEqual(parseStore(serialized), store); });
check('损坏数据明确报错，不自动覆盖', () => { assert.throws(() => parseStore('{bad')); assert.throws(() => parseStore('{"version":2}')); });
check('CSV兼容中文、引号、换行并防止公式注入', () => { const result = csv(['备注'], [['=1+1'], ['普通,"名称"\n第二行']]); assert.ok(result.startsWith('\uFEFF')); assert.ok(result.includes('"\'=1+1"')); assert.ok(result.includes('"普通,""名称""\n第二行"')); });
check('北京时间自然日边界', () => { assert.equal(dateKey(Date.parse('2026-09-13T16:00:00Z')), '2026-09-14'); });
check('企业每模型折扣分别生效', () => { assert.equal(ratePoints(rateFor('enterprise', models[0].id)), 16); assert.equal(ratePoints(rateFor('enterprise', models[1].id)), 18); assert.equal(ratePoints(rateFor('enterprise', models[2].id)), 11.05); });
check('个人价格不继承企业折扣', () => assert.equal(ratePoints(rateFor('personal', models[0].id)), 20));
check('计费按折扣、用量与单次最低消费结算', () => { const rate = rateFor('enterprise', models[0].id); assert.equal(chargeCents(10000, rate), 1600); assert.equal(chargeCents(1, rate), 10); assert.equal(chargeCents(0, rate), 0); assert.throws(() => chargeCents(-1, rate)); });
check('未知企业不能回退使用其他企业合同', () => assert.throws(() => rateFor('enterprise', models[0].id, 'unknown')));
check('请求保留结算费率快照并可重算金额', () => { for (const request of requests) { assert.ok(request.rate?.version); assert.equal(request.cents, chargeCents(request.units, request.rate)); } const rate = rateFor('enterprise', models[0].id); rate.discountBps = 1000; assert.equal(requests.find(r => r.context === 'enterprise' && r.model === models[0].id).rate.discountBps, 8000); });
check('计费次数排除零扣费请求但不改变请求总数', () => { const grouped = aggregate(rows); assert.equal(grouped.reduce((n, r) => n + r.billedCount, 0), rows.filter(r => r.cents > 0).length); assert.ok(grouped.reduce((n, r) => n + r.billedCount, 0) < rows.length); });
check('充值换算统一，金额不重复应用模型折扣', () => assert.equal(estimateYuan(chargeCents(10000, rateFor('enterprise', models[0].id))), 0.8));
check('六个授权模型均有企业计费与请求数据', () => { assert.equal(models.length, 6); for (const m of models) { assert.ok(rateFor('enterprise', m.id)); assert.ok(rows.some(r => r.model === m.id)); } });
check('旧数据扩充模型时保留原有Key', () => { const old = makeStore(now); old.keys = old.keys.filter(k => k.id !== 'ent-key-six-model-preview'); const migrated = parseStore(JSON.stringify(old)); assert.deepEqual(migrated.keys.slice(0, old.keys.length), old.keys); assert.equal(migrated.keys.filter(k => k.id === 'ent-key-six-model-preview').length, 1); });
check('两种 CSV 保留 Key ID、不导出请求次数，且列值保持对应', () => {
  const from = '2026-09-07', to = '2026-09-13';
  const sample = [
    { ...requests[0], keyId: store.keys[0].id, id: 'request-success', status: '成功', cents: 100, units: 500 },
    { ...requests[0], keyId: store.keys[0].id, id: 'request-failed', status: '失败', cents: 0, units: 0 },
  ];
  for (const kind of ['keys', 'requests']) {
    const result = usageExport(kind, sample, store.keys, '测试企业', { from, to, model: 'all', key: 'all' });
    assert.ok(result.headers.includes('Key ID'));
    assert.ok(!result.headers.includes('请求次数'));
    assert.ok(!result.headers.includes('计费版本'));
    for (const row of result.data) {
      assert.equal(row.length, result.headers.length);
      assert.equal(row[result.headers.indexOf('Key ID')], store.keys[0].id);
      assert.equal(row[result.headers.indexOf('API Key')], store.keys[0].name);
    }
    if (kind === 'keys') {
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0][result.headers.indexOf('计费请求次数')], 1);
      assert.equal(result.data[0][result.headers.indexOf('消耗积分')], '1.00');
    } else {
      assert.equal(result.data.length, 2);
      assert.equal(result.data[1][result.headers.indexOf('请求 ID')], 'request-failed');
      assert.equal(result.data[1][result.headers.indexOf('消耗积分')], '0.00');
    }
  }
});
check('月初本月不回退上个月，且没有可导出的已同步记录', () => {
  for (const day of ['2026-10-01', '2027-01-01', '2028-03-01']) {
    const instant = Date.parse(`${day}T00:00:00+08:00`);
    const range = rangeFor('month', instant);
    assert.equal(range.from, day);
    assert.ok(range.from > range.to);
    assert.equal(filterRequests(makeRequests(instant), 'enterprise', { ...range, model: 'all', key: 'all' }).length, 0);
  }
  assert.deepEqual(rangeFor('month', Date.parse('2026-10-02T00:00:00+08:00')), { from: '2026-10-01', to: '2026-10-01' });
});
check('两种 CSV 金额保留四位，汇总后与账单两位金额一致', () => {
  const billed = rows.filter(row => row.cents > 0);
  for (const kind of ['keys', 'requests']) {
    const result = usageExport(kind, billed, store.keys, '星河科技', filters);
    const amounts = result.data.map(row => row.at(-1));
    assert.ok(amounts.every(value => /^\d+\.\d{4}$/.test(value)));
    const tenThousandths = amounts.reduce((sum, value) => sum + Math.round(Number(value) * 10000), 0);
    const cents = billed.reduce((sum, row) => sum + row.cents, 0);
    assert.equal(tenThousandths, cents * 5);
    assert.equal((tenThousandths / 10000).toFixed(2), estimateYuan(cents).toFixed(2));
  }
});
check('URL 完整恢复筛选、请求页签和分页，保留其他参数', () => {
  const state = { range: 'custom', custom: { from: '2026-09-01', to: '2026-09-12' }, model: models[0].id, key: 'ent-key-1', tab: 'requests', page: 3, pageSize: 20 };
  const query = writeUsageQuery('?source=review', state);
  assert.equal(new URLSearchParams(query).get('source'), 'review');
  assert.deepEqual(readUsageQuery(query, store.keys, now), state);
  assert.equal(readUsageQuery('?key=ent-key-1', store.keys, now).key, 'ent-key-1');
  assert.equal(new URLSearchParams(writeUsageQuery(query, { ...state, range: '7' })).has('from'), false);
});
check('URL 非法参数回退，其他身份的 Key 不会进入筛选', () => {
  const state = readUsageQuery('?range=custom&from=2026-02-31&to=bad&model=unknown&key=ent-key-1&page=-1&pageSize=999&tab=unknown', store.keys.filter(key => key.context === 'personal'), now);
  assert.equal(state.range, '7'); assert.equal(state.model, 'all'); assert.equal(state.key, 'all');
  assert.equal(state.page, 1); assert.equal(state.pageSize, 10); assert.equal(state.tab, 'overview');
});
console.log(`\n${checks} platform business checks passed.`);
