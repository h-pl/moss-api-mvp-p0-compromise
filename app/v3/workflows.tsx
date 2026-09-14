"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiKeyRecord, NotificationCategory, NotificationRecord, notice, Role, View, WorkspaceProject } from "./data";
import { Icon, PageHeader, Status } from "./ui";

type NotificationProps = { items: NotificationRecord[]; close: () => void; go: (view: View) => void; markRead: (id: string) => void; markAllRead: () => void };

export function NotificationPanel({ items, close, go, markRead, markAllRead }: NotificationProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const unreadCount = items.filter(item => !item.isRead).length;
  const openItem = (item: NotificationRecord) => { markRead(item.id); close(); go(item.target); };
  return <div className="drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <aside className="notification-drawer" role="dialog" aria-modal="true" aria-labelledby="notification-title">
      <header><div><span>消息</span><h2 id="notification-title">通知</h2></div><button ref={closeRef} className="dialog-close" type="button" aria-label="关闭通知中心" onClick={close}><Icon name="close" /></button></header>
      <div className="notification-list">{items.slice(0, 5).map(item => <button type="button" key={item.id} className={item.isRead ? "read" : "unread"} onClick={() => openItem(item)}><i className={`notice-dot ${item.tone}`} aria-hidden="true"/><span><b>{item.title}</b><small>{item.category} · {item.time}</small><em>{item.summary}</em></span><Icon name="chevron" /></button>)}</div>
      <footer><span>{unreadCount ? `${unreadCount} 条未读` : "已全部阅读"}</span><div><button className="text-button" type="button" disabled={!unreadCount} onClick={markAllRead}>全部已读</button><button className="btn secondary compact" type="button" onClick={() => { close(); go("notifications"); }}>查看全部</button></div></footer>
    </aside>
  </div>;
}

export function NotificationCenter({ role, items, go, markRead, markAllRead }: { role: Role; items: NotificationRecord[]; go: (view: View) => void; markRead: (id: string) => void; markAllRead: () => void }) {
  const [category, setCategory] = useState<"全部" | NotificationCategory>("全部");
  const [readState, setReadState] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => items.filter(item => (category === "全部" || item.category === category) && (readState === "all" || (readState === "unread" ? !item.isRead : item.isRead)) && `${item.title}${item.summary}${item.category}`.toLowerCase().includes(query.trim().toLowerCase())), [items, category, readState, query]);
  const selected = items.find(item => item.id === selectedId) ?? filtered[0];
  const unreadCount = items.filter(item => !item.isRead).length;
  const choose = (item: NotificationRecord) => { setSelectedId(item.id); markRead(item.id); };
  return <>
    <PageHeader eyebrow="MESSAGE CENTER" title="通知中心" description="按当前角色和成员收件范围接收权限、凭证、资源与费用消息。通知只负责提醒，最终状态以业务对象为准。" action={<button className="btn secondary" type="button" disabled={!unreadCount} onClick={markAllRead}>全部标为已读</button>}/>
    <section className="panel notification-toolbar" aria-label="通知筛选">
      <label className="search-control"><Icon name="search"/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索通知标题或内容" aria-label="搜索通知"/>{query ? <button type="button" aria-label="清空通知搜索" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><Icon name="close" size={14}/></button> : null}</label>
      <label><span>消息类型</span><select value={category} onChange={event => setCategory(event.target.value as "全部" | NotificationCategory)}><option>全部</option><option>权限与安全</option><option>凭证</option><option>配额</option><option>费用</option><option>系统</option></select></label>
      <label><span>阅读状态</span><select value={readState} onChange={event => setReadState(event.target.value)}><option value="all">全部状态</option><option value="unread">仅未读</option><option value="read">已读</option></select></label>
      <div className="filter-summary"><span>当前视角</span><b>{role} · {unreadCount} 条未读</b></div>
    </section>
    <section className="notification-center-grid">
      <div className="panel notification-inbox" aria-label="通知列表">
        <header><b>{filtered.length} 条消息</b><span>按时间倒序</span></header>
        {filtered.length ? <div>{filtered.map(item => <button type="button" key={item.id} className={`${selected?.id === item.id ? "active" : ""} ${item.isRead ? "read" : "unread"}`} onClick={() => choose(item)}><i className={`notice-dot ${item.tone}`} aria-hidden="true"/><span><b>{item.title}</b><small>{item.category} · {item.time}</small><em>{item.summary}</em></span>{!item.isRead ? <strong aria-label="未读">NEW</strong> : null}</button>)}</div> : <div className="empty-state"><Icon name="bell" size={28}/><h3>没有匹配通知</h3><p>清空筛选或切换消息类型后重试。</p><button className="btn secondary" type="button" onClick={() => { setQuery(""); setCategory("全部"); setReadState("all"); }}>清空筛选</button></div>}
      </div>
      <article className="panel notification-detail">{selected ? <><header><div><Status tone={selected.tone}>{selected.category}</Status><span>{selected.time}</span></div><h2>{selected.title}</h2><code>{selected.id}</code></header><div className="notification-detail-body"><p>{selected.summary}</p><dl><div><dt>接收角色</dt><dd>{selected.audience.join(" / ")}</dd></div><div><dt>收件账号</dt><dd>{selected.recipientEmails?.join(" / ") ?? "企业通知"}</dd></div><div><dt>阅读状态</dt><dd>{selected.isRead ? "已读" : "未读"}</dd></div><div><dt>消息边界</dt><dd>提醒与导航，不替代业务对象状态</dd></div></dl></div><footer><button className="btn primary" type="button" onClick={() => go(selected.target)}>{selected.actionLabel} →</button></footer></> : <div className="empty-state"><Icon name="bell" size={28}/><h3>选择一条通知</h3><p>这里会展示消息上下文和下一步操作。</p></div>}</article>
    </section>
  </>;
}

export function ResourceDialog({ actorName, close, complete }: { kind?: "project"; actorName: string; projects?: WorkspaceProject[]; defaultProjectId?: string; close: () => void; complete: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError("请输入项目名称。"); return; }
    complete(name.trim());
  };
  return <div className="dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="resource-title">
      <button ref={closeRef} className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>
      <form noValidate onSubmit={submit}>
        <span className="eyebrow">NEW PROJECT</span>
        <h2 id="resource-title">创建项目</h2>
        <p>项目隔离 API Key、配额、日志和用量。</p>
        <label><span>项目名称</span><input value={name} onChange={event => { setName(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "resource-error" : undefined} placeholder="例如：智能外呼生产" />{error ? <em id="resource-error" role="alert">{error}</em> : null}</label>
        <label><span>创建人</span><input value={actorName} readOnly/></label>
        <div className="permission-preview"><b>创建后</b><p>项目写入企业 Workspace，Owner / Admin 立即可见；Developer 需要被授予 Project Scope。</p></div>
        <footer><button className="btn secondary" type="button" onClick={close}>取消</button><button className="btn primary" type="submit" disabled={!name.trim()}>创建项目</button></footer>
      </form>
    </section>
  </div>;
}

export function QuotaRequestDialog({ projectName, currentRpm, currentConcurrency, close, complete }: { projectName: string; currentRpm: string; currentConcurrency: string; close: () => void; complete: (summary: string) => void }) {
  const [metric, setMetric] = useState<"rpm" | "concurrency">("rpm");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const current = metric === "rpm" ? currentRpm : currentConcurrency;
  const targetValue = Number(target);
  const canSubmit = Boolean(target.trim() && Number.isFinite(targetValue) && targetValue > 0 && reason.trim());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!target.trim() || !Number.isFinite(targetValue) || targetValue <= 0) { setError("请输入大于 0 的目标值。"); return; }
    if (!reason.trim()) { setError("请填写业务说明，便于商务或平台评估。"); return; }
    complete(`${metric === "rpm" ? "项目 RPM" : "项目并发"}：${current} → ${target.trim()}；${reason.trim()}`);
  };
  return <div className="dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="quota-request-title" aria-describedby="quota-request-desc">
      <button ref={closeRef} className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>
      <form noValidate onSubmit={submit}>
        <span className="eyebrow">QUOTA REQUEST</span>
        <h2 id="quota-request-title">申请调整配额</h2>
        <p id="quota-request-desc">配额由商务权益和平台策略下发；此处提交申请，不会直接改变当前限制。</p>
        <div className="dialog-readonly-field"><span>归属 Project</span><b>{projectName}</b></div>
        <label><span>申请指标</span><select value={metric} onChange={event => { setMetric(event.target.value as "rpm" | "concurrency"); setTarget(""); setError(""); }}><option value="rpm">项目 RPM</option><option value="concurrency">项目并发</option></select></label>
        <div className="quota-current-value"><span>当前有效值</span><b>{current}</b><small>只读 · 由订单权益 / 平台策略决定</small></div>
        <label><span>期望值</span><input inputMode="numeric" value={target} onChange={event => { setTarget(event.target.value.replace(/[^0-9]/g, "")); setError(""); }} placeholder={metric === "rpm" ? "例如：800" : "例如：120"} aria-invalid={Boolean(error)} /></label>
        <label><span>业务说明</span><textarea className="resize-none" value={reason} onChange={event => { setReason(event.target.value); setError(""); }} placeholder="说明业务峰值、上线时间或预计增长" rows={3} aria-invalid={Boolean(error)} /></label>
        {error ? <em role="alert">{error}</em> : null}
        <div className="notice warning"><Icon name="shield" /><div><b>需要商务 / 平台审批</b><span>申请提交后，当前 Project 的限流策略保持不变；审批结果将通过通知中心同步。</span></div></div>
        <footer><button className="btn secondary" type="button" onClick={close}>取消</button><button className="btn primary" type="submit" disabled={!canSubmit}>提交申请</button></footer>
      </form>
    </section>
  </div>;
}

export function KeyLifecycleDialog({ mode, apiKey, close, complete }: { mode: "rotate" | "disable"; apiKey: ApiKeyRecord; close: () => void; complete: () => void }) {
  const [rotated, setRotated] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const rotate = mode === "rotate";
  return <div className="dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="lifecycle-title" aria-describedby="lifecycle-desc">
      <button ref={closeRef} className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>
      {rotated ? <div className="secret-result"><span className="success-icon"><Icon name="check" /></span><span className="eyebrow">ROTATED</span><h2 id="lifecycle-title">新 Key 已生成</h2><p id="lifecycle-desc">完整值仅展示一次；旧 Key 将在 24 小时迁移窗口后失效。</p><code>sk_live_moss_91BC42YUNFU2026</code><button className="btn secondary" type="button" onClick={() => notice("新 Key 已复制（Demo）")}><Icon name="copy" size={14} /> 复制新 Key</button><footer><button className="btn primary" type="button" onClick={complete}>我已安全保存</button></footer></div> : <><span className="eyebrow">{rotate ? "ROTATE CREDENTIAL" : "DISABLE CREDENTIAL"}</span><h2 id="lifecycle-title">{rotate ? `轮换 ${apiKey.name}` : `停用 ${apiKey.name}`}</h2><p id="lifecycle-desc">{rotate ? "系统将生成一个新版本。旧 Key 保留 24 小时迁移窗口，期间两者都可调用并分别记录审计。" : "停用后所有使用该 Key 的请求会立即返回 401；历史日志、用量和计量记录仍保留。"}</p><div className={`impact-box ${rotate ? "" : "danger"}`}><b>影响对象</b><span>{apiKey.projectName} / {apiKey.name}</span></div><footer><button className="btn secondary" type="button" onClick={close}>取消</button><button className={`btn ${rotate ? "primary" : "danger"}`} type="button" onClick={() => rotate ? setRotated(true) : complete()}>{rotate ? "生成新 Key" : "确认停用"}</button></footer></>}
    </section>
  </div>;
}
