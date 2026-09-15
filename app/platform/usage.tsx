'use client';
import { useEffect, useMemo, useState } from 'react';
import { Context, DAY, Filters, KeyRecord, RequestRecord, aggregate, concurrencyPeak, contextModels, csv, dateKey, filterRequests, makeConcurrencySamples, models, points, rangeFor, timeLabel } from './data';
import { Dialog, Empty, Help, Icon, Notice, Pagination, Select } from './ui';
import { discountLabel, ratePoints, estimateYuan } from './pricing-data';
import { RekaTabs, RekaDateRangePicker } from './reka';
import BillPreview from './bill-preview';
import ExportHeading from './export-heading';
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
  const settledBefore = new Date(`${dateKey(now)}T00:00:00+08:00`).getTime();
  const rows = useMemo(() => invalidRange ? [] : filterRequests(requests, context, { from: dates.from, to: dates.to, model, key: keyId }, settledBefore).filter(request => request.cents > 0), [requests, context, dates.from, dates.to, model, keyId, settledBefore, invalidRange]);
  const summary = useMemo(() => aggregate(rows), [rows]);
  const sum = rows.reduce((n, r) => n + r.cents, 0);
  const total = requests.filter(r => r.context === context && r.start < settledBefore).reduce((n, r) => n + r.cents, 0);
  const selectedKey = keys.find(k => k.id === keyId);
  const available = contextModels(context);
  const keyChoices = keys.filter(k => model === 'all' || model in k.policies || requests.some(r => r.keyId === k.id && r.model === model));
  const peakModels = available.filter(m => (model === 'all' || model === m.id) && (keyId === 'all' || selectedKey && (m.id in selectedKey.policies || requests.some(r => r.keyId === keyId && r.model === m.id))));
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
    <section className="p-usage-filters" aria-label="用量筛选"><div><Select className="p-pill-select p-time-select" aria-label="时间范围" value={range} onValueChange={value => { setRange(value); setPage(1); }}><option value="7">近 7 天</option><option value="month">本月</option><option value="custom">自定义时间</option></Select><Select className="p-pill-select p-model-select" aria-label="模型筛选" value={model} onValueChange={value => { setModel(value); setPage(1); }}><option value="all">全部模型</option>{models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}</Select><Select className="p-pill-select p-key-select" aria-label="Key 筛选" value={keyId} onValueChange={value => { setKeyId(value); setPage(1); }}><option value="all">全部 Key</option>{(keyChoices.some(k => k.id === keyId) || keyId === 'all' ? keyChoices : [...keyChoices, selectedKey!]).filter(Boolean).map(k => <option value={k.id} key={k.id}>{k.name} · {k.masked.slice(-4)}{k.deletedAt ? '（已删除）' : !k.enabled ? '（已停用）' : ''}</option>)}</Select><Help text={context === 'enterprise' ? '筛选条件同时用于用量、账单和明细导出。并发峰值仅随模型、Key 筛选变化，固定统计近 24 小时。' : '筛选条件同时用于用量、账单和明细导出。'} /></div>
    {range === 'custom' ? <div className="p-date-range"><RekaDateRangePicker from={custom.from} to={custom.to} max={latestUsageDate} onValueChange={value => { setCustom(value); setPage(1); }} /></div> : null}
    {invalidRange ? <p role="alert" className="p-error">请选择有效日期范围，结束日期不得早于开始日期或晚于昨日。</p> : null}<p className="p-data-note">所有时间均按北京时间（GMT+8）显示。用量数据每日更新，通常于次日同步完成。</p></section>
    <section className="p-stats p-usage-stats" aria-label="用量统计"><article><h2>消耗积分</h2><strong>{points(sum)}</strong></article><article><h2>计费请求次数</h2><strong>{rows.length.toLocaleString()} <small>次</small></strong></article></section>
    {context === 'enterprise' ? <section className="p-panel p-concurrency" aria-label="近 24 小时并发峰值"><div className="p-section-heading"><div><h2>近 24h 并发峰值 <Help text={`近 24 小时的最高同时处理请求数 / 当前${keyId === 'all' ? '企业' : 'Key'}并发上限。绿色低于 80%，橙色为 80% 至不足 100%，红色为达到或超过上限；不代表当前并发。`} /></h2></div><small>更新于 {timeLabel(now).slice(5, 16)}</small></div>
      {peakModels.length ? <div key={`${context}:${model}:${keyId}`} className="p-peaks" style={{ gridTemplateColumns: `repeat(${Math.min(6, peakModels.length)}, minmax(0, 1fr))` }}>{peakModels.map(m => { const p = peaks[m.id]; const limit = keyId === 'all' ? m.limit : selectedKey?.policies[m.id]; const inactive = selectedKey && (selectedKey.deletedAt || !selectedKey.enabled); const ratio = limit ? p.peak / limit : 0; return <article key={m.id}><div className="p-peak-name"><span className="p-model-ellipsis" title={m.id}>{m.id}</span>{inactive ? <span className="p-muted">{selectedKey?.deletedAt ? 'Key 已删除' : 'Key 已停用'}</span> : null}</div><div className="p-peak-value"><strong>{p.peak}</strong><span>/ {limit ?? '未授权'} {limit ? '路' : ''}</span></div><div className={`p-meter ${ratio >= 1 ? 'p-meter-full' : ratio >= .8 ? 'p-meter-near' : ''}`} role="meter" aria-label={`${m.id} 峰值占当前上限`} aria-valuenow={Math.min(p.peak, limit ?? p.peak)} aria-valuemin={0} aria-valuemax={limit ?? Math.max(p.peak, 1)} aria-valuetext={`近24小时峰值 ${p.peak}，当前上限 ${limit ?? '未授权'}`}><span style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>{limit && ratio >= .8 ? <small className={ratio >= 1 ? 'p-peak-status-full' : 'p-peak-status-near'}>{p.peak > limit ? '历史峰值高于当前上限' : ratio >= 1 ? '峰值达到上限' : '峰值接近上限'}</small> : null}</article>; })}</div> : <Empty>该 Key 未授权所选模型，且没有对应的历史请求。</Empty>}
    </section> : null}
    <RekaTabs value={tab} onValueChange={value => setTab(value as 'overview' | 'requests')} items={[{ value: 'overview', label: '用量概览' }, { value: 'requests', label: '请求明细' }]} toolbar={<div className="p-export-actions"><button className="p-button" disabled={!rows.length || invalidRange} onClick={() => setExporting('bill')}><Icon name="download" />导出账单</button><button className="p-button" disabled={!rows.length || invalidRange} onClick={() => setExporting('keys')}><Icon name="download" />导出明细</button></div>}>{tab === 'overview' ? <><section className="p-panel p-trend"><h2>积分使用趋势</h2><p className="p-muted">{rangeLabel}，按模型消耗汇总</p>{monthPending ? <Empty>本月暂无已同步数据</Empty> : <Trend key={`${dates.from}:${dates.to}:${model}:${keyId}`} rows={rows} from={dates.from} to={dates.to} settledBefore={settledBefore} />}</section><section className="p-model-usage"><h2>模型用量概览 <Help text="请求次数仅统计实际扣除积分的请求，消耗积分已包含模型折扣。" /></h2><div className="p-table-scroll"><table><thead><tr><th>模型</th><th className="p-number">计费请求次数（次）</th><th className="p-number">计费用量</th><th className="p-number">消耗积分</th><th className="p-number">折后金额估算</th><th className="p-number">操作</th></tr></thead><tbody>{summary.map(r => <tr key={r.model}><td><strong className="p-model-title">{r.model}</strong><small className="p-muted">{models.find(m => m.id === r.model)?.kind} · /api/v2/tasks</small></td><td className="p-number">{r.billedCount.toLocaleString()}</td><td className="p-number">{usageUnits(r.model, r.units)}</td><td className="p-number">{points(r.cents)} 积分</td><td className="p-number">{estimateAmount(r.cents)}</td><td className="p-number"><button className="p-text-button" onClick={() => { setModel(r.model); setTab('requests'); setPage(1); }}>查看明细</button></td></tr>)}</tbody>{summary.length ? <tfoot><tr><th>合计</th><td className="p-number">{summary.reduce((n, r) => n + r.billedCount, 0).toLocaleString()}</td><td className="p-number">{['TTS', 'ASR'].map(kind => { const group = summary.filter(r => models.find(m => m.id === r.model)?.kind === kind); return group.length ? <div key={kind}>{usageUnits(group[0].model, group.reduce((n, r) => n + r.units, 0))}</div> : null; })}</td><td className="p-number">{points(sum)} 积分</td><td className="p-number">{estimateAmount(sum)}</td><td /></tr></tfoot> : null}</table>{!rows.length ? <Empty>{monthPending ? '本月暂无已同步数据' : '所选范围内暂无已同步的用量数据。'}</Empty> : null}</div></section></> : <section className="p-request-table"><div className="p-table-scroll"><table><thead><tr><th>时间</th><th>请求 ID</th><th>API Key</th><th>接口</th><th>模型 ID</th><th>状态</th><th className="p-number">积分</th></tr></thead><tbody>{rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(r => <tr key={r.id}><td className="p-nowrap">{timeLabel(r.start)}</td><td><button className="p-request-id" onClick={() => setRequest(r)}>{r.id}</button></td><td>{keys.find(k => k.id === r.keyId)?.name ?? r.keyId}</td><td><code>/api/v2/tasks</code></td><td className="p-nowrap"><code>{r.model}</code></td><td><span className={`p-request-status ${r.status === '成功' ? 'is-success' : 'is-failed'}`}>{r.status}</span></td><td className="p-number">{points(r.cents)}</td></tr>)}</tbody></table>{!rows.length ? <Empty>{monthPending ? '本月暂无已同步数据' : '所选范围内暂无请求明细。您可以调整筛选条件，或等待次日同步。'}</Empty> : null}</div><Pagination count={rows.length} page={currentPage} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} /></section>}</RekaTabs>
    {exporting === 'bill' ? <BillPreview rows={rows} filters={filters} context={context} keys={keys} close={() => setExporting(null)} /> : exporting ? <ExportDialog kind={exporting} setKind={setExporting} rows={rows} filters={filters} context={context} keys={keys} close={() => setExporting(null)} /> : null}
    {request ? <Dialog title="请求详情" close={() => setRequest(null)}><div className="p-dialog-body"><dl className="p-request-detail">{[['请求 ID', request.id], ['时间', timeLabel(request.start)], ['API Key', keys.find(k => k.id === request.keyId)?.name ?? request.keyId], ['Key 标识', request.keyId], ['模型', request.model], ['接口', '/api/v2/tasks'], ['状态', request.status], ['计费用量', `${request.units} ${models.find(m => m.id === request.model)?.unit}`], ['消耗积分', points(request.cents)], ...(request.rate ? [['结算单价', `${ratePoints(request.rate)} 积分 / ${request.rate.basisLabel}`], ['模型折扣', discountLabel(request.rate.discountBps)]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><footer><button className="p-button p-primary" onClick={() => setRequest(null)}>关闭</button></footer></Dialog> : null}
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
  const active = days.find(d => d.date === selected);
  return <div className="p-trend-chart" onMouseLeave={() => setSelected(null)} onKeyDown={e => { if (e.key === 'Escape') setSelected(null); }}><div className="p-chart-legend">{models.filter(m => rows.some(r => r.model === m.id)).map(m => <span key={m.id}><i style={{ background: m.color }} />{m.id}</span>)}</div><svg viewBox="0 0 960 255" role="group" aria-label="积分使用趋势，按日期查看各模型积分">{[0, 1, 2, 3, 4].map(n => <g key={n}><line x1={plot.x} x2={plot.x + plot.width} y1={plot.y + n * 50} y2={plot.y + n * 50} stroke="#ddd" strokeDasharray="3 5" /><text x={plot.x - 10} y={plot.y + n * 50 + 4} textAnchor="end" fill="#858585" fontSize="11">{(ceiling * (4 - n) / 400).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}</text></g>)}{days.map((d, i) => { let offset = 0; return <g key={d.date} role="button" tabIndex={0} aria-label={`${d.date}${d.step > 1 ? `起 ${d.step} 天` : ''}，${d.date >= dateKey(settledBefore) ? "数据待同步" : `消耗 ${points(d.total)} 积分`}`} onMouseEnter={() => setSelected(d.date)} onFocus={() => setSelected(d.date)} onClick={() => setSelected(d.date)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(d.date); } }}><rect x={plot.x + i * w} y={plot.y} width={w} height={plot.height} fill={selected === d.date ? '#eaeaea' : 'transparent'} />{models.map(m => { const height = (d.values[m.id] ?? 0) / ceiling * plot.height; offset += height; return <rect className="p-growing-bar" key={m.id} x={plot.x + i * w + w * .23} y={plot.y + plot.height - offset} width={w * .54} height={height} rx="2" fill={m.color} />; })}{i % Math.ceil(days.length / 7) === 0 || i === days.length - 1 ? <text x={plot.x + (i + .5) * w} y="237" textAnchor="middle" fill="#777" fontSize="11">{d.date.slice(5)}</text> : null}</g>; })}</svg>{active ? <div className="p-chart-callout" role="tooltip" style={{ left: `${Math.min(68, Math.max(0, (days.findIndex(d => d.date === selected) + .5) / days.length * 100))}%` }}><header><strong>{active.date}</strong><span>{active.date >= dateKey(settledBefore) ? '数据待同步' : `消耗积分 ${points(active.total)}`}</span></header>{models.filter(m => active.values[m.id]).map(m => <div key={m.id}><span>{m.id}</span><b>{points(active.values[m.id])}</b></div>)}</div> : null}<div className="p-sr-only" aria-live="polite">{active ? `${active.date}${active.step > 1 ? ` 起 ${active.step} 天` : ''}：${active.date >= dateKey(settledBefore) ? '数据待同步' : models.filter(m => active.values[m.id]).map(m => `${m.id} ${points(active.values[m.id])} 积分`).join('；') || '无消耗'}` : '将鼠标移至柱形，或使用 Tab 键查看对应日期的积分消耗。'}</div></div>;
}
function ExportDialog({ kind, setKind, rows, filters, context, keys, close }: { kind: Exclude<ExportKind, 'bill'>; setKind: (kind: ExportKind) => void; rows: RequestRecord[]; filters: Filters; context: Context; keys: KeyRecord[]; close: () => void }) {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const summary = aggregate(rows, true);
  const title = '导出明细';
  const account = context === 'enterprise' ? '星河科技' : '个人空间';
  const totalCents = rows.reduce((sum, row) => sum + row.cents, 0);
  const downloadedRows = kind === 'requests' ? rows.length : summary.length;
  const download = () => {
    try {
      const { headers, data } = usageExport(kind, rows, keys, account, filters);
      const blob = new Blob([csv(headers, data)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
      a.download = `${account}_${kind === 'keys' ? '模型-Key用量明细' : '请求明细'}_${filters.from}_${filters.to}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setDone(true); setError('');
    } catch { setError('导出失败，请重试。'); }
  };
  return <Dialog title={title} close={close} wide className="p-usage-export-dialog"><div className="p-dialog-body"><ExportHeading account={account} from={filters.from} to={filters.to} scope={`${filters.model === 'all' ? '全部模型' : filters.model} / ${filters.key === 'all' ? '全部 API Key' : keys.find(k => k.id === filters.key)?.name ?? filters.key}`} /><fieldset className="p-export-kind"><legend>导出粒度</legend><label><input type="radio" name="export-kind" checked={kind === 'keys'} onChange={() => { setKind('keys'); setDone(false); }} />按模型 → Key 汇总</label><label><input type="radio" name="export-kind" checked={kind === 'requests'} onChange={() => { setKind('requests'); setDone(false); }} />逐请求明细</label></fieldset>
    <div className="p-export-total"><span>计费请求次数<strong>{summary.reduce((sum, row) => sum + row.billedCount, 0).toLocaleString()}</strong></span><span>消耗积分<strong>{points(totalCents)}</strong></span><span>折后金额估算<strong>{estimateAmount(totalCents)}</strong></span><span>导出记录<strong>{downloadedRows.toLocaleString()}</strong></span></div>
    {kind === 'keys' ? <div className="p-table-scroll p-export-preview"><table><thead><tr><th>计费模型</th><th>API Key</th><th className="p-number">计费请求次数</th><th className="p-number">计费用量</th><th className="p-number">消耗积分</th><th className="p-number">折后金额估算</th></tr></thead><tbody>{summary.map(r => <tr key={r.model + r.keyId}><td><span className="p-export-model"><span title={r.model}>{r.model}</span><small className="p-bill-kind">{models.find(model => model.id === r.model)?.kind}</small></span></td><td>{keys.find(k => k.id === r.keyId)?.name ?? '—'}</td><td className="p-number">{r.billedCount.toLocaleString()}</td><td className="p-number">{usageUnits(r.model, r.units)}</td><td className="p-number">{points(r.cents)}</td><td className="p-number">{estimateAmount(r.cents)}</td></tr>)}</tbody></table></div> : <Notice>将导出当前筛选范围内的 {rows.length.toLocaleString()} 条计费请求，不受页面分页影响。</Notice>}
    <p className="p-muted p-small">CSV 格式，可用 Excel 打开。用量尚未同步的日期不计入导出。导出不包含完整密钥。</p>{done ? <p className="p-success" role="status">已生成 CSV 并发起下载。</p> : null}{error ? <p className="p-error" role="alert">{error}</p> : null}</div><footer><button className="p-button" onClick={close}>关闭</button><button className="p-button p-primary" onClick={download}><Icon name="download" />{done ? '重新下载 CSV' : '下载 CSV'}</button></footer></Dialog>;
}

function usageUnits(model: string, units: number) { return models.find(m => m.id === model)?.kind === 'ASR' ? `${(units / 3600).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 小时` : `${units.toLocaleString()} 字符`; }
function estimateAmount(cents: number) { return `￥${estimateYuan(cents).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
