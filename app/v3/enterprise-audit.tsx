"use client";
import { useEffect, useRef, useState } from "react";
import { notice, View } from "./data";
import { GovernanceEvent, phoneLabel } from "./enterprise-governance";
import { DataTable, Icon, PageHeader, Status, Tabs } from "./ui";
import { makeAudit3Fixtures } from "./enterprise-audit-data";
import { audit3Actions, Audit3Event, normalizeAudit3Event } from "./enterprise-audit-catalog";
import { ModalSurface } from "./modal-surface";

const formatTime = (time: string) => new Date(time).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
export function EnterpriseAudit({ events, go, onExport }: { events: GovernanceEvent[]; go: (view: View) => void; onExport: (count: number, scope: string) => void }) {
  const [pageSize, setPageSize] = useState(10);
  const tableScroll = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState("7"), [query, setQuery] = useState(""), [module, setModule] = useState("all"), [action, setAction] = useState("all"), [result, setResult] = useState("all");
  const [page, setPage] = useState(1), [detail, setDetail] = useState<Audit3Event | null>(null);
  const [now] = useState(() => Date.now());
  const search = useRef<HTMLInputElement>(null);
  const [fixtures] = useState(() => makeAudit3Fixtures(now));
  useEffect(() => { tableScroll.current?.scrollTo({top: 0}); }, [days, query, module, action, result, pageSize]);
  const records = [...events.flatMap(event => {
    const normalized = normalizeAudit3Event(event);
    return normalized ? [normalized] : [];
  }), ...fixtures];
  const actions = Object.entries(audit3Actions).filter(([key]) => module === "all" || module === key).flatMap(([, values]) => Object.keys(values));
  const filtered = records.filter(e => (days === "all" || new Date(e.time).getTime() >= now - Number(days) * 86400000) && `${e.actor} ${e.phone} ${phoneLabel(e.phone)} ${e.object} ${e.requestId}`.toLowerCase().includes(query.trim().toLowerCase()) && (module === "all" || e.module === module) && (action === "all" || e.action === action) && (result === "all" || e.result === result)).sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), currentPage = Math.min(page, pages);
  const resetFilters = () => { setDays("7"); setQuery(""); setModule("all"); setAction("all"); setResult("all"); setPage(1); search.current?.focus(); };
  const hasFilters = days !== "7" || !!query || module !== "all" || action !== "all" || result !== "all";
  const changePage = (next: number) => { setPage(next); tableScroll.current?.scrollTo({top: 0}); };
  const exportCsv = () => {
    // Escape spreadsheet formula prefixes as well as CSV delimiters.
    const quote = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const rows = [["时间（北京时间）", "操作人", "手机号", "角色", "模块", "功能位置", "动作", "对象", "结果", "来源 IP", "设备", "请求 ID", "变更前", "变更后", "失败原因"], ...filtered.map(e => [formatTime(e.time), e.actor, phoneLabel(e.phone), e.role, e.module, e.location, e.action, e.object, e.result, e.ip, e.device, e.requestId, e.before, e.after, e.reason ?? ""])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "企业操作审计.csv"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onExport(filtered.length, `时间：${days === "all" ? "全部" : `近${days}天`}；模块：${module === "all" ? "全部" : module}；动作：${action === "all" ? "全部" : action}；结果：${result === "all" ? "全部" : result}；关键词：${query.trim() || "无"}`);
    notice(`已导出 ${filtered.length} 条审计记录`);
  };
  const filters = (
    <div className="audit3-filters audit2-toolbar" role="search" aria-label="审计筛选">
      <label><span>时间</span><select value={days} onChange={e => { setDays(e.target.value); setPage(1); }}><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="all">全部时间</option></select></label>
      <label className="audit3-search"><span>关键词</span><div><Icon name="search" size={16}/><input ref={search} value={query} aria-label="搜索审计记录" placeholder="姓名、手机号、对象或请求 ID" onChange={e => { setQuery(e.target.value); setPage(1); }} />{query && <button type="button" aria-label="清空审计搜索" onClick={() => { setQuery(""); setPage(1); search.current?.focus(); }}><Icon name="close" size={14}/></button>}</div></label>
      <label><span>操作模块</span><select value={module} onChange={e => { setModule(e.target.value); setAction("all"); setPage(1); }}><option value="all">全部模块</option>{Object.keys(audit3Actions).map(m => <option key={m}>{m}</option>)}</select></label>
      <label><span>动作</span><select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}><option value="all">全部动作</option>{actions.map(a => <option key={a}>{a}</option>)}</select></label>
      <label><span>操作结果</span><select value={result} onChange={e => { setResult(e.target.value); setPage(1); }}><option value="all">全部结果</option><option>成功</option><option>失败</option></select></label>
      <button className="audit3-reset" type="button" disabled={!hasFilters} onClick={resetFilters}>重置筛选</button>
    </div>
  );
  return <>
    <Tabs active="audit" go={go} items={[{id:"enterprise",label:"企业与用户"},{id:"security",label:"企业认证"},{id:"audit",label:"操作审计"}]} />
    <PageHeader title="操作审计" description="查询企业管理操作，追溯操作对象、执行结果与变更记录。" />
    <section className="panel audit3-records audit2-records audit3-refined" aria-label="审计记录">
      <div className="audit3-records-heading"><div><h2>审计记录</h2><span>{records.length} 条记录</span></div><button type="button" className="btn secondary audit3-export" aria-label="导出当前筛选结果的全部记录（CSV）" title="导出当前筛选结果的全部记录（CSV）" disabled={!filtered.length} onClick={exportCsv}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/></svg>导出 CSV</button></div>
      {filters}<div className="audit2-results" role="status"><span>{days === "all" ? "全部时间" : `近 ${days} 天`} · {hasFilters ? "找到" : "共"} {filtered.length} 条记录</span></div>
      <div className="audit3-table-viewport" ref={tableScroll}>
      {filtered.length ? <DataTable caption="企业操作审计" heads={["时间（北京时间）", "操作人", "模块", "动作", "对象", "结果", "来源 IP", "操作"]} rows={filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(e => [
        <time dateTime={e.time} className="cell-stack" key={`${e.id}-time`}><span>{new Date(e.time).toLocaleDateString("zh-CN",{timeZone:"Asia/Shanghai"})}</span><small>{new Date(e.time).toLocaleTimeString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})}</small></time>,
        <div className="audit3-identity" key={`${e.id}-actor`}><span className={`audit3-avatar${e.role === "Owner" ? " is-owner" : ""}`} aria-hidden="true">{e.role === "Owner" ? "企" : e.actor.slice(0, 1)}</span><span><span className="audit3-identity-title"><b>{e.actor}</b><small className="audit3-role">{e.role}</small></span><small className="audit3-phone">{phoneLabel(e.phone)}</small></span></div>, e.module,
        <span className="audit3-wrap" key="action">{e.action}</span>, <span className="audit3-object" title={e.object} key="object">{e.object.replace(/(1[3-9]\d)\d{4}(\d{4})/g, "$1****$2")}</span>,
        <Status key={`${e.id}-result`} tone={e.result === "成功" ? "good" : "bad"}>{e.result}</Status>, <span className="audit3-ip" key="ip">{e.ip}</span>,
        <button type="button" className="row-action" key={`${e.id}-detail`} aria-label={`查看${e.actor}的${e.action}详情`} onClick={() => setDetail(e)}>查看</button>,
      ])} /> : <div className="audit3-empty"><Icon name="search" size={28}/><h3>没有匹配的审计记录</h3><button type="button" className="btn secondary" onClick={resetFilters}>重置筛选</button></div>}
      </div>
      <footer className="audit3-pagination audit2-pagination"><span>{filtered.length ? `显示 ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}，共 ${filtered.length} 条` : "共 0 条记录"}</span><nav aria-label="审计分页"><label>每页 <select aria-label="每页审计记录数" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(size => <option key={size} value={size}>{size} 条</option>)}</select></label><button className="btn secondary" type="button" aria-label="上一页审计" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>上一页</button><b>{currentPage} / {pages}</b><button className="btn secondary" type="button" aria-label="下一页审计" disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)}>下一页</button></nav></footer>
    </section>
    {detail && <ModalSurface titleId="audit3-detail-title" close={() => setDetail(null)} className="audit3-drawer">
      <header className="audit3-detail-header"><div><h2 id="audit3-detail-title">操作详情</h2><span>{formatTime(detail.time)} · 北京时间</span></div><button data-autofocus className="audit3-close" type="button" aria-label="关闭审计详情" onClick={() => setDetail(null)}><Icon name="close"/></button></header>
      <div className="audit3-detail-body"><section className="audit3-detail-summary"><span>{detail.module} / {detail.location}</span><div><h3>{detail.action}</h3><Status tone={detail.result==="成功"?"good":"bad"}>{detail.result}</Status></div><p>{detail.object}</p></section>
      {detail.reason?<section className="audit3-failure"><h3>失败原因</h3><p>{detail.reason}</p></section>:null}
      <dl className="audit3-detail-facts">{[["操作人", `${detail.actor} · ${phoneLabel(detail.phone)} · ${detail.role}`],["来源 IP",detail.ip],["设备",detail.device],["请求 ID",detail.requestId]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <section className="audit3-changes"><h3>变更记录</h3><div><article><h4>变更前</h4><pre>{detail.before}</pre></article><article><h4>变更后</h4><pre>{detail.after}</pre></article></div></section></div>
      <footer><button type="button" className="btn secondary" onClick={()=>setDetail(null)}>关闭</button></footer>
    </ModalSurface>}
  </>;
}
