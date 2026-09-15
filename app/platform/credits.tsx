'use client';
import { useState } from 'react';
import { RekaTabs } from './reka';
import { Dialog, Icon } from './ui';
import { points } from './data';
import { enterpriseContract } from './pricing-data';

// Screenshot reference packages; the payment provider is not connected in this prototype.
export const packages = [
  { credits: 400, price: 20 }, { credits: 1000, price: 50 },
  { credits: 3880, price: 175, list: 194, discount: '9折' },
  { credits: 8380, price: 356, list: 419, discount: '85折' },
  { credits: 17680, price: 707, list: 884, discount: '8折' },
];
export default function Credits({ personalBalance, enterpriseBalance, context, close, contact, initialPack = 400 }: { initialPack?: number; personalBalance: number; enterpriseBalance: number; context: 'personal' | 'enterprise'; close: () => void; contact: () => void }) {
  const [tab, setTab] = useState('personal');
  const [selected, setSelected] = useState(() => Math.max(0, packages.findIndex(pack => pack.credits === initialPack)));
  const [checkout, setCheckout] = useState(false);
  const [faq, setFaq] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const copyContract = async () => { try { await navigator.clipboard.writeText('XH-2026-0701'); setCopied(true); setCopyError(''); } catch { setCopyError('复制失败，请手动复制合同编号。'); } };
  return <Dialog title="获取积分" className="p-credits-dialog" close={close}><RekaTabs value={tab} onValueChange={value => { setTab(value); setCheckout(false); }} className="p-credits-tabs" toolbarClassName="p-credits-tabbar" items={[{value:'personal',label:<><strong>个人充值</strong><span>在线支付购买积分包</span></>},{value:'enterprise',label:<><strong>企业支付</strong><span>签署合同并完成认证后，按合同付款</span></>}]}>{tab === 'personal' ? <div className="p-credits-body"><div className="p-credit-heading"><h2>充值积分</h2><span>账户剩余积分：{points(personalBalance)}</span></div><div className="p-credit-packages" role="radiogroup" aria-label="选择积分包">{packages.map((pack, i) => <button key={pack.credits} role="radio" aria-checked={selected === i} tabIndex={selected === i ? 0 : -1} className={`p-credit-package ${selected === i ? 'is-selected' : ''}`} onClick={() => { setSelected(i); setCheckout(false); }} onKeyDown={e => { if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); const next = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + packages.length) % packages.length; setSelected(next); setCheckout(false); (e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus(); } }}><strong>{pack.credits}</strong><span>{pack.list ? <del>￥{pack.list}</del> : null}<b>￥{pack.price}</b></span>{pack.discount ? <i>{pack.discount}</i> : null}</button>)}</div><button className="p-button p-primary p-pay-button" onClick={() => setCheckout(true)}>支付 ￥{packages[selected].price}</button>{checkout ? <div className="p-checkout-message" role="status"><strong>已选择 {packages[selected].credits} 积分 · ￥{packages[selected].price}</strong><p>当前预览未接入支付服务。请前往 Moss 平台确认套餐并完成支付。</p><a className="p-button" href="https://platform.mosi.cn/app/usage" target="_blank" rel="noreferrer">前往平台充值<Icon name="arrow" /></a></div> : null}<div className="p-credit-faq">充值积分自购买起一年内有效 <button onClick={() => setFaq(!faq)} aria-expanded={faq}>常见问题</button></div>{faq ? <div className="p-credit-faq-answer"><p>个人充值到账至个人账户，企业付款到账至合同约定的企业账户。</p><p>企业模型折扣以计费标准页展示的合同价格为准。</p></div> : null}</div> : <div className="p-credits-body p-enterprise-payment">
  <div className="p-payment-notice"><Icon name="infoSolid" size={18} /><span>{context === 'enterprise' ? '当前企业已认证，请按合同约定付款' : '企业支付需完成企业认证并签署合同'}</span>{context === 'personal' ? <a href="https://platform.mosi.cn/app/profile" target="_blank" rel="noreferrer">去认证</a> : null}</div>
  <h2>对公收款信息</h2><dl className="p-bank-details">{['收款单位', '开户银行', '银行账号'].map(label => <div key={label}><dt>{label}</dt><dd>{context === 'enterprise' ? '待运营提供' : '完成认证后显示'}</dd></div>)}</dl>
  {context === 'enterprise' ? <details className="p-payment-contract"><summary>合同与付款信息 <Icon name="chevron" size={14} /></summary><dl className="p-contract-details"><div><dt>企业名称</dt><dd>{enterpriseContract.name}</dd></div><div><dt>合同编号</dt><dd>XH-2026-0701 <button className="p-icon-button" aria-label="复制合同编号" onClick={copyContract}><Icon name={copied ? 'check' : 'copy'} /></button></dd></div><div><dt>合同有效期</dt><dd>{enterpriseContract.effectiveFrom} 至 {enterpriseContract.effectiveTo}</dd></div><div><dt>本期待付金额</dt><dd>￥2,000.00 · 待付款</dd></div><div><dt>转账备注</dt><dd>星河科技 · XH-2026-0701</dd></div></dl>{copyError ? <p className="p-error" role="alert">{copyError}</p> : null}<p className="p-muted">请联系运营确认收款账户与本期金额。付款核实后积分发放至企业账户，当前企业积分余额为 {points(enterpriseBalance)}。</p><button className="p-button" onClick={contact}>联系运营</button></details> : null}
</div>}{tab === 'personal' ? <div className="p-credit-business"><div><h3>商务定制</h3><p>针对企业方案定制配额用量、提供专属服务、SLA 与技术支持</p></div><button onClick={contact}>联系我们</button></div> : null}</RekaTabs></Dialog>;
}
