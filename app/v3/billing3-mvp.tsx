"use client";
import { Pagination } from "./pagination";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ApiKeyRecord, Member, View } from "./data";
import { enterpriseContractModels } from "./enterprise-resource-data";
import type { Usage3Context } from "./usage3-navigation";
import { mvpCompany, mvpBillingRule } from "./mvp-fixtures";
import { mvpBillingTabs } from "./mvp-policy";
import { makeMvpBillingDemo, sumMvpBilling, groupMvpBilling, groupMvpBillingByUser, type MvpBillingRow } from "./mvp-billing-data";
import { usage8Range, usage8Dates, usage8Snapshot } from "./usage8-data";
import { DataTable, Icon, Metric, PageHeader, Tabs } from "./ui";
import { ModalSurface } from "./modal-surface";
import "./usage8.css";

const number = (value: number, digits = 0) => value.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const points = (value: number) => `${number(value / 100, 2)} 积分`;
const amount = (value: number) => `¥${number(value / 100, 2)}`;
const quantity = (row: Pick<MvpBillingRow, "modelId" | "ttsCharacters" | "asrDeciseconds">) => enterpriseContractModels.find(m=>m.id===row.modelId)?.kind === "TTS" ? `${number(row.ttsCharacters)} 字符` : `${number(row.asrDeciseconds / 36000, 2)} 小时`;

export function Billing3Mvp({ go, member, members, apiKeys }: { go: (view: View, usageContext?: Usage3Context) => void; member: Member; members: Member[]; apiKeys: ApiKeyRecord[] }) {
  const defaults = { period: "2026-09", model: "all", user: member.email };
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [report, setReport] = useState(false);
  const source = useMemo(() => makeMvpBillingDemo(members, apiKeys), [members, apiKeys]);
  const periodRows = source.filter(row => row.date.startsWith(filters.period));
  const rows = periodRows.filter(row => (filters.model === "all" || row.modelId === filters.model) && (filters.user === "all" || row.userId === filters.user));
  const groups = groupMvpBillingByUser(rows);
  const total = sumMvpBilling(rows);
  const range = usage8Range(filters.period, "month");
  const trend = usage8Dates(range.startDate, range.endDate).map(date => ({ date: date.slice(5), amount: sumMvpBilling(rows.filter(row => row.date <= date)).amountCents / 100 }));
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = groups.slice((current - 1) * pageSize, current * pageSize);
  const selectedModel = enterpriseContractModels.find(model => model.id === filters.model);
  const update = (patch: Partial<typeof filters>) => { setFilters(previous => ({ ...previous, ...patch })); setPage(1); };
  const changed = Object.keys(defaults).some(key => defaults[key as keyof typeof defaults] !== filters[key as keyof typeof filters]);
  return <div className="mvp-billing usage8-page billing3-page">
    <Tabs items={mvpBillingTabs} active="billing3" go={go} />
    <PageHeader title="费用概览" description="查看账期积分消耗、费用估算及各用户用量。" action={<button className="btn secondary" type="button" onClick={() => setReport(true)}><Icon name="order" size={16} />打印账期账单</button>} />
    <aside className="u8-balance"><span className="u8-balance-label">当前企业积分余量<strong>{number(usage8Snapshot.points, 2)}<small>积分</small></strong></span><span>有效期至 {usage8Snapshot.expiresAt}</span></aside>
    <section className="u8-filter-panel" aria-label="费用筛选"><div className="u8-filters">
      <label><span>账期</span><select aria-label="账期" value={filters.period} onChange={event => update({ period: event.target.value })}><option value="2026-09">2026 年 9 月</option><option value="2026-08">2026 年 8 月</option></select></label>
      <label><span>模型</span><select aria-label="模型" value={filters.model} onChange={event => update({ model: event.target.value })}><option value="all">全部模型</option>{enterpriseContractModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
      <label><span>用户</span><select aria-label="用户" value={filters.user} onChange={event => update({ user: event.target.value })}><option value="all">全部用户</option>{members.map(user => <option key={user.email} value={user.email}>{user.name}{user.email === member.email ? "（本人）" : ` · ${user.role}`}</option>)}</select></label>
      {changed && <button className="u8-reset" type="button" onClick={() => { setFilters(defaults); setPage(1); }}>重置筛选</button>}
    </div><div className="u8-window-row"><div className="u8-scope"><span>{range.startDate} — {range.endDate} {filters.period === "2026-09" ? "21:00" : "23:59"}<small>UTC+8</small></span></div></div></section>
    <section className="metric-grid mvp-billing-metrics">
      <Metric label="折后金额估算" value={amount(total.amountCents)} meta="" />
      <Metric label="账期积分消耗" value={points(total.pointCents)} meta="" />
      <Metric label="计费调用次数" value={`${number(total.calls)} 次`} meta="" />
    </section>
    <section className="panel mvp-chart"><div className="u8-chart-heading"><div><h2>账期累计折后金额</h2></div><span className="u8-tag">{filters.period}</span></div><div style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 15, right: 15, left: 12, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false}/><Tooltip
      labelFormatter={label => `${filters.period.slice(0, 4)}-${label}`}
      formatter={value => [`¥${number(Number(value), 2)}`, "累计折后金额估算"]}
      contentStyle={{ background: "#fff", border: "1px solid #e5e7e9", borderRadius: 8, padding: "10px 12px", fontSize: 12, lineHeight: 1.5 }}
      labelStyle={{ color: "#252a30", margin: "0 0 4px", fontWeight: 400 }}
      itemStyle={{ color: "#ef782f", padding: 0 }}
      cursor={{ stroke: "#cdd1d5", strokeWidth: 1 }}
    /><Area type="monotone" dataKey="amount" stroke="#ef7927" fill="#fff0e5" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></section>
    <section className="u8-details billing3-user-overview" aria-labelledby="billing3-users-title">
      <header className="u8-details-header"><div><h2 id="billing3-users-title">用户用量概览 <span>{groups.length}</span></h2><p>汇总所选账期内各用户的用量与费用，按模型分行展示</p></div><span className="u8-tag">消耗积分降序</span></header>
      <div className="u8-table-scroll"><table><caption className="sr-only">用户用量概览</caption><thead><tr><th scope="col">用户</th><th scope="col">模型</th><th scope="col" className="numeric">计费调用次数（次）</th><th scope="col" className="numeric">计费用量</th><th scope="col" className="numeric">消耗积分</th><th scope="col" className="numeric">折后金额估算</th><th scope="col">操作</th></tr></thead><tbody>
        {paged.map(row => {
          const model = enterpriseContractModels.find(model => model.id === row.modelId)!;
          const user = members.find(user => user.email === row.userId);
          return <tr key={`${row.modelId}:${row.userId}`}>
            <td data-label="用户"><div className="usage3-user-title"><span title={user?.name ?? "企业成员"}>{user?.name ?? "企业成员"}</span>{user && <span className="eu2-role">{user.role}</span>}</div><small>{user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") ?? "—"}</small></td>
            <td data-label="模型"><span className="u8-model-name" title={model.name}>{model.name}</span><span className={`u8-service ${model.kind.toLowerCase()}`}>{model.kind}</span></td>
            <td className="numeric" data-label="计费调用次数（次）">{number(row.calls)}</td>
            <td className="numeric" data-label="计费用量">{quantity(row)}</td><td className="numeric" data-label="消耗积分">{points(row.pointCents)}</td><td className="numeric" data-label="折后金额估算">{amount(row.amountCents)}</td><td data-label="操作"><button type="button" className="billing3-detail-link" aria-label={`查看${user?.name ?? "企业成员"} ${model.name}明细`} onClick={() => go("usage3", { period: filters.period, modelId: row.modelId, userId: row.userId })}>查看明细</button></td>
          </tr>;
        })}
        {!groups.length && <tr><td colSpan={7}><div className="u8-table-empty"><Icon name="folder" size={24} /><strong>暂无用户用量</strong><span>调整账期、模型或用户后重试。</span>{changed && <button type="button" className="u8-reset" onClick={() => { setFilters(defaults); setPage(1); }}>重置筛选</button>}</div></td></tr>}
        {!!groups.length && Array.from({ length: pageSize - paged.length }, (_, index) => <tr className="u8-spacer-row" aria-hidden="true" key={`spacer-${index}`}><td colSpan={7} /></tr>)}
      </tbody>{!!groups.length && <tfoot><tr><th colSpan={2} scope="row">当前筛选合计 <span>全部 {groups.length} 条</span></th><td className="numeric" data-label="计费调用次数（次）">{number(total.calls)}</td><td className="numeric" data-label="计费用量">{selectedModel?.kind !== "ASR" && <span>{number(total.ttsCharacters)} 字符</span>}{selectedModel?.kind !== "TTS" && <span>{number(total.asrDeciseconds / 36000, 2)} 小时</span>}</td><td className="numeric" data-label="消耗积分">{points(total.pointCents)}</td><td className="numeric" data-label="折后金额估算">{amount(total.amountCents)}</td><td /></tr></tfoot>}</table></div>
      <Pagination count={groups.length} page={current} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} label="明细" className="u8-pagination" />
    </section>

    {report && <BillingReport rows={periodRows} period={filters.period} close={()=>setReport(false)} />}
  </div>;
}

function BillingReport({ rows, period, close }: { rows: MvpBillingRow[]; period: string; close: () => void }) {
  const total = sumMvpBilling(rows);
  const models = groupMvpBilling(rows, true);
  const periodLabel = `${period.slice(0, 4)} 年 ${period.slice(5)} 月`;
  return <ModalSurface titleId="billing-mvp-report-title" close={close} className="credential6-dialog billing6-report-dialog billing3-report-dialog"><div className="credential6-action-content billing6-print-report" data-print-scope="complete-month-by-model">
    <button data-autofocus className="dialog-close" aria-label="关闭账单预览" onClick={close}><Icon name="close"/></button>
    <h2 id="billing-mvp-report-title">{periodLabel}账单预览</h2><p>按完整账期汇总各模型费用，用户与 API Key 已合并；不受页面模型、用户筛选或分页影响。</p><p>{mvpCompany.name}</p>
    <dl className="logs2-detail-facts billing6-report-facts"><div><dt>账期</dt><dd>{periodLabel}</dd></div><div><dt>计费模型</dt><dd>{models.length} 个</dd></div><div><dt>计费调用次数</dt><dd>{number(total.calls)} 次</dd></div><div><dt>消耗积分</dt><dd>{points(total.pointCents)}</dd></div><div><dt>折后金额估算</dt><dd>{amount(total.amountCents)}</dd></div><div><dt>积分换算率</dt><dd>¥0.0300 / 积分</dd></div></dl>
    <div className="billing6-report-table"><DataTable caption="完整账期按模型汇总" heads={["计费模型", "计费规则", "计费调用次数", "计费用量", "消耗积分", "折后金额估算"]} rows={models.map(row => {
      const model = enterpriseContractModels.find(model => model.id === row.modelId)!;
      const rule = mvpBillingRule(model.id);
      return [<span className="billing3-report-model" key={model.id}>{model.name}<span className="u8-service">{model.kind}</span></span>, `${number(rule.pointCents / 100)} 积分 / ${rule.unit}`, number(row.calls), quantity(row), points(row.pointCents), amount(row.amountCents)];
    })}/></div>
    <p className="billing3-report-note">积分与金额逐条计量、取整后汇总；折后金额为估算，非最终结算。</p>
    <footer className="billing6-print-meta">账期 {period} · 生成时间 {new Intl.DateTimeFormat("zh-CN", {timeZone:"Asia/Shanghai", dateStyle:"short", timeStyle:"medium"}).format(new Date())}（UTC+8）</footer>
    <div className="credential6-form-actions"><button className="btn primary" onClick={()=>window.print()}><Icon name="order" size={16} />打印账期账单</button></div>
  </div></ModalSurface>;
}
