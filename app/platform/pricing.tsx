'use client';
import { contextModels, points } from './data';
import { enterpriseContract, estimateYuan, rateFor, ratePoints } from './pricing-data';
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
          <header><h2 id={`pricing-${group.id}`}>{group.title}</h2><p>适用模型：{models.map(model => model.id).join(', ')}</p></header>
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
      <p className="p-contract-note">单次调用按实际用量计算，低于最低扣费时按最低积分扣除。最终以积分账单为准；历史账单保留调用时的计费标准。</p>
    </div>
    <section className="p-contract-contact"><div><h2>商务定制</h2><p>针对企业方案定制配额用量、提供专属服务、SLA 与技术支持</p></div><button onClick={contact}>联系我们</button></section>
  </main>;
}
