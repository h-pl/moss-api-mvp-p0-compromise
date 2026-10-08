'use client';
import { Context, contextModels, points } from './data';
import { estimateYuan, rateFor, ratePoints } from './pricing-data';
import { packages } from './credits';
import Image from 'next/image';
export default function Pricing({ context, getCredits, contact }: { contact: () => void; context: Context; getCredits: (credits: number) => void }) {
  const available = contextModels(context);
  const groups = [{ title: '语音生成', kind: 'TTS' }, { title: '语音转写', kind: 'ASR' }];
  return <main id="main-content" className="p-main p-pricing"><header className="p-pricing-heading"><div><h1>积分包</h1><p>选择适合的积分包，积分可用于所有 API 调用。</p></div><span>积分自购买日起一年内有效</span></header><section className="p-pricing-packs" aria-label="积分包列表">{packages.map(pack => <article key={pack.credits}>{pack.discount ? <span className="p-pack-corner">{pack.discount}</span> : null}<h2 className="p-pack-credits"><Image src="/platform/point.svg" width={20} height={20} alt="" />{pack.credits} 积分</h2><div className="p-pack-price-box"><div className="p-pack-price-line"><strong>¥ {pack.price}</strong>{pack.list ? <del>¥ {pack.list}</del> : null}</div></div><button className="p-button p-primary p-pack-buy" onClick={() => getCredits(pack.credits)}>购买</button></article>)}</section><section className="p-pricing-business"><div><h3>商务定制</h3><p>针对企业方案定制配额用量、提供专属服务、SLA 与技术支持</p></div><button className="p-text-button" onClick={contact}>联系我们</button></section><section className="p-pricing-rates"><header><h2>模型计费标准</h2><span>{context === 'enterprise' ? '星河科技 · 企业专属计费规则，仅在消耗积分时生效' : '调用统一按积分结算；人民币仅用于购买积分包。'}</span></header>{groups.map(group => (
    <section className="p-rate-group" key={group.kind} aria-labelledby={`pricing-${group.kind}`}>
      <header><h3 id={`pricing-${group.kind}`}>{group.title}</h3></header>
      <div className="p-table-scroll" role="region" aria-labelledby={`pricing-${group.kind}`} tabIndex={0}>
        <table className={context === 'enterprise' ? 'p-rate-enterprise' : 'p-rate-personal'} aria-label={`${group.title}计费标准`}>
          <colgroup>{[30, 20, 18, 18, 14].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
          <thead><tr>
            <th scope="col">模型</th><th scope="col">计费方式</th>
            <th scope="col" className="p-number">人民币价格</th>
            <th scope="col" className="p-number">实际扣除</th>
            <th scope="col" className="p-number">最低扣费</th>
          </tr></thead>
          <tbody>{available.filter(model => model.kind === group.kind).map(model => {
            const rate = rateFor(context, model.id);
            const unitPoints = ratePoints(rate);
            return <tr key={model.id}>
              <th scope="row" className="p-rate-model" translate="no">{model.id}</th>
              <td className="p-rate-method">{model.kind === 'TTS' ? '按输入字符' : '按输入音视频时长'}</td>
              <td className="p-number p-rate-price"><strong>¥{estimateYuan(unitPoints * 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</strong><span className="p-rate-unit">/ {rate.basisLabel}</span></td>
              <td className="p-number p-rate-points"><strong>{points(unitPoints * 100)}</strong><span className="p-rate-unit">积分 / {rate.basisLabel}</span></td>
              <td className="p-number p-rate-minimum"><span>{points(rate.minimumCents)}</span><span className="p-rate-unit">积分 / 次</span></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  ))}</section><section className="p-pricing-rules"><h2>购买与结算规则</h2><ul>{context === 'enterprise' ? <li>企业调用按对应模型的企业价格扣除积分。</li> : null}<li>按请求实际用量计算积分，折后消耗低于最低扣费时，按最低积分扣除。</li><li>账单保留调用时的计费标准，后续调整不影响历史记录。</li></ul></section></main>;
}
