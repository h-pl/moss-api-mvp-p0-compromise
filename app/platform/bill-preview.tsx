'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { type Context, type Filters, type KeyRecord, points, type RequestRecord, timeLabel } from './data';
import { billAmount, billGroups, billTotals, billUnits, paginateBill, type BillGroup } from './bill-data';
import { Dialog, Icon } from './ui';

function BillRows({ groups }: { groups: BillGroup[] }) {
  return <tbody>{groups.map((group, index) => {
    const isToken = group.kind === 'LLM';
    const showModel = index === 0 || groups[index - 1].model !== group.model;
    return <tr key={`${group.model}-${index}`} className={`${isToken ? 'p-bill-token-group' : ''} ${isToken && groups[index + 1]?.model === group.model ? 'p-bill-token-continues' : ''}`}>
      <td><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i} className={isToken ? 'p-bill-token-label' : undefined}>{i === 0 && showModel ? <b className="p-bill-model">{group.model}</b> : null}{isToken ? <small>{line.label}</small> : i === 0 ? <small className="p-bill-kind">{group.kind}</small> : '\u00a0'}</span>)}</div></td>
      <td><div className="p-bill-stack">{group.lines.map((line, i) => <div className="p-bill-tier-rate" key={i}><span>{line.rates.map(rate => <span className="p-bill-rate-line" key={rate}>{rate}</span>)}</span>{line.threshold || group.threshold && i === Math.floor(group.lines.length / 2) ? <small>{line.threshold ?? group.threshold}</small> : null}</div>)}</div></td>
      <td className="p-number">{group.billedCount.toLocaleString('zh-CN')}</td>
      <td className="p-number"><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i}>{billUnits(line.units, line.unit)}</span>)}</div></td>
      <td className="p-number"><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i}>{points(line.cents)} 积分</span>)}</div></td>
      <td className="p-number"><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i}>{billAmount(line.cents)}</span>)}</div></td>
    </tr>;
  })}</tbody>;
}

export default function BillPreview({ rows, filters, context, keys, close }: { rows: RequestRecord[]; filters: Filters; context: Context; keys: KeyRecord[]; close: () => void }) {
  const [generatedAt] = useState(() => Date.now());
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const groups = useMemo(() => billGroups(rows, context, { from: filters.from, to: filters.to, model: filters.model, key: filters.key }), [rows, context, filters.from, filters.to, filters.model, filters.key]);
  const totals = billTotals(groups);
  const pages = paginateBill(groups);
  const account = context === 'enterprise' ? '星河科技' : '林晓 · 2090649342695182666';
  const period = `${filters.from} 至 ${filters.to}`;
  const scope = `${filters.model === 'all' ? '全部模型' : filters.model} / ${filters.key === 'all' ? '全部 API Key' : keys.find(key => key.id === filters.key)?.name ?? filters.key}`;
  const sameMonth = filters.from.slice(0, 7) === filters.to.slice(0, 7);
  const filePeriod = sameMonth ? `${filters.from.slice(0, 4)}年${Number(filters.from.slice(5, 7))}月` : period;
  const month = sameMonth ? `${filePeriod}账单` : '用量账单';
  const filename = `用量账单 — Moss API（${account}）— ${filePeriod}`;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = filename;
    return () => { document.title = previousTitle; };
  }, [filename]);
  const print = async () => {
    setPrinting(true); setError('');
    try { await document.fonts.ready; document.title = filename; window.print(); }
    catch { setError('无法打开打印窗口，请重试。'); }
    finally { setPrinting(false); }
  };
  const content = <div className="p-bill-pages">{pages.map((page, index) => <div className="p-bill-page" key={index}><article className="p-bill-document" aria-label={`${account}用量账单 第${index + 1}页`}>
    <div className="p-bill-content">
      <header className="p-bill-heading">
        <div className="p-bill-brand-row"><strong>MOSS API</strong><span>{month}</span></div>
        {index === 0 ? <div className="p-bill-title-row">
          <div><h1>用量账单</h1><p className="p-bill-company">{account}</p></div>
          <div className="p-bill-period"><span>账单周期（北京时间）</span><p>{period}</p></div>
        </div> : null}
      </header>
      {index === 0 ? <dl className="p-bill-summary">
        <div><dt>计费模型</dt><dd>{totals.modelCount}<small>个</small></dd></div>
        <div><dt>计费请求次数</dt><dd>{totals.billedCount.toLocaleString('zh-CN')}<small>次</small></dd></div>
        <div><dt>消耗积分</dt><dd>{points(totals.cents)}<small>积分</small></dd></div>
        <div className="p-bill-amount"><dt>折后金额</dt><dd>{billAmount(totals.cents)}</dd></div>
      </dl> : null}
      <section className="p-bill-details" aria-label={index ? '计费明细（续）' : '计费明细'}>
        <div className="p-bill-section-heading"><h2>{index ? '计费明细（续）' : '计费明细'}</h2><p>{scope}</p></div>
        <div className={`p-bill-table${index < pages.length - 1 ? ' p-bill-table-continued' : ''}`}><table>
          <thead><tr><th scope="col">计费模型</th><th scope="col">计费规则</th><th scope="col" className="p-number">计费请求次数</th><th scope="col" className="p-number">计费用量</th><th scope="col" className="p-number">消耗积分</th><th scope="col" className="p-number">折后金额</th></tr></thead>
          <BillRows groups={page} />
          {index === pages.length - 1 ? <tfoot><tr><th colSpan={2} scope="row">合计</th><td className="p-number">{totals.billedCount.toLocaleString('zh-CN')}</td><td className="p-number">{totals.units.map(unit => <div key={unit}>{unit}</div>)}</td><td className="p-number">{points(totals.cents)} 积分</td><td className="p-number">{billAmount(totals.cents)}</td></tr></tfoot> : null}
        </table></div>
      </section>
    </div>
    <div className="p-bill-page-footer"><span>生成时间 {timeLabel(generatedAt)}（UTC+8）</span><span>{index + 1} / {pages.length}</span></div>
  </article></div>)}</div>;
  return <><Dialog title="账单预览" close={close} className="p-bill-dialog"><div className="p-dialog-body">{content}{error ? <p role="alert" className="p-error">{error}</p> : null}</div><footer><button className="p-button p-primary" onClick={print} disabled={printing}><Icon name="print" />{printing ? '正在打开打印…' : '打印账单'}</button></footer></Dialog>{createPortal(<div className="p-bill-print-sheet">{content}</div>, document.body)}</>;
}
