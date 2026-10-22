'use client';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { isAllSelection, selectionLabel, selectionValues, type Context, type Filters, type KeyRecord, points, type RequestRecord } from './data';
import { billAmount, billDisplayGroups, billGroups, billModelGroups, billShowsTierThresholds, billTotals, billUnits, paginateBill, type BillGroup } from './bill-data';
import { Dialog, Icon } from './ui';
import FilterScopeSummary, { type FilterScope } from './filter-scope';
import { UsageDocumentHeading, UsageDocumentSummary, UsageDocumentFooter } from './usage-document';

function BillRows({ groups }: { groups: BillGroup[] }) {
  const showThresholds = billShowsTierThresholds(groups);
  return <tbody className="p-bill-model-group">{groups.map((group, index) => {
    const isToken = group.kind === 'LLM';
    const isAsrTiered = group.kind === 'ASR' && group.lines.length > 1 && group.lines.some(line => line.threshold);
    const showModel = index === 0 || groups[index - 1].model !== group.model;
    return <tr key={`${group.model}-${index}`} className={`${isToken ? 'p-bill-token-group' : isAsrTiered ? 'p-bill-asr-tiers' : ''} ${isToken && groups[index + 1]?.model === group.model ? 'p-bill-token-continues' : ''}`}>
      <td><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i} className={isToken ? 'p-bill-token-label' : undefined}>{i === 0 && showModel ? <b className="p-bill-model">{group.model}</b> : null}{isToken ? <small>{showModel ? line.label : '\u00a0'}</small> : i === 0 ? <small className="p-bill-kind">{group.kind}</small> : '\u00a0'}</span>)}</div></td>
      <td><div className="p-bill-stack">{group.lines.map((line, i) => <div className="p-bill-tier-rate" key={i}><span>{line.rates.map(rate => <span className="p-bill-rate-line" key={rate}>{rate}</span>)}</span>{showThresholds && (line.threshold || group.threshold && i === Math.floor(group.lines.length / 2)) ? <small>{line.threshold ?? group.threshold}</small> : null}</div>)}</div></td>
      <td className="p-number">{group.billedCount.toLocaleString('zh-CN')}</td>
      <td className="p-number"><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i}>{billUnits(line.units, line.unit)}</span>)}</div></td>
      <td className="p-number"><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i}>{points(line.cents)} 积分</span>)}</div></td>
      <td className="p-number"><div className="p-bill-stack">{group.lines.map((line, i) => <span key={i}>{billAmount(line.cents)}</span>)}</div></td>
    </tr>;
  })}</tbody>;
}

export default function BillPreview({ rows, filters, context, keys, scope: filterScope, close }: { rows: RequestRecord[]; filters: Filters; context: Context; keys: KeyRecord[]; scope?: FilterScope; close: () => void }) {
  const [generatedAt] = useState(() => Date.now());
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const groups = useMemo(() => billDisplayGroups(billGroups(rows, context, { from: filters.from, to: filters.to, model: filters.model, key: filters.key })), [rows, context, filters.from, filters.to, filters.model, filters.key]);
  const totals = billTotals(groups);
  const account = context === 'enterprise' ? '星河科技' : '林晓 · 2090649342695182666';
  const period = `${filters.from} 至 ${filters.to}`;
  const scope = filterScope ?? { key: selectionLabel(filters.key, '全部 API Key', keys), allKeys: isAllSelection(filters.key, keys.map(key => key.id)), keyCount: new Set(selectionValues(filters.key)).size };
  const [measureElement, setMeasureElement] = useState<HTMLDivElement | null>(null);
  const [printLayout, setPrintLayout] = useState<Parameters<typeof paginateBill>[2]>();
  useLayoutEffect(() => {
    if (!measureElement) return;
    const measure = () => {
      const article = measureElement.querySelector<HTMLElement>('.p-bill-document');
      if (!article || !article.getBoundingClientRect().width) return;
      const content = article.querySelector<HTMLElement>('.p-bill-content')!;
      const table = article.querySelector<HTMLElement>('table')!;
      const groupElements = [...table.querySelectorAll<HTMLElement>('tbody')];
      const heights = groupElements.map(element => element.getBoundingClientRect().height);
      const total = table.querySelector('tfoot')!.getBoundingClientRect().height;
      const gap = parseFloat(getComputedStyle(content).rowGap);
      const style = getComputedStyle(article);
      const pageHeight = 594; // Leave one template unit for print rounding.
      const footer = article.querySelector('.p-bill-page-footer')!.getBoundingClientRect().height;
      const available = pageHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - parseFloat(style.rowGap) - footer;
      const overhead = content.getBoundingClientRect().height - heights.reduce((sum, height) => sum + height, 0) - total;
      const brand = article.querySelector('.p-bill-brand-row')!.getBoundingClientRect().height;
      const sectionHeading = article.querySelector('.p-bill-section-heading')!;
      const continuationOverhead = brand + gap + sectionHeading.getBoundingClientRect().height + parseFloat(getComputedStyle(sectionHeading).marginBottom) + table.querySelector('thead')!.getBoundingClientRect().height;
      const layout = { first: available - overhead, continuation: available - continuationOverhead, modelHeights: heights, ending: total };
      setPrintLayout(previous => JSON.stringify(previous) === JSON.stringify(layout) ? previous : layout);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(measureElement);
    measure();
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [measureElement, groups, scope.allKeys, scope.key, scope.keyCount]);
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
    try {
      await document.fonts.ready;
      // Commit the paper-width measurement before the browser snapshots print DOM.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      document.title = filename;
      window.print();
    }
    catch { setError('无法打开打印窗口，请重试。'); }
    finally { setPrinting(false); }
  };
  const renderDocument = (pages: BillGroup[][], paginated: boolean) => <div className="p-bill-pages">{pages.map((page, index) => <div className="p-bill-page" key={index}><article className="p-bill-document" aria-label={`${account}用量账单${paginated ? ` 第${index + 1}页` : ''}`}>
    <div className="p-bill-content">
      <UsageDocumentHeading title="用量账单" account={account} month={month} period={period} periodLabel="账单周期" continuation={index > 0} />
      {index === 0 ? <UsageDocumentSummary primaryLabel="计费模型" primaryValue={totals.modelCount} primaryUnit="个" billedCount={totals.billedCount} cents={totals.cents} /> : null}
      <section className="p-bill-details" aria-label={index ? '计费明细（续）' : '计费明细'}>
        <div className="p-bill-section-heading"><h2>{index ? '计费明细（续）' : '计费明细'}</h2><FilterScopeSummary scope={scope} /></div>
        <div className={`p-bill-table${index < pages.length - 1 ? ' p-bill-table-continued' : ''}`}><table>
          <thead><tr><th scope="col">计费模型</th><th scope="col">计费规则</th><th scope="col" className="p-number">计费请求次数</th><th scope="col" className="p-number">计费用量</th><th scope="col" className="p-number">消耗积分</th><th scope="col" className="p-number">折后金额</th></tr></thead>
          {billModelGroups(page).map(model => <BillRows key={model[0].model} groups={model} />)}
          {index === pages.length - 1 ? <tfoot><tr><th colSpan={2} scope="row">合计</th><td className="p-number">{totals.billedCount.toLocaleString('zh-CN')}</td><td className="p-number">{totals.units.map(unit => <div key={unit}>{unit}</div>)}</td><td className="p-number">{points(totals.cents)} 积分</td><td className="p-number">{billAmount(totals.cents)}</td></tr></tfoot> : null}
        </table></div>
      </section>
    </div>
    <UsageDocumentFooter generatedAt={generatedAt} page={paginated ? index + 1 : undefined} pages={paginated ? pages.length : undefined} />
  </article></div>)}</div>;
  return <><Dialog title="账单预览" close={close} className="p-bill-dialog"><div className="p-dialog-body">{renderDocument([groups], false)}{error ? <p role="alert" className="p-error">{error}</p> : null}</div><footer><button className="p-button p-primary" onClick={print} disabled={printing || !printLayout}><Icon name="print" />{printing ? '正在打开打印…' : '打印账单'}</button></footer></Dialog>{createPortal(<div className="p-bill-print-sheet p-bill-paper">{renderDocument(paginateBill(groups, 0, printLayout), true)}</div>, document.body)}{createPortal(<div className="p-bill-measure p-bill-paper" ref={setMeasureElement} aria-hidden="true">{renderDocument([groups], true)}</div>, document.body)}</>;
}
