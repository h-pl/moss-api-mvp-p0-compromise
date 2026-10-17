'use client';
import { contextModels, points } from './data';
import { enterpriseContract, estimateYuan, rateFor, ratePoints, kimiContractCategories, kimiContractTiers } from './pricing-data';
import { Help } from './ui';
import './pricing.css';

const groups = [
  { id: 'speech', title: '语音生成', models: ['moss-tts-1.0-pro', 'moss-tts-1.5-flash', 'moss-ttsd-1.0'] },
  { id: 'voice', title: '音色设计', models: ['moss-voice-generator-1.0'] },
  { id: 'transcription', title: '语音转写', models: ['moss-transcribe', 'moss-transcribe-diarize-pro'] },
];

export default function Pricing({ contact }: { contact: () => void }) {
  const available = contextModels('enterprise');
  return <main id="main-content" className="p-main p-contract-pricing">
    <div className="p-contract-rates">
      <header className="p-contract-heading">
        <h1>模型计费标准</h1>
        <p>{enterpriseContract.name} · 以下为企业合同单价，API 调用仍按积分结算。</p>
      </header>
      {groups.map(group => {
        const models = available.filter(model => group.models.includes(model.id));
        if (!models.length) return null;
        return <section className="p-contract-group" key={group.id} aria-labelledby={`pricing-${group.id}`}>
          <header><h2 id={`pricing-${group.id}`}>{group.title}</h2></header>
          <div className="p-contract-table-wrap" role="region" aria-labelledby={`pricing-${group.id}`} tabIndex={0}>
            <table aria-label={`${group.title}合同计费标准`}>
              <colgroup>{[30, 19, 20, 19, 12].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
              <thead><tr><th scope="col">模型</th><th scope="col">计费方式</th><th scope="col">合同单价（人民币）</th><th scope="col">实际扣除</th><th scope="col">最低扣费</th></tr></thead>
              <tbody>{models.map(model => {
                const rate = rateFor('enterprise', model.id);
                const unitPoints = ratePoints(rate);
                return <tr key={model.id}>
                  <th scope="row" translate="no">{model.id}</th>
                  <td>{model.kind === 'TTS' ? '按输入字符' : '按输入音视频时长'}</td>
                  <td><strong>¥{estimateYuan(unitPoints * 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / {rate.basisLabel}</strong></td>
                  <td>{points(unitPoints * 100)} 积分 / {rate.basisLabel}</td>
                  <td>{points(rate.minimumCents)} 积分 / 次</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>;
      })}
      <section className="p-contract-group" aria-labelledby="pricing-language">
        <header><h2 id="pricing-language">文本生成</h2></header>
        <div className="p-contract-table-wrap" role="region" aria-labelledby="pricing-language" tabIndex={0}>
          <table aria-label="Kimi K3 合同计费标准">
            <colgroup>{[17, 25, 19, 20, 19].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
            <thead><tr><th scope="col">模型</th><th scope="col">月累计用量（M tokens） <Help text="按企业自然月累计输入与输出 tokens 之和分段累进计费，各档内分别按缓存命中输入、未命中输入及输出单价扣费；每月重新累计。" /></th><th scope="col">计费项目</th><th scope="col">合同单价（人民币）</th><th scope="col">实际扣除</th></tr></thead>
            {kimiContractTiers.map(tier => <tbody key={tier.threshold}>
              {kimiContractCategories.map((category, index) => <tr key={category}>
                {index === 0 ? <th scope="rowgroup" rowSpan={3} translate="no">kimi-k3</th> : null}
                {index === 0 ? <td rowSpan={3}>{tier.range}</td> : null}
                <td>{category}</td>
                <td><strong>¥{tier.yuan[index].toFixed(2)} / M tokens</strong></td>
                <td>{points(tier.yuan[index] * 2000)} 积分 / M tokens</td>
              </tr>)}
            </tbody>)}
          </table>
        </div>
      </section>
    </div>
    <section className="p-contract-contact"><div><h2>商务定制</h2><p>针对企业方案定制配额用量、提供专属服务、SLA 与技术支持</p></div><button onClick={contact}>联系我们</button></section>
  </main>;
}
