"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { ApiKeyRecord, Member, notice, View } from "./data";
import { mvpCredentialTabs, mvpOwnsKey } from "./mvp-policy";
import { CapacityMeter, CapacityNote, capacityFor, capacityLimitState } from "./mvp-capacity";
import { usage8Snapshot } from "./usage8-data";
import { makeMvpBillingDemo, sumMvpBilling } from "./mvp-billing-data";
import { EnterpriseContractModel, enterpriseContractModels, enterpriseDefaultPolicies } from "./enterprise-resource-data";
import { Pagination } from "./pagination";
import { ModalSurface } from "./modal-surface";
import { DataTable, Icon, PageHeader, Status, Tabs } from "./ui";

type EffectiveModel7 = EnterpriseContractModel & { enabled: boolean; memberConcurrency: number | null };
type CredentialActionMode7 = "disable" | "enable";


function effectiveModels7(member: Member): EffectiveModel7[] {
  const policies = enterpriseDefaultPolicies(member);
  return enterpriseContractModels.map(model => {
    const policy = policies[model.id];
    return {
      ...model,
      enabled: policy.enabled,
      memberConcurrency: policy.concurrency,
    };
  });
}

const keyTone7 = (status: ApiKeyRecord["status"]) => status === "已停用" ? "neutral" : "good";

export function ApiCredentialsMvp({ go, createKey, member, apiKeys, updateKey }: {
  go: (view: View) => void;
  createKey: (key: ApiKeyRecord) => boolean;
  member: Member;
  apiKeys: ApiKeyRecord[];
  updateKey: (key: ApiKeyRecord, action: CredentialActionMode7) => string | null;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<{ key: ApiKeyRecord; mode: CredentialActionMode7 } | null>(null);
  const models = useMemo(() => effectiveModels7(member), [member]);
  const enabledModels = useMemo(() => models.filter(model => model.enabled), [models]);
  const resourceStates = enabledModels.map(model => capacityLimitState(capacityFor(model.id, member)));
  const nearCount = resourceStates.filter(state => state === "near").length;
  const reachedCount = resourceStates.filter(state => state === "reached").length;
  const ownKeys = useMemo(() => apiKeys.filter(key => mvpOwnsKey(member, key)), [apiKeys, member]);
  const usageRows = useMemo(() => makeMvpBillingDemo([member], apiKeys).filter(row => row.date.startsWith("2026-09")), [member, apiKeys]);
  const usage = { points: sumMvpBilling(usageRows).pointCents / 100 };
  const currentKeys = ownKeys.filter(key => !key.revokedByMemberRemovalAt);
  const activeKeys = currentKeys.filter(key => key.status === "有效").length;
  const disabledKeys = currentKeys.filter(key => key.status === "已停用").length;
  const accountCallable = member.status === "正常" && enabledModels.length > 0;
  const canCreate = accountCallable && currentKeys.length < 50;
  const createDisabledReason = currentKeys.length >= 50 ? "已达 50 个上限" : member.status !== "正常" ? "账号当前不可用" : "当前未授权模型";
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = ownKeys.filter(key => (!normalizedQuery || `${key.name} ${key.masked} ${key.status}`.toLowerCase().includes(normalizedQuery)) && (status === "all" || key.status === status));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const hasFilters = Boolean(query || status !== "all");
  const resetFilters = () => { setQuery(""); setStatus("all"); setPage(1); searchRef.current?.focus(); };
  const attributedPoints = (model: EffectiveModel7) => sumMvpBilling(usageRows.filter(row => row.modelId === model.id)).pointCents / 100;
  const completeAction = () => {
    if (!action) return null;
    const error = updateKey(action.key, action.mode);
    if (!error) setAction(null);
    return error;
  };

  return <div className="credential7-page">
    <Tabs items={mvpCredentialTabs} active="keys" go={go} />
    <PageHeader title="API 密钥" description="查看本人的模型授权与用量，并管理本人创建的 API Key。" action={<button className="btn primary" type="button" disabled={!canCreate} title={!canCreate ? createDisabledReason : undefined} onClick={() => setCreating(true)}>创建 API Key</button>} />

    <section className="panel credential7-resources" aria-label="我的调用资源">
      <header className="credential7-section-head"><h2>我的调用资源</h2></header>
      <div className="credential7-resource-overview">
        <article className="credential7-resource-fact"><span>模型授权</span><strong>{enabledModels.length}<small>/ {models.length} 个模型</small></strong><p>TTS {enabledModels.filter(model => model.kind === "TTS").length} 个 · ASR {enabledModels.filter(model => model.kind === "ASR").length} 个</p></article>
        <article className="credential7-resource-fact"><span>我的 API Key</span><strong>{currentKeys.length}<small>/ 50 个</small></strong><p>{activeKeys} 个有效 · <button className="credential7-summary-link" type="button" onClick={() => { setStatus("已停用"); setPage(1); }}>{disabledKeys} 个已停用</button></p></article>
        <article className="credential7-resource-fact"><span>本人本月已用积分</span><strong>{usage.points.toLocaleString()}<small>积分</small></strong><p>当前账期 · 2026年9月</p></article>
        <article className="credential7-resource-fact"><span>企业积分余量</span><strong>{usage8Snapshot.points.toLocaleString()}<small>积分</small></strong><p>有效期至 {usage8Snapshot.expiresAt}</p></article>
      </div>
      <button className="credential7-resource-toggle" type="button" aria-expanded={resourceOpen} aria-controls="credential7-model-resources" onClick={() => setResourceOpen(!resourceOpen)}>
        <span className="credential7-resource-toggle-copy">
          <span>{resourceOpen ? "收起授权模型" : `查看全部 ${enabledModels.length} 个授权模型`}</span>
          {nearCount > 0 ? <><span aria-hidden="true">·</span><span className="is-warning">{nearCount} 个接近上限</span></> : null}
          {reachedCount > 0 ? <><span aria-hidden="true">·</span><span className="is-critical">{reachedCount} 个已达上限</span></> : null}
        </span>
        <span aria-hidden="true">{resourceOpen ? "−" : "+"}</span>
      </button>
      {resourceOpen ? <div id="credential7-model-resources" className="credential7-model-resources"><DataTable caption="本人授权模型" heads={["模型", "近 24h 并发峰值 / 本人并发上限", "本月已用积分"]} rows={enabledModels.map(model => [<span className="credential7-model-name" key={model.id}><b>{model.name}</b><small>{model.kind}</small></span>, <CapacityMeter key="peak" snapshot={capacityFor(model.id, member)} label={`${model.name} 本人近24h并发峰值`} />, `${attributedPoints(model).toLocaleString()} 积分`])} /><CapacityNote /></div> : null}
    </section>

    <section className="panel credential7-keys" aria-label="我的 API Key">
      <header className="credential7-section-head"><h2>我的 API Key <small>{ownKeys.length} 个</small></h2></header>
      {ownKeys.length > currentKeys.length ? <p className="e4-detail-help">因用户移除而永久失效的历史 Key 不占创建额度。</p> : null}
      <div className="credential7-toolbar" role="search" aria-label="筛选我的 API Key">
        <label className="credential7-search"><span className="sr-only">关键词</span><Icon name="search" size={16} /><input ref={searchRef} aria-label="搜索 API Key" value={query} placeholder="搜索名称或脱敏 Key" onChange={event => { setQuery(event.target.value); setPage(1); }} />{query ? <button type="button" aria-label="清空 API Key 搜索" onClick={() => { setQuery(""); setPage(1); searchRef.current?.focus(); }}><Icon name="close" size={14} /></button> : null}</label>
        <label className="credential7-select"><span className="sr-only">状态</span><select aria-label="按状态筛选 API Key" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">全部状态</option><option>有效</option><option>已停用</option></select></label>
        {hasFilters ? <button className="eu2-reset" type="button" onClick={resetFilters}>重置筛选</button> : null}
      </div>
      <div className="credential7-results" role="status"><span>{hasFilters ? `找到 ${filtered.length} 个 API Key` : `全部 ${ownKeys.length} 个 API Key`}</span></div>
      <div className="credential7-key-table">{filtered.length ? <DataTable caption="API 密钥列表" heads={["API Key", "创建时间", "本月已用积分", "最近调用", "状态", "操作"]} rows={filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(key => [
        <div className="credential7-key-identity" key={key.id}><span><Icon name="key" size={15} /></span><div><b>{key.name}</b><code>{key.masked}</code></div></div>,
        <time key="created">{key.createdAt}</time>,
        `${(sumMvpBilling(usageRows.filter(row => row.keyId === key.id)).pointCents / 100).toLocaleString("zh-CN", {maximumFractionDigits:2})} 积分`,
        <b key="last">{key.lastUsedAt}</b>,
        <Status key="status" tone={keyTone7(key.status)}>{key.status}</Status>,
        <span className="credential7-actions" key="actions">{key.revokedByMemberRemovalAt ? <span title="该用户被移除时原有企业 Key 已永久失效，请创建新的 Key">已失效</span> : key.status === "已停用" ? <button className="row-action" type="button" disabled={!accountCallable} onClick={() => setAction({ key, mode: "enable" })}>启用</button> : <button className="row-action credential7-state-action" type="button" onClick={() => setAction({ key, mode: "disable" })}>停用</button>}</span>,
      ])} /> : <div className="credential7-empty"><span><Icon name={hasFilters ? "search" : "key"} size={24} /></span><h3>{hasFilters ? "没有匹配的 API Key" : accountCallable ? "尚未创建 API Key" : "当前账号不可创建 API Key"}</h3><p>{hasFilters ? "调整关键词或状态后重试。" : member.status !== "正常" ? "账号状态正常后，才可创建或启用 API Key。" : enabledModels.length === 0 ? "获得至少一个模型授权后，才可创建 API Key。" : "使用页面右上角的入口创建 API Key。"}</p>{hasFilters ? <button className="btn secondary" type="button" onClick={resetFilters}>重置筛选</button> : null}</div>}</div>
      <Pagination count={filtered.length} page={currentPage} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} label="API Key" className="credential7-pagination" />
    </section>

    {creating ? <CreateCredential7 member={member} close={() => setCreating(false)} create={key => { const ok = createKey(key); if (ok) setPage(1); return ok; }} /> : null}
    {action ? <CredentialAction7 action={action} close={() => setAction(null)} complete={completeAction} /> : null}
  </div>;
}

function CreateCredential7({ member, close, create }: { member: Member; close: () => void; create: (key: ApiKeyRecord) => boolean }) {
  const [name, setName] = useState("");
  const [created, setCreated] = useState<ApiKeyRecord | null>(null);
  const [secret] = useState(() => `sk_demo_${crypto.randomUUID().replaceAll("-", "")}`);
  const trimmedName = name.trim();
  const authorizedModelCount = effectiveModels7(member).filter(model => model.enabled).length;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmedName) return;
    const createdAt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", dateStyle: "short", timeStyle: "short" }).format(new Date());
    const next: ApiKeyRecord = { id: `key_demo_${Date.now()}`, name: trimmedName, masked: `sk_demo_••••${secret.slice(-4)}`, identity: "enterprise", ownerPhone: member.phone, accountId: member.email, accountName: member.name, projectId: "enterprise", projectName: "企业账号", scopes: ["api:invoke"], ipAllowlist: "未限制", expiresAt: "长期有效", createdBy: member.name, createdAt, lastUsedAt: "尚未调用", lastRotatedAt: "—", version: 1, usage: "0 积分", status: "有效", exposureEvents: [{ memberEmail: member.email, memberName: member.name, action: "创建", at: createdAt, version: 1 }] };
    if (create(next)) setCreated(next);
  };
  const copySecret = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(secret); notice("API Key 已复制（Demo）"); }
    catch { notice("复制失败，请手动复制 API Key"); }
  };
  return <ModalSurface titleId="credential7-create-title" descriptionId="credential7-create-description" close={close} className="credential6-dialog">
    <button className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>
    {created ? <div className="credential6-secret"><span className="success-icon"><Icon name="check" /></span><h2 id="credential7-create-title">API Key 已创建</h2><p id="credential7-create-description">完整密钥只展示这一次。关闭后仅保留脱敏值。</p><code>{secret}</code><button className="btn secondary" type="button" onClick={copySecret}><Icon name="copy" size={14} /> 复制 API Key</button><button className="btn primary" type="button" onClick={close}>我已安全保存</button></div> : <form noValidate onSubmit={submit}><h2 id="credential7-create-title">创建 API Key</h2><p id="credential7-create-description">Key 自动继承当前账号的模型授权与并发策略。</p><label className="credential6-name-field"><span><b>API Key 名称</b><em>{name.length} / 50</em></span><input data-autofocus autoFocus maxLength={50} value={name} placeholder="请输入" onChange={event => setName(event.target.value)} /></label><div className="credential6-fixed-field"><span>授权模型</span><div><b>继承当前账号已授权模型</b><small>{authorizedModelCount} 个模型</small></div></div><div className="credential6-form-actions"><button className="btn secondary" type="button" onClick={close}>取消</button><button className="btn primary" type="submit" disabled={!trimmedName}>确认</button></div></form>}
  </ModalSurface>;
}

function CredentialAction7({ action, close, complete }: { action: { key: ApiKeyRecord; mode: CredentialActionMode7 }; close: () => void; complete: () => string | null }) {
  const [error, setError] = useState("");
  const enable = action.mode === "enable";
  return <ModalSurface titleId="credential7-action-title" descriptionId="credential7-action-description" close={close} role="alertdialog" className="enterprise4-state-dialog credential7-state-dialog">
    <button className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>
    <header className="enterprise4-state-heading"><h2 id="credential7-action-title">{enable ? "启用 API Key" : "停用 API Key"}</h2><p id="credential7-action-description">{enable ? "启用前会重新校验当前账号状态、模型授权与资源。" : "停用后，该 Key 将无法继续调用 API。"}</p></header>
    <div className="enterprise4-state-member"><div><b>{action.key.name}</b><span>{action.key.masked}</span></div><span>{action.key.status}</span></div>
    <section className="enterprise4-state-effects"><h3>操作影响</h3><ul><li>{enable ? "仅启用当前 Key，继承账号当前有效授权。" : "使用当前 Key 的后续调用失效；历史用量继续保留。"}</li><li>其他 Key、账号和模型授权不受影响。</li></ul></section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <footer><button className="btn secondary" data-autofocus type="button" onClick={close}>取消</button><button className={`btn ${enable ? "primary" : "danger"}`} type="button" onClick={() => setError(complete() ?? "")}>{enable ? "确认启用" : "确认停用"}</button></footer>
  </ModalSurface>;
}
