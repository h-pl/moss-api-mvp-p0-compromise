"use client";
import { Pagination } from "./pagination";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { readUsage3Context } from "./usage3-navigation";
import { mvpBillingTabs } from "./mvp-policy";
import { can, notice, type ApiKeyRecord, type Member, type Role, type View } from "./data";
import { enterpriseContractModels } from "./enterprise-resource-data";
import { mvpUsageCatalog, mvpQueryableModels } from "./mvp-fixtures";
import { makeMvpBillingDemo, groupMvpBilling, sumMvpBilling, csvMvpBilling, mvpPeriodDetails } from "./mvp-billing-data";
import { Icon, PageHeader, Tabs } from "./ui";
import { dailyUsage8, selectUsage8, usage8AsOf, usage8Dates, usage8Range, type Usage8Filters, type Usage8Metric, type Usage8Window } from "./usage8-data";
import "./usage8.css";

const metrics: { id: Usage8Metric; label: string; unit: string }[] = [
  { id: "calls", label: "计费调用次数", unit: "次" },
  { id: "ttsCharacters", label: "TTS 计费字符", unit: "字符" },
  { id: "asrDeciseconds", label: "ASR 计费音频时长", unit: "小时" },
];
const format = (value: number, digits = 0) => value.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const metricValue = (value: number, metric: Usage8Metric) => metric === "asrDeciseconds" ? value / 36000 : value;
const displayValue = (value: number, metric: Usage8Metric) => format(metricValue(value, metric), metric === "asrDeciseconds" ? 2 : 0);
const axisValue = (value: number) => value >= 1000000 ? `${format(value / 1000000, 1)}M` : value >= 1000 ? `${format(value / 1000, 1)}K` : format(value, value % 1 ? 1 : 0);
const windows: { id: Usage8Window; label: string }[] = [{ id: "month", label: "整账期" }, { id: "7d", label: "近 7 天" }, { id: "15d", label: "近 15 天" }];
const shortDate = (date: string) => date.slice(5).replace("-", "/");

function UsageCalendar({ period, days, metric }: { period: string; days: ReturnType<typeof dailyUsage8>; metric: Usage8Metric }) {
  const [focusDate, setFocusDate] = useState("");
  const [year, month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates = usage8Dates(`${period}-01`, `${period}-${last}`);
  const offset = (new Date(`${period}-01T12:00:00+08:00`).getUTCDay() + 6) % 7;
  const byDate = new Map(days.map(day => [day.date, day]));
  const max = Math.max(...days.map(day => day[metric]), 0);
  const selected = byDate.get(focusDate) ?? days.at(-1);
  const item = metrics.find(item => item.id === metric)!;
  return <section className="u8-calendar" aria-labelledby="u8-calendar-title">
    <div className="u8-chart-heading"><div><h2 id="u8-calendar-title">每日用量热力图</h2><p>{year} 年 {month} 月</p></div></div>
    <div className="u8-weekdays" aria-hidden="true">{"一二三四五六日".split("").map(day => <span key={day}>{day}</span>)}</div>
    <div className="u8-calendar-grid" aria-label={`${year} 年 ${month} 月${item.label}`}>
      {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
      {dates.map(date => {
        const day = byDate.get(date);
        const future = date > usage8AsOf.slice(0, 10);
        const level = day && day[metric] > 0 ? Math.max(1, Math.ceil(day[metric] / max * 5)) : 0;
        const label = day ? `${date}，${item.label} ${displayValue(day[metric], metric)} ${item.unit}` : `${date}，${future ? "尚未统计" : "不在所选统计范围"}`;
        return <button key={date} type="button" disabled={!day} className={`u8-day level-${level}${day ? "" : " outside"}${selected?.date === date ? " selected" : ""}`} aria-label={label} aria-pressed={!!day && selected?.date === date} title={label} onClick={() => setFocusDate(date)} onFocus={() => setFocusDate(date)}>
          {Number(date.slice(-2))}
        </button>;
      })}
    </div>
    <div className="u8-heat-legend"><span>少</span>{[0, 1, 2, 3, 4, 5].map(level => <i className={`level-${level}`} key={level} />)}<span>多</span><span className="u8-outside-key" /> <span>范围外 / 未统计</span></div>
    <div className="u8-day-detail" aria-live="polite"><span>{selected ? `${shortDate(selected.date)} ${selected.date === usage8AsOf.slice(0, 10) ? "截至 21:00" : "全天"}` : "当前窗口与账期无交集"}</span><strong>{selected ? displayValue(selected[metric], metric) : "—"}<small>{selected ? item.unit : ""}</small></strong></div>
  </section>;
}

export function Usage3Mvp({ go, role, member, members, apiKeys }: { go: (view: View) => void; role: Role; member: Member; members: Member[]; apiKeys: ApiKeyRecord[] }) {
  const defaults: Usage8Filters = { period: "2026-09", window: "month", modelId: "all", userId: member.email, keyId: "all" };
  const [filters, setFilters] = useState<Usage8Filters>(() => readUsage3Context(
    new URLSearchParams(typeof window === "undefined" ? "" : window.location.search), defaults,
    { userId: member.email, enterpriseWide: role === "Owner" || role === "Admin", modelIds: (role === "Owner" || role === "Admin" ? enterpriseContractModels : mvpQueryableModels(member)).map(model => model.id), userIds: members.map(user => user.email) },
  ));
  const [metric, setMetric] = useState<Usage8Metric>("calls");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const gradient = useId().replaceAll(":", "");
  const enterpriseWide = role === "Owner" || role === "Admin";
  const users = members.filter(item => ["Owner", "Admin", "Developer"].includes(item.role) && (enterpriseWide || item.email === member.email));
  const models = enterpriseWide ? enterpriseContractModels : mvpQueryableModels(member);
  const keyCatalog = useMemo(() => mvpUsageCatalog(members, apiKeys), [members, apiKeys]);
  const source = useMemo(() => makeMvpBillingDemo(members, apiKeys), [members, apiKeys]);
  const allowedKeys = keyCatalog.filter(key => (enterpriseWide || key.userId === member.email) && (filters.userId === "all" || key.userId === filters.userId));
  const rows = selectUsage8(source, filters, { userId: member.email, enterpriseWide, modelIds: models.map(model => model.id) });
  const statement = mvpPeriodDetails(source, filters.period, { userId: member.email, enterpriseWide, modelIds: models.map(model => model.id) });
  const totals = sumMvpBilling(rows);
  const range = usage8Range(filters.period, filters.window);
  const days = dailyUsage8(rows, range);
  const groups = groupMvpBilling(rows).sort((a, b) => b.calls - a.calls || a.keyId.localeCompare(b.keyId));
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = groups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const changed = Object.keys(defaults).some(key => defaults[key as keyof Usage8Filters] !== filters[key as keyof Usage8Filters]);
  const selectedModel = models.find(model => model.id === filters.modelId);
  const availableMetrics = metrics.filter(item => item.id === "calls" || (item.id === "ttsCharacters" ? models.some(model => model.kind === "TTS") && selectedModel?.kind !== "ASR" : models.some(model => model.kind === "ASR") && selectedModel?.kind !== "TTS"));
  const shownMetric = availableMetrics.some(item => item.id === metric) ? metric : "calls";
  const activeMetric = metrics.find(item => item.id === shownMetric)!;
  const chartData = days.map(day => ({ date: day.date, value: metricValue(day[shownMetric], shownMetric) }));
  const update = (patch: Partial<Usage8Filters>) => { setFilters(previous => ({ ...previous, ...patch })); setPage(1); };
  const reset = () => { setFilters(defaults); setPage(1); };
  const exportCSV = () => {
    if (!statement.rows.length) return;
    const blob = new Blob([csvMvpBilling(statement.rows, statement.filters, enterpriseContractModels, keyCatalog)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `Moss-账期明细-${filters.period}.csv`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice(`已导出 ${filters.period} ${enterpriseWide ? "企业全部用户" : "本人"}账期明细，共 ${groupMvpBilling(statement.rows).length} 条`);
  };
  const endLabel = range.end === Date.parse(usage8AsOf) ? "21:00" : "23:59";
  const rangeLabel = range.empty ? "所选账期与时间窗口无交集" : `${range.startDate} — ${range.endDate} ${endLabel}`;
  return <div className="usage8-page usage3-page">
    <Tabs items={mvpBillingTabs.filter(item => can(role, item.id))} active="usage3" go={go} />
    <PageHeader title="用量明细" description="查看每日用量趋势及各 API Key 的计费明细。" action={<button className="btn secondary" type="button" onClick={exportCSV} disabled={!statement.rows.length} title="导出所选账期权限范围内全部明细，不受模型、用户、API Key、时间窗口或分页筛选影响"><Icon name="order" size={16} />导出账期明细</button>} />


    <section className="u8-filter-panel" aria-label="用量筛选">
      <div className="u8-filters">
        <label><span>账期</span><select aria-label="账期" value={filters.period} onChange={event => update({ period: event.target.value })}><option value="2026-09">2026 年 9 月</option><option value="2026-08">2026 年 8 月</option></select></label>
        <label className="u8-model-filter"><span>模型</span><select aria-label="模型" value={filters.modelId} onChange={event => update({ modelId: event.target.value })}><option value="all">全部模型</option>{models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        <label><span>用户</span><select aria-label="用户" value={filters.userId} disabled={!enterpriseWide} onChange={event => update({ userId: event.target.value, keyId: "all" })}>{enterpriseWide && <option value="all">全部用户</option>}{users.map(user => <option key={user.email} value={user.email}>{user.name}{user.email === member.email ? "（本人）" : ` · ${user.role}`}</option>)}</select></label>
        <label><span>API Key</span><select aria-label="API Key" value={filters.keyId} onChange={event => update({ keyId: event.target.value })}><option value="all">全部 API Key</option>{allowedKeys.map(key => <option key={key.id} value={key.id}>{key.name} · {key.masked.slice(-4)}{filters.userId === "all" ? ` · ${key.user}` : ""}</option>)}</select></label>
        {changed && <button className="u8-reset" type="button" onClick={reset}>重置筛选</button>}
      </div>
      <div className="u8-window-row"><div className="u8-scope"><span>{rangeLabel}<small>UTC+8</small></span></div><div className="u8-window-switch" role="group" aria-label="时间窗口">{windows.map(window => <button type="button" key={window.id} aria-pressed={filters.window === window.id} className={filters.window === window.id ? "active" : ""} onClick={() => update({ window: window.id })}>{window.label}</button>)}</div></div>
    </section>

    <section className="u8-analytics" aria-label="计费用量看板">
      <div className="u8-metrics" role="group" aria-label="图表指标">
        {availableMetrics.map(item => {
          return <button type="button" key={item.id} className={`u8-metric${shownMetric === item.id ? " active" : ""}`} aria-pressed={shownMetric === item.id} aria-label={`查看${item.label}图表`} onClick={() => setMetric(item.id)}>
            <span className="u8-metric-label"><i />{item.label}<span className="u8-metric-selected">{shownMetric === item.id ? "图表展示中" : "查看图表 ↗"}</span></span>
            <strong>{!range.empty ? displayValue(totals[item.id], item.id) : "—"}<small>{!range.empty ? item.unit : ""}</small></strong>
          </button>;
        })}
      </div>
      {range.empty ? <div className="u8-range-empty"><Icon name="chart" size={28} /><h2>当前时间窗口不在该账期内</h2><p>近 7 天、近 15 天均以数据截至日为基准，且只统计与所选账期重合的日期。</p><button className="btn" type="button" onClick={() => update({ window: "month" })}>查看该账期全部用量</button></div> : <div className="u8-charts">
        <section className="u8-trend" aria-labelledby="u8-trend-title"><div className="u8-chart-heading"><div><h2 id="u8-trend-title">计费用量趋势</h2><p><i className="u8-series-dot" />{activeMetric.label} <span>· {activeMetric.unit}</span></p></div><span className="u8-tag">{shortDate(range.startDate)} — {shortDate(range.endDate)}</span></div>
          <div className="u8-chart" role="img" aria-label={`${activeMetric.label}每日趋势，合计 ${displayValue(totals[shownMetric], shownMetric)} ${activeMetric.unit}`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={chartData} margin={{ top: 14, right: 15, bottom: 0, left: -10 }} accessibilityLayer>
              <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f4772e" stopOpacity={0.2} /><stop offset="100%" stopColor="#f4772e" stopOpacity={0.015} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#eaedef" strokeDasharray="3 4" />
              <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: "#7a8087", fontSize: 12 }} dy={8} />
              <YAxis tickFormatter={axisValue} tickLine={false} axisLine={false} width={66} tick={{ fill: "#7a8087", fontSize: 12 }} domain={[0, (max: number) => max || 4]} allowDecimals={shownMetric === "asrDeciseconds"} />
              <Tooltip labelFormatter={label => `${label}${label === usage8AsOf.slice(0, 10) ? " · 截至 21:00" : " · 全天"}`} formatter={value => [`${format(Number(value), shownMetric === "asrDeciseconds" ? 2 : 0)} ${activeMetric.unit}`, activeMetric.label]} contentStyle={{ border: "1px solid #e5e7e9", borderRadius: 8, fontSize: 12 }} />
              <Area type="linear" dataKey="value" stroke="#ef782f" strokeWidth={2.5} fill={`url(#${gradient})`} dot={days.length <= 10 ? { r: 3, strokeWidth: 2, fill: "white" } : false} activeDot={{ r: 5, fill: "#ef782f", stroke: "white", strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart></ResponsiveContainer>
          </div>{!rows.length && <p className="u8-chart-footnote">当前筛选暂无计费用量</p>}
        </section>
        <UsageCalendar key={`${filters.period}:${filters.window}:${filters.modelId}:${filters.userId}:${filters.keyId}`} period={filters.period} days={days} metric={shownMetric} />
      </div>}
    </section>

    <section className="u8-details" aria-labelledby="u8-details-title">
      <header className="u8-details-header"><div><h2 id="u8-details-title">API Key 用量明细 <span>{groups.length}</span></h2><p>汇总所选时间范围内各 API Key 的用量与费用，按模型分行展示</p></div><span className="u8-tag">计费调用次数降序</span></header>
      <div className="u8-table-scroll"><table><caption className="sr-only">用量明细 API Key 聚合用量</caption><thead><tr><th scope="col">API Key</th><th scope="col">所属用户</th><th scope="col">模型</th><th scope="col" className="numeric usage3-calls-heading">计费调用次数（次）</th><th scope="col" className="numeric">计费用量</th><th scope="col" className="numeric">消耗积分</th><th scope="col" className="numeric">折后金额估算</th></tr></thead><tbody>
        {paged.map(group => {
          const model = enterpriseContractModels.find(model => model.id === group.modelId)!;
          const key = keyCatalog.find(key => key.id === group.keyId)!;
          const user = users.find(user => user.email === group.userId);
          return <tr key={`${group.modelId}:${group.userId}:${group.keyId}`}><td data-label="API Key"><span>{key.name}</span><small title={key.masked}>{key.masked}</small></td><td data-label="所属用户"><div className="usage3-user-title"><span title={user?.name ?? key.user}>{user?.name ?? key.user}</span>{user && <span className="eu2-role">{user.role}</span>}</div><small>{user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") ?? "企业成员"}</small></td><td data-label="模型"><span className="u8-model-name" title={model.name}>{model.name}</span><span className={`u8-service ${model.kind.toLowerCase()}`}>{model.kind}</span></td><td className="numeric" data-label="计费调用次数（次）">{format(group.calls)}</td><td className="numeric" data-label="计费用量">{model.kind === "TTS" ? `${format(group.ttsCharacters)} 字符` : `${format(group.asrDeciseconds / 10, 1)} 秒`}</td><td className="numeric" data-label="消耗积分">{format(group.pointCents / 100, 2)} 积分</td><td className="numeric" data-label="折后金额估算">¥{format(group.amountCents / 100, 2)}</td></tr>;
        })}
        {!groups.length && <tr><td colSpan={7}><div className="u8-table-empty"><Icon name="folder" size={24} /><strong>暂无计费用量</strong><span>{range.empty ? "请切换到整账期，或选择与时间窗口重合的账期。" : "该范围内尚无纳入计费计量的调用，请调整筛选条件。"}</span>{changed && <button type="button" className="u8-reset" onClick={reset}>重置筛选</button>}</div></td></tr>}
        {groups.length > 0 && Array.from({ length: pageSize - paged.length }, (_, i) => <tr className="u8-spacer-row" aria-hidden="true" key={`spacer-${i}`}><td colSpan={7} /></tr>)}
      </tbody>{!!groups.length && <tfoot><tr><th colSpan={3} scope="row">当前筛选合计 <span>全部 {groups.length} 条</span></th><td className="numeric" data-label="计费调用次数（次）">{format(totals.calls)}</td><td className="numeric" data-label="计费用量">{models.some(model => model.kind === "TTS") && selectedModel?.kind !== "ASR" && <span>{format(totals.ttsCharacters)} 字符</span>}{models.some(model => model.kind === "ASR") && selectedModel?.kind !== "TTS" && <span>{format(totals.asrDeciseconds / 10, 1)} 秒</span>}</td><td className="numeric" data-label="消耗积分">{format(totals.pointCents / 100, 2)} 积分</td><td className="numeric" data-label="折后金额估算">¥{format(totals.amountCents / 100, 2)}</td></tr></tfoot>}</table></div>
      <Pagination count={groups.length} page={currentPage} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} label="明细" className="u8-pagination" />
    </section>

  </div>;
}
