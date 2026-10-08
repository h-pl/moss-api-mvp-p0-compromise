export default function ExportHeading({ account, from, to }: { account: string; from: string; to: string }) {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return <header className="p-bill-heading">
    <div className="p-bill-brand-row"><strong>MOSS API</strong><span>{sameMonth ? `${from.slice(0, 4)}年${Number(from.slice(5, 7))}月用量明细` : '用量明细'}</span></div>
    <div className="p-bill-title-row">
      <div><h2 className="p-export-document-title">用量明细</h2><p className="p-export-account">{account}</p></div>
      <div className="p-bill-period"><span>统计周期（北京时间）</span><p>{from} 至 {to}</p></div>
    </div>
  </header>;
}
