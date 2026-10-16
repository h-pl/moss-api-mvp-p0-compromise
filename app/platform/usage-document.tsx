import { points, timeLabel } from './data';
import { billAmount } from './bill-data';

export function UsageDocumentHeading({ title, account, month, period, periodLabel, continuation = false }: { title: string; account: string; month: string; period: string; periodLabel: string; continuation?: boolean }) {
  return <header className="p-bill-heading">
    <div className="p-bill-brand-row"><strong>MOSS API</strong><span>{month}</span></div>
    {!continuation ? <div className="p-bill-title-row">
      <div><h1>{title}</h1><p className="p-bill-company">{account}</p></div>
      <div className="p-bill-period"><span>{periodLabel}（北京时间）</span><p>{period}</p></div>
    </div> : null}
  </header>;
}

export function UsageDocumentSummary({ primaryLabel, primaryValue, primaryUnit, billedCount, cents }: { primaryLabel: string; primaryValue: number; primaryUnit: string; billedCount: number; cents: number }) {
  return <dl className="p-bill-summary">
    <div><dt>{primaryLabel}</dt><dd>{primaryValue.toLocaleString('zh-CN')}<small>{primaryUnit}</small></dd></div>
    <div><dt>计费请求次数</dt><dd>{billedCount.toLocaleString('zh-CN')}<small>次</small></dd></div>
    <div><dt>消耗积分</dt><dd>{points(cents)}<small>积分</small></dd></div>
    <div className="p-bill-amount"><dt>折后金额</dt><dd>{billAmount(cents)}</dd></div>
  </dl>;
}

export function UsageDocumentFooter({ generatedAt, page, pages }: { generatedAt: number; page?: number; pages?: number }) {
  return <div className="p-bill-page-footer"><span>生成时间 {timeLabel(generatedAt)}（UTC+8）</span>{page && pages ? <span>{page} / {pages}</span> : null}</div>;
}
