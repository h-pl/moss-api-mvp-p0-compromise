'use client';
import { useEffect, useMemo, useState } from 'react';
import { Context, DAY, Filters, isAllSelection, matchesSelection, selectionValues, selectionLabel, monitoringKeyLimit, KeyRecord, RequestRecord, aggregate, concurrencyPeak, contextModels, csv, dateKey, filterRequests, makeConcurrencySamples, settledUsageCutoff, usageModels as models, requestEndpoint, points, rangeFor, timeLabel } from './data';
import { Dialog, Empty, Help, Icon, Pagination, Select } from './ui';
import { estimateYuan } from './pricing-data';
import { RekaTabs, RekaDateRangePicker, RekaMultiSelect } from './reka';
import BillPreview from './bill-preview';
import { UsageDocumentHeading, UsageDocumentSummary } from './usage-document';
import { billAmount } from './bill-data';
import FilterScopeSummary, { type FilterScope } from './filter-scope';
import { usageExport } from './export-data';
import { readUsageQuery, writeUsageQuery } from './usage-url';

type ExportKind = 'bill' | 'keys' | 'requests';
export default function Usage({ context, keys, requests, initialKey, balance, getCredits }: { context: Context; keys: KeyRecord[]; requests: RequestRecord[]; initialKey: string; balance: number; getCredits: () => void }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  const [initial] = useState(() => readUsageQuery(typeof window === 'undefined' ? '' : window.location.search, keys, now, initialKey));
  const [range, setRange] = useState(initial.range);
  const [custom, setCustom] = useState(initial.custom);
  const [model, setModel] = useState(initial.model);
  const [keyId, setKeyId] = useState(initial.key);
  const [tab, setTab] = useState<'overview' | 'requests'>(initial.tab);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [request, setRequest] = useState<RequestRecord | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 60_000) * 60_000), 60_000); return () => window.clearInterval(timer); }, []);
  const dates = range === 'custom' ? custom : rangeFor(range, now);
  const latestUsageDate = dateKey(now - DAY);
  const monthPending = range === 'month' && dates.from > dates.to;
  const invalidRange = !monthPending && (!dates.from || !dates.to || dates.from > dates.to || dates.to > latestUsageDate);
  const filters: Filters = { ...dates, model, key: keyId };
  const settledBefore = settledUsageCutoff(now);
  const rows = useMemo(() => invalidRange ? [] : filterRequests(requests, context, { from: dates.from, to: dates.to, model, key: keyId }, settledBefore).filter(request => request.cents > 0), [requests, context, dates.from, dates.to, model, keyId, settledBefore, invalidRange]);
  const summary = useMemo(() => aggregate(rows), [rows]);
  const sum = rows.reduce((n, r) => n + r.cents, 0);
  const total = requests.filter(r => r.context === context && r.start < settledBefore).reduce((n, r) => n + r.cents, 0);
  const selectedKeys = keyId === 'all' ? [] : keys.filter(k => matchesSelection(keyId, k.id));
  const selectedKey = selectedKeys.length === 1 ? selectedKeys[0] : undefined;
  const available = contextModels(context);
  const keyChoices = keys.filter(k => model === 'all' || selectionValues(model).some(id => id in k.policies) || requests.some(r => r.keyId === k.id && matchesSelection(model, r.model)));
  const selectableKeys = keys.filter(k => keyChoices.includes(k) || selectedKeys.includes(k));
  const billScope = { key: selectionLabel(keyId, '全部 API Key', selectableKeys), allKeys: isAllSelection(keyId, selectableKeys.map(key => key.id)), keyCount: new Set(selectionValues(keyId)).size };
  const peakModels = available.filter(m => matchesSelection(model, m.id) && (keyId === 'all' || selectedKeys.some(key => monitoringKeyLimit(key, m.id) !== undefined) || requests.some(r => matchesSelection(keyId, r.keyId) && r.model === m.id)));
  const concurrencySamples = useMemo(() => makeConcurrencySamples(now), [now]);
  const peaks = useMemo(() => Object.fromEntries(models.map(m => [m.id, concurrencyPeak(concurrencySamples, context, m.id, keyId, now)])), [concurrencySamples, context, keyId, now]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  useEffect(() => {
    const query = writeUsageQuery(window.location.search, { range, custom, model, key: keyId, tab, page: currentPage, pageSize });
    const url = `${window.location.pathname}?${query}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, '', url);
  }, [range, custom, model, keyId, tab, currentPage, pageSize]);
  const rangeLabel = range === 'custom' ? `${dates.from} 至 ${dates.to}` : range === 'month' ? '本月' : `近 ${range} 天`;
  return <main id="main-content" className="p-main p-usage"><div className="p-usage-title"><span>账单与用量</span><h1>用量与积分</h1></div>
    <section className="p-stats p-account-stats" aria-label="账户积分"><article><h2>积分余额</h2><div><strong><Icon name="wallet" size={21} />{points(balance)}</strong><button className="p-button p-primary p-pill" onClick={getCredits}>获取积分</button></div></article><article><h2>累计消耗积分</h2><strong>{points(total)}</strong></article></section>
    <section className="p-usage-filters" aria-label="用量筛选"><div><Select className="p-pill-select p-time-select" aria-label="时间范围" value={range} onValueChange={value => { setRange(value); setPage(1); }}><option value="7">近 7 天</option><option value="month">本月</option><option value="custom">自定义时间</option></Select><RekaMultiSelect className="p-pill-select p-model-select" label="模型筛选" value={model} onValueChange={value => { setModel(value); setPage(1); }} allLabel="全部模型" itemLabel="模型" options={models.filter(m => context === 'enterprise' || m.kind !== 'LLM').map(m => ({ value: m.id, label: m.id }))} /><RekaMultiSelect className="p-pill-select p-key-select" menuClassName="p-key-multi-select-content" label="Key 筛选" value={keyId} onValueChange={value => { setKeyId(value); setPage(1); }} allLabel="全部 Key" itemLabel=" Key" options={selectableKeys.map(k => { const suffix = ` · ${k.masked.slice(-4)}${k.deletedAt ? '（已删除）' : !k.enabled ? '（已停用）' : ''}`; return { value: k.id, label: k.name + suffix, displayName: k.name, suffix }; })} /><Help text={context === 'enterprise' ? '筛选条件同时用于用量、账单和明细导出。并发峰值仅随模型、Key 筛选变化，固定统计近 24 小时。' : '筛选条件同时用于用量、账单和明细导出。'} /></div>
    {range === 'custom' ? <div className="p-date-range"><RekaDateRangePicker from={custom.from} to={custom.to} max={latestUsageDate} onValueChange={value => { setCustom(value); setPage(1); }} /></div> : null}
    {invalidRange ? <p role="alert" className="p-error">请选择有效日期范围，结束日期不得早于开始日期或晚于 {latestUsageDate}。</p> : null}<p className="p-data-note">所有时间均按北京时间（GMT+8）显示。用量数据每日更新，仅展示截至昨日的数据。</p></section>
    <section className="p-stats p-usage-stats" aria-label="用量统计"><article><h2>消耗积分</h2><strong>{points(sum)}</strong></article><article><h2>计费请求次数</h2><strong>{rows.length.toLocaleString()} <small>次</small></strong></article></section>
    {context === 'enterprise' ? <section className="p-panel p-concurrency" aria-label="近 24 小时并发峰值"><div className="p-section-heading"><div><h2>近 24h 并发峰值 <Help text={`近 24 小时的最高同时处理请求数 / 当前${keyId === 'all' ? '企业' : selectedKeys.length > 1 ? '所选 Key 合计（不超过企业上限）' : 'Key'}并发上限。绿色低于 80%，橙色为 80% 至不足 100%，红色为达到或超过上限；不代表当前并发。`} /></h2></div><small>更新于 {timeLabel(now).slice(5, 16)}</small></div>
      {peakModels.length ? <div key={`${context}:${model}:${keyId}`} className={`p-peaks${peakModels.length > 6 ? " p-peaks-expanded" : ""}`} style={{ gridTemplateColumns: `repeat(${peakModels.length > 6 ? 4 : Math.min(6, peakModels.length)}, minmax(0, 1fr))` }}>{peakModels.map(m => { const p = peaks[m.id]; const limit = keyId === 'all' ? m.limit : selectedKey ? monitoringKeyLimit(selectedKey, m.id) : (Math.min(m.limit, selectedKeys.filter(key => key.enabled && !key.deletedAt).reduce((sum, key) => sum + (monitoringKeyLimit(key, m.id) ?? 0), 0)) || undefined); const inactive = selectedKey && (selectedKey.deletedAt || !selectedKey.enabled); const ratio = limit ? p.peak / limit : 0; return <article key={m.id}><div className="p-peak-name"><span className="p-model-ellipsis" title={m.id}>{m.id}</span>{inactive ? <span className="p-muted">{selectedKey?.deletedAt ? 'Key 已删除' : 'Key 已停用'}</span> : null}</div><div className="p-peak-value"><strong>{p.peak}</strong><span>/ {limit ?? '未授权'} {limit ? '路' : ''}</span></div><div className={`p-meter ${ratio >= 1 ? 'p-meter-full' : ratio >= .8 ? 'p-meter-near' : ''}`} role="meter" aria-label={`${m.id} 峰值占当前上限`} aria-valuenow={Math.min(p.peak, limit ?? p.peak)} aria-valuemin={0} aria-valuemax={limit ?? Math.max(p.peak, 1)} aria-valuetext={`近24小时峰值 ${p.peak}，当前上限 ${limit ?? '未授权'}`}><span style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>{limit && ratio >= .8 ? <small className={ratio >= 1 ? 'p-peak-status-full' : 'p-peak-status-near'}>{p.peak > limit ? '历史峰值高于当前上限' : ratio >= 1 ? '峰值达到上限' : '峰值接近上限'}</small> : null}</article>; })}</div> : <Empty>{model === 'kimi-k3' ? '该模型暂无并发监控数据。' : '该 Key 未授权所选模型，且没有对应的历史请求。'}</Empty>}
    </section> : null}
    <RekaTabs value={tab} onValueChange={value => setTab(value as 'overview' | 'requests')} items={[{ value: 'overview', label: '用量概览' }, { value: 'requests', label: '请求用量明细' }]} toolbar={<div className="p-export-actions"><button className="p-button" disabled={!rows.length || invalidRange} onClick={() => setExporting('bill')}><Icon name="download" />导出账单</button><button className="p-button" disabled={!rows.length || invalidRange} onClick={() => setExporting('keys')}><Icon name="download" />导出明细</button></div>}>{tab === 'overview' ? <><section className="p-panel p-trend"><h2>积分使用趋势</h2><p className="p-muted">{rangeLabel}，按模型消耗汇总</p>{monthPending ? <Empty>本月暂无已同步数据</Empty> : <Trend key={`${dates.from}:${dates.to}:${model}:${keyId}`} rows={rows} from={dates.from} to={dates.to} settledBefore={settledBefore} />}</section><section className="p-model-usage"><h2>模型用量概览 <Help text="请求次数仅统计实际扣除积分的请求，消耗积分已包含模型折扣。" /></h2><div className="p-table-scroll"><table><thead><tr><th>模型</th><th className="p-number">计费请求次数（次）</th><th className="p-number">计费用量</th><th className="p-number">消耗积分</th><th className="p-number">折算金额</th><th className="p-number">操作</th></tr></thead><tbody>{summary.map(r => <tr key={r.model}><td><strong className="p-model-title">{r.model}</strong><small className="p-muted">{models.find(m => m.id === r.model)?.kind} · {requestEndpoint(r.model)}</small></td><td className="p-number">{r.billedCount.toLocaleString()}</td><td className="p-number">{usageUnits(r.model, r.units)}</td><td className="p-number">{points(r.cents)} 积分</td><td className="p-number">{estimateAmount(r.cents)}</td><td className="p-number"><button className="p-text-button" onClick={() => { setModel(r.model); setTab('requests'); setPage(1); }}>查看明细</button></td></tr>)}</tbody>{summary.length ? <tfoot><tr><th>合计</th><td className="p-number">{summary.reduce((n, r) => n + r.billedCount, 0).toLocaleString()}</td><td className="p-number">{['TTS', 'ASR', 'LLM'].map(kind => { const group = summary.filter(r => models.find(m => m.id === r.model)?.kind === kind); return group.length ? <div key={kind}>{usageUnits(group[0].model, group.reduce((n, r) => n + r.units, 0))}</div> : null; })}</td><td className="p-number">{points(sum)} 积分</td><td className="p-number">{estimateAmount(sum)}</td><td /></tr></tfoot> : null}</table>{!rows.length ? <Empty>{monthPending ? '本月暂无已同步数据' : '所选范围内暂无已同步的用量数据。'}</Empty> : null}</div></section></> : <section className="p-request-table"><div className="p-table-scroll" role="region" aria-label="请求用量明细" tabIndex={0}><table>
      <colgroup>{[17, 20, 13, 11, 16, 6, 10, 7].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr>{['请求时间（北京时间）', '请求 ID', 'API Key 名称', '接口', '计费模型', '请求状态', '计费用量', '消耗积分'].map((label, index) => <th key={label} scope="col" className={index >= 6 ? 'p-number' : undefined}><span className="p-request-truncate" title={label}>{label}</span></th>)}</tr></thead>
      <tbody>{rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(r => {
        const keyName = keys.find(k => k.id === r.keyId)?.name ?? r.keyId;
        const time = timeLabel(r.start);
        const usage = `${r.units.toLocaleString('zh-CN')} ${models.find(m => m.id === r.model)?.unit ?? ''}`;
        const credits = points(r.cents);
        return <tr key={r.id}>
          <td><span className="p-request-truncate" title={time}>{time}</span></td>
          <td><button className="p-request-id p-request-truncate" title={r.id} onClick={() => setRequest(r)}>{r.id}</button></td>
          <td><span className="p-request-truncate" title={keyName}>{keyName}</span></td>
          <td><code className="p-request-truncate" title={requestEndpoint(r.model)}>{requestEndpoint(r.model)}</code></td>
          <td><code className="p-request-truncate" title={r.model}>{r.model}</code></td>
          <td><span className={`p-request-status ${r.status === '成功' ? 'is-success' : 'is-failed'}`}><span className="p-request-truncate" title={r.status}>{r.status}</span></span></td>
          <td className="p-number"><span className="p-request-truncate" title={usage}>{usage}</span></td>
          <td className="p-number"><span className="p-request-truncate" title={credits}>{credits}</span></td>
        </tr>;
      })}</tbody></table>{!rows.length ? <Empty>{monthPending ? '本月暂无已同步数据' : '所选范围内暂无请求用量明细。您可以调整筛选条件，或等待次日同步。'}</Empty> : null}</div><Pagination count={rows.length} page={currentPage} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} /></section>}</RekaTabs>
    {exporting === 'bill' ? <BillPreview rows={rows} filters={filters} context={context} keys={keys} scope={billScope} close={() => setExporting(null)} /> : exporting ? <ExportDialog kind={exporting} setKind={setExporting} rows={rows} filters={filters} context={context} keys={keys} scope={billScope} close={() => setExporting(null)} /> : null}
    {request ? <Dialog title="请求详情" close={() => setRequest(null)}><div className="p-dialog-body"><dl className="p-request-detail">{[['请求 ID', request.id], ['请求时间（北京时间）', timeLabel(request.start)], ['API Key 名称', keys.find(k => k.id === request.keyId)?.name ?? request.keyId], ['Key ID', request.keyId], ['计费模型', request.model], ['接口', requestEndpoint(request.model)], ['请求状态', request.status], ['计费用量', `${request.units} ${models.find(m => m.id === request.model)?.unit}`], ['消耗积分', points(request.cents)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><footer><button className="p-button p-primary" onClick={() => setRequest(null)}>关闭</button></footer></Dialog> : null}
  </main>;
}
function Trend({ rows, from, to, settledBefore }: { rows: RequestRecord[]; from: string; to: string; settledBefore: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    const start = new Date(`${from}T00:00:00+08:00`).getTime(), end = new Date(`${to}T00:00:00+08:00`).getTime();
    // Bound chart marks, while keeping the underlying query/export range intact.
    const step = Math.max(1, Math.ceil((end - start + DAY) / DAY / 60));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
    for (let date = start; date <= end; date += step * DAY) map.set(dateKey(date), {});
    for (const r of rows) { const bucket = dateKey(start + Math.floor((r.start - start) / (step * DAY)) * step * DAY); const day = map.get(bucket); if (day) day[r.model] = (day[r.model] ?? 0) + r.cents; }
    return [...map.entries()].map(([date, values]) => ({ date, values, total: Object.values(values).reduce((a, b) => a + b, 0), step }));
  }, [rows, from, to]);
  if (!rows.length || !days.length) return <Empty>暂无积分使用数据</Empty>;
  const max = Math.max(...days.map(d => d.total), 100);
  const ceiling = Math.ceil(max / 500) * 500;
  const plot = { x: 48, y: 12, width: 890, height: 200 };
  const w = plot.width / days.length;
  const tickCount = Math.min(7, days.length);
  const ticks = new Set(Array.from({ length: tickCount }, (_, i) => tickCount === 1 ? 0 : Math.round(i * (days.length - 1) / (tickCount - 1))));
  const active = days.find(d => d.date === selected);
  return <div className="p-trend-chart" onMouseLeave={() => setSelected(null)} onKeyDown={e => { if (e.key === 'Escape') setSelected(null); }}><div className="p-chart-legend">{models.filter(m => rows.some(r => r.model === m.id)).map(m => <span key={m.id}><i style={{ background: m.color }} />{m.id}</span>)}</div><svg viewBox="0 0 960 255" role="group" aria-label="积分使用趋势，按日期查看各模型积分">{[0, 1, 2, 3, 4].map(n => <g key={n}><line x1={plot.x} x2={plot.x + plot.width} y1={plot.y + n * 50} y2={plot.y + n * 50} stroke="#ddd" strokeDasharray="3 5" /><text x={plot.x - 10} y={plot.y + n * 50 + 4} textAnchor="end" fill="#858585" fontSize="11">{(ceiling * (4 - n) / 400).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}</text></g>)}{days.map((d, i) => { let offset = 0; return <g key={d.date} role="button" tabIndex={0} aria-label={`${d.date}${d.step > 1 ? `起 ${d.step} 天` : ''}，${d.date >= dateKey(settledBefore) ? "数据待同步" : `消耗 ${points(d.total)} 积分`}`} onMouseEnter={() => setSelected(d.date)} onFocus={() => setSelected(d.date)} onClick={() => setSelected(d.date)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(d.date); } }}><rect x={plot.x + i * w} y={plot.y} width={w} height={plot.height} fill={selected === d.date ? '#eaeaea' : 'transparent'} />{models.map(m => { const height = (d.values[m.id] ?? 0) / ceiling * plot.height; offset += height; return <rect className="p-growing-bar" key={m.id} x={plot.x + i * w + w * .23} y={plot.y + plot.height - offset} width={w * .54} height={height} rx="2" fill={m.color} />; })}{ticks.has(i) ? <text x={plot.x + (i + .5) * w} y="237" textAnchor="middle" fill="#777" fontSize="11">{(i === days.length - 1 ? to : d.date).slice(5)}</text> : null}</g>; })}</svg>{active ? <div className="p-chart-callout" role="tooltip" style={{ left: `${Math.min(68, Math.max(0, (days.findIndex(d => d.date === selected) + .5) / days.length * 100))}%` }}><header><strong>{active.date}</strong><span>{active.date >= dateKey(settledBefore) ? '数据待同步' : `消耗积分 ${points(active.total)}`}</span></header>{models.filter(m => active.values[m.id]).map(m => <div key={m.id}><span>{m.id}</span><b>{points(active.values[m.id])}</b></div>)}</div> : null}<div className="p-sr-only" aria-live="polite">{active ? `${active.date}${active.step > 1 ? ` 起 ${active.step} 天` : ''}：${active.date >= dateKey(settledBefore) ? '数据待同步' : models.filter(m => active.values[m.id]).map(m => `${m.id} ${points(active.values[m.id])} 积分`).join('；') || '无消耗'}` : '将鼠标移至柱形，或使用 Tab 键查看对应日期的积分消耗。'}</div></div>;
}
function ExportDialog({ kind, setKind, rows, filters, context, keys, scope, close }: { kind: Exclude<ExportKind, 'bill'>; setKind: (kind: ExportKind) => void; rows: RequestRecord[]; filters: Filters; context: Context; keys: KeyRecord[]; scope: FilterScope; close: () => void }) {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const summary = aggregate(rows, true);
  const title = '导出明细';
  const account = context === 'enterprise' ? '星河科技' : '林晓 · 2090649342695182666';
  const totalCents = rows.reduce((sum, row) => sum + row.cents, 0);
  const downloadedRows = kind === 'requests' ? rows.length : summary.length;
  const download = () => {
    try {
      const { headers, data } = usageExport(kind, rows, keys, account, filters);
      const blob = new Blob([csv(headers, data)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
      const downloadedAt = timeLabel(Date.now()).replace(' ', '_').replaceAll(':', '-');
      a.download = `${account}_${kind === 'keys' ? '用量汇总_按模型与API Key' : '请求用量明细'}_${filters.from}至${filters.to}_导出于${downloadedAt}_UTC+8.csv`;
      document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setDone(true); setError('');
    } catch { setError('导出失败，请重试。'); }
  };
  const billedCount = summary.reduce((sum, row) => sum + row.billedCount, 0);
  const month = filters.from.slice(0, 7) === filters.to.slice(0, 7) ? `${filters.from.slice(0, 4)}年${Number(filters.from.slice(5, 7))}月用量明细` : '用量明细';
  const totalUnits = ['TTS', 'ASR', 'LLM'].flatMap(kind => {
    const group = summary.filter(row => models.find(model => model.id === row.model)?.kind === kind);
    return group.length ? [usageUnits(group[0].model, group.reduce((sum, row) => sum + row.units, 0))] : [];
  });
  return <Dialog title={title} close={close} className="p-bill-dialog p-usage-export-dialog">
    <div className="p-dialog-body"><div className="p-bill-page"><article className="p-bill-document" aria-label={`${account}用量明细`}>
      <div className="p-bill-content">
      <UsageDocumentHeading title="用量明细" account={account} month={month} period={`${filters.from} 至 ${filters.to}`} periodLabel="统计周期" />
      <UsageDocumentSummary primaryLabel="导出记录" primaryValue={downloadedRows} primaryUnit="条" billedCount={billedCount} cents={totalCents} amountLabel="折算金额" />
      <section className="p-bill-details" aria-labelledby="export-details-title">
        <div className="p-bill-section-heading"><h2 id="export-details-title">计费明细</h2><FilterScopeSummary scope={scope} /></div>
        <fieldset className="p-export-kind" aria-label="导出方式">
          <label><input type="radio" name="export-kind" checked={kind === 'keys'} onChange={() => { setKind('keys'); setDone(false); }} />用量汇总（按模型与 API Key）</label>
          <label><input type="radio" name="export-kind" checked={kind === 'requests'} onChange={() => { setKind('requests'); setDone(false); }} />请求用量明细</label>
        </fieldset>
        {kind === 'keys' ? <div className="p-bill-table" role="region" aria-label="用量汇总（按模型与 API Key）" tabIndex={0}>
          <table><thead><tr><th scope="col">计费模型</th><th scope="col">API Key 名称</th><th scope="col" className="p-number">计费请求次数</th><th scope="col" className="p-number">计费用量</th><th scope="col" className="p-number">消耗积分</th><th scope="col" className="p-number">折算金额</th></tr></thead>
            <tbody>{summary.map(r => <tr key={r.model + r.keyId}>
              <td><b className="p-bill-model">{r.model}</b><small className="p-bill-kind">{models.find(model => model.id === r.model)?.kind}</small></td>
              <td><span className="p-export-key" title={keys.find(k => k.id === r.keyId)?.name ?? '—'}>{keys.find(k => k.id === r.keyId)?.name ?? '—'}</span></td><td className="p-number">{r.billedCount.toLocaleString('zh-CN')}</td><td className="p-number">{usageUnits(r.model, r.units)}</td><td className="p-number">{points(r.cents)} 积分</td><td className="p-number">{billAmount(r.cents)}</td>
            </tr>)}</tbody>
            <tfoot><tr><th colSpan={2} scope="row">合计</th><td className="p-number">{billedCount.toLocaleString('zh-CN')}</td><td className="p-number">{totalUnits.map(unit => <div key={unit}>{unit}</div>)}</td><td className="p-number">{points(totalCents)} 积分</td><td className="p-number">{billAmount(totalCents)}</td></tr></tfoot>
          </table>
        </div> : <p className="p-export-request-summary">将导出当前筛选范围内的全部计费请求，不受页面分页影响。</p>}
      </section>
      </div>
      {error ? <p className="p-error" role="alert">{error}</p> : null}
    </article></div></div>
    <footer><button className="p-button" onClick={close}>关闭</button><button className="p-button p-primary" onClick={download}><Icon name="download" />{done ? '重新下载 CSV' : '下载 CSV'}</button></footer>
  </Dialog>;
}

function usageUnits(model: string, units: number) { return models.find(m => m.id === model)?.kind === 'ASR' ? `${(units / 3600).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 小时` : model === 'kimi-k3' ? `${(units / 1_000_000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M tokens` : `${units.toLocaleString()} 字符`; }
function estimateAmount(cents: number) { return `￥${estimateYuan(cents).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
