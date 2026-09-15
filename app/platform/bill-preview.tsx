'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { aggregate, Context, Filters, KeyRecord, models, points, RequestRecord, timeLabel } from './data';
import { estimateYuan, ratePoints } from './pricing-data';
import { Dialog, Icon } from './ui';
import ExportHeading from './export-heading';

export default function BillPreview({ rows, filters, context, keys, close }: { rows: RequestRecord[]; filters: Filters; context: Context; keys: KeyRecord[]; close: () => void }) {
  const [generatedAt] = useState(() => Date.now());
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const summary = aggregate(rows);
  const total = summary.reduce((sum, row) => sum + row.cents, 0);
  const billedCount = summary.reduce((sum, row) => sum + row.billedCount, 0);
  const account = context === 'enterprise' ? '星河科技' : '林晓 · 2090649342695182666';
  const period = `${filters.from} 至 ${filters.to}`;
  const title = '账单预览';
  const scope = `${filters.model === 'all' ? '全部模型' : filters.model} / ${filters.key === 'all' ? '全部 API Key' : keys.find(key => key.id === filters.key)?.name ?? filters.key}`;
  const amount = (cents: number) => `¥${estimateYuan(cents).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const units = (model: string, value: number) => models.find(item => item.id === model)?.kind === 'ASR' ? `${(value / 3600).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 小时` : `${value.toLocaleString('zh-CN')} 字符`;
  const print = async () => {
    setPrinting(true);
    setError('');
    try { await document.fonts.ready; window.print(); }
    catch { setError('无法打开打印窗口，请重试。'); }
    finally { setPrinting(false); }
  };
  const content = <div className="p-bill-document">
    <h1 className="p-bill-print-heading">账单</h1>
    <ExportHeading account={account} from={filters.from} to={filters.to} scope={scope} />
    <dl className="p-bill-meta">
      <div><dt>账单周期（北京时间）</dt><dd>{period}</dd></div>
      <div><dt>计费模型</dt><dd>{summary.length} <small>个</small></dd></div>
      <div><dt>计费请求次数</dt><dd>{billedCount.toLocaleString('zh-CN')} <small>次</small></dd></div>
      <div><dt>消耗积分</dt><dd>{points(total)} <small>积分</small></dd></div>
      <div><dt>折后金额估算</dt><dd>{amount(total)}</dd></div>
      <div><dt>积分换算率</dt><dd>¥0.0500 <small>/ 积分</small></dd></div>
    </dl>
    
    <div className="p-bill-table"><table><thead><tr><th>计费模型</th><th>计费规则</th><th className="p-number">计费请求次数</th><th className="p-number">计费用量</th><th className="p-number">消耗积分</th><th className="p-number">折后金额估算</th></tr></thead><tbody>
      {summary.map(row => {
        const policies = [...new Map(rows.filter(request => request.model === row.model && request.rate).map(request => [JSON.stringify(request.rate), request.rate!])).values()];
        return <tr key={row.model}><td><span className="p-bill-model">{row.model}</span><small className="p-bill-kind">{models.find(model => model.id === row.model)?.kind}</small></td><td>{policies.length ? policies.map(policy => <div className="p-bill-rate" key={JSON.stringify(policy)}><span>{ratePoints(policy).toFixed(2)} 积分 / {policy.basisLabel}</span></div>) : '—'}</td><td className="p-number">{row.billedCount.toLocaleString('zh-CN')}</td><td className="p-number">{units(row.model, row.units)}</td><td className="p-number">{points(row.cents)} 积分</td><td className="p-number">{amount(row.cents)}</td></tr>;
      })}
    </tbody><tfoot><tr><th colSpan={2}>合计</th><td className="p-number">{billedCount.toLocaleString('zh-CN')}</td><td className="p-number">{(['TTS', 'ASR'] as const).map(kind => { const group = summary.filter(row => models.find(model => model.id === row.model)?.kind === kind); return group.length ? <div key={kind}>{units(group[0].model, group.reduce((sum, row) => sum + row.units, 0))}</div> : null; })}</td><td className="p-number">{points(total)} 积分</td><td className="p-number">{amount(total)}</td></tr></tfoot></table></div>
    <p className="p-bill-note">计费规则以调用时的记录为准；积分按请求计量后汇总，折后金额为估算。</p>
    <div className="p-bill-stamp">{account} · {period} · 生成时间 {timeLabel(generatedAt)}（UTC+8）</div>
  </div>;
  return <><Dialog title={title} close={close} className="p-bill-dialog"><div className="p-dialog-body">{content}{error ? <p role="alert" className="p-error">{error}</p> : null}</div><footer><button className="p-button p-primary" onClick={print} disabled={printing}><Icon name="print" />{printing ? '正在打开打印…' : '打印账单'}</button></footer></Dialog>{createPortal(<div className="p-bill-print-sheet">{content}</div>, document.body)}</>;
}
