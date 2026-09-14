"use client";

import { UserPolicyDialog } from "./user-policy-dialog";
import { canEditOwnQuota } from "./member-allocation";
import { enterpriseSeatLimit, visibleMembers } from "./member-lifecycle";
import { RemoveMemberDialog } from "./remove-member-dialog";
import { useRef, useState } from "react";
import { ApiKeyRecord, canManageMember, Member, Role, View } from "./data";
import { DataTable, Icon, PageHeader, Status, Tabs } from "./ui";
import { Pagination } from "./pagination";
import { ModalSurface } from "./modal-surface";
import { mvpEnterpriseTabs, mvpAssignableRoles as assignableRoles, mvpOwnsKey } from "./mvp-policy";
import { CapacityMeter, CapacityNote, capacityFor, capacityAsOf, capacityLevel, capacityLimitState } from "./mvp-capacity";
import { usage8Snapshot } from "./usage8-data";
import { enterpriseContractModels, enterpriseDefaultPolicies } from "./enterprise-resource-data";

// 资源池和邀请弹窗只呈现当前合同已开通的模型。
const contractModels = enterpriseContractModels;
const resourceModels = enterpriseContractModels;

const tabs = mvpEnterpriseTabs;
function memberKeys4(member: Member, apiKeys: ApiKeyRecord[]): ApiKeyRecord[] { return apiKeys.filter(key => mvpOwnsKey(member, key)); }
const maskPhone = (phone?: string) => phone && phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone ?? "—";
const defaultPolicies = enterpriseDefaultPolicies;

function keyState(member: Member, apiKeys: ApiKeyRecord[]) {
  const keys = memberKeys4(member, apiKeys);
  const active = member.status === "已移除" ? 0 : keys.filter(key => key.status === "有效").length;
  const inactive = keys.length - active;
  if (active && inactive) return `${active} 个有效 · ${inactive} 个停用`;
  if (active) return `${active} 个有效`;
  return keys.length ? `${keys.length} 个已停用` : "未创建";
}

export function memberNearCapacityLimit(member: Member) {
  if (!["正常", "接近上限"].includes(member.status)) return false;
  const policies = defaultPolicies(member);
  return contractModels.some(model => {
    if (!policies[model.id].enabled) return false;
    const state = capacityLimitState(capacityFor(model.id, member));
    return state === "near" || state === "reached";
  });
}

export function EnterpriseUsersMvp({ members, apiKeys, currentRole, currentMember, go, save }: { members: Member[]; apiKeys: ApiKeyRecord[]; currentRole: Role; currentMember?: Member; go: (view: View) => void; save: (member: Member) => string | null }) {
  const displayMembers = visibleMembers(members);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [nearOnly, setNearOnly] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const [detail, setDetail] = useState<Member | null>(null);
  const [confirm, setConfirm] = useState<Member | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const searchRef = useRef<HTMLInputElement>(null);
  const accountState = (member: Member) => member.status === "接近上限" ? "正常" : member.status;
  const activeSeats = displayMembers.filter(member => accountState(member) === "正常").length;
  const pendingSeats = displayMembers.filter(member => member.status === "待接受").length;
  const nearMemberIds = new Set(displayMembers.filter(member => memberNearCapacityLimit(member)).map(member => member.email));
  const filtered = displayMembers.filter(member =>
    `${member.name} ${member.phone ?? ""} ${member.email}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (role === "all" || member.role === role) && (status === "all" || accountState(member) === status) &&
    (!nearOnly || nearMemberIds.has(member.email)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const hasFilters = Boolean(query || role !== "all" || status !== "all" || nearOnly);
  const clearFilters = () => { setQuery(""); setRole("all"); setStatus("all"); setNearOnly(false); setPage(1); searchRef.current?.focus(); };
  const resourceStates = resourceModels.map(model => capacityLimitState(capacityFor(model.id)));
  const nearCount = resourceStates.filter(state => state === "near").length;
  const reachedCount = resourceStates.filter(state => state === "reached").length;
  const canInvite = assignableRoles(currentRole).length > 0;
  return <div className="eu2-page">
    <Tabs items={tabs} active="enterprise" go={go} />
    <PageHeader title="企业与用户" description="管理企业成员、模型授权与并发上限。" action={canInvite ? <button className="btn primary" type="button" onClick={() => setEditing("new")}>邀请用户</button> : undefined} />
    <section className="panel eu2-resources" aria-label="企业资源池">
      <div className="eu2-section-head"><h2>企业资源池</h2></div>
      <div className="eu2-resource-overview">
        <div className="eu2-resource-fact"><span>企业积分余量</span><strong>{usage8Snapshot.points.toLocaleString()}<small>积分</small></strong><p>有效期至 {usage8Snapshot.expiresAt}</p></div>
        <div className="eu2-resource-fact"><span>已开通模型</span><strong>{resourceModels.length}<small>个</small></strong><p>TTS {resourceModels.filter(model => model.kind === "TTS").length} 个 · ASR {resourceModels.filter(model => model.kind === "ASR").length} 个</p></div>
        <div className="eu2-resource-fact"><span>可邀请席位</span><strong>{Math.max(0, enterpriseSeatLimit - activeSeats - pendingSeats)}<small>/ {enterpriseSeatLimit} 席</small></strong><p>已加入 {activeSeats} 位{pendingSeats > 0 ? <> · 待接受占用 {pendingSeats} 席</> : null}</p></div>
      </div>
      <button className="eu2-resource-toggle" type="button" aria-expanded={expanded} aria-controls="eu2-model-resources" onClick={() => setExpanded(!expanded)}>
        <span className="eu2-resource-toggle-copy">
          <span>{expanded ? "收起模型资源" : `查看全部 ${resourceModels.length} 个模型资源`}</span>
          {nearCount > 0 ? <><span aria-hidden="true">·</span><span className="eu2-warning">{nearCount} 个接近上限</span></> : null}
          {reachedCount > 0 ? <><span aria-hidden="true">·</span><span className="eu2-critical">{reachedCount} 个已达上限</span></> : null}
        </span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded ? <div id="eu2-model-resources" className="eu2-model-resources"><DataTable caption="企业模型资源" heads={["已开通模型", "近 24h 并发峰值 / 企业并发上限"]} rows={resourceModels.map(model => {
        const snapshot = capacityFor(model.id);
        return [<span className="eu2-model-name" key={model.id}><b>{model.name}</b><small>{model.kind}</small></span>, <CapacityMeter key="peak" snapshot={snapshot} label={`${model.name} 企业近24h并发峰值`} />];
      })} /><CapacityNote /></div> : null}
    </section>
    <section className="panel eu2-members" aria-label="用户与配额">
      <div className="eu2-section-head"><h2>用户与配额 <small>{displayMembers.length} 位成员</small></h2></div>
      <div className="eu2-toolbar">
        <div className="eu2-search"><Icon name="search" size={17}/><input ref={searchRef} aria-label="搜索用户" placeholder="搜索姓名、手机号或邮箱" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />{query ? <button type="button" aria-label="清空搜索" onClick={() => { setQuery(""); setPage(1); searchRef.current?.focus(); }}><Icon name="close" size={14}/></button> : null}</div>
        <label className="eu2-select"><span className="sr-only">角色</span><select value={role} onChange={event => { setRole(event.target.value); setPage(1); }}><option value="all">全部角色</option>{["Owner", "Admin", "Developer"].map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="eu2-select"><span className="sr-only">账号状态</span><select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">全部账号状态</option>{["正常", "待接受", "已过期"].map(item => <option key={item}>{item}</option>)}</select></label>
        <button className="eu2-near-filter" aria-pressed={nearOnly} type="button" title="近 24h 并发峰值达到当前成员并发上限的 80% 及以上，包含已达上限的正常成员" onClick={() => { setNearOnly(!nearOnly); setPage(1); }}>接近上限 <b>{nearMemberIds.size}</b></button>
        {hasFilters ? <button className="eu2-reset" type="button" onClick={clearFilters}>重置筛选</button> : null}
      </div>
      <div className="eu2-results" role="status"><span>{hasFilters ? `找到 ${filtered.length} 位用户` : `全部 ${displayMembers.length} 位用户`}</span><span>显示近24h峰值占比最高的模型，完整授权见详情</span></div>
      {filtered.length ? <DataTable caption="用户与配额" heads={["用户 / 角色", "授权模型", "近 24h 并发峰值 / 成员并发上限", "API Key", "账号状态", "操作"]} rows={filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(member => {
        const policies = defaultPolicies(member);
        const enabled = contractModels.filter(model => policies[model.id].enabled);
        const peak = enabled.map(model => {
          const snapshot = capacityFor(model.id, member);
          const ratio = capacityLevel(snapshot) === "unknown" ? -1 : snapshot.peak! / snapshot.currentLimit!;
          return { model, snapshot, ratio };
        }).sort((a, b) => b.ratio - a.ratio)[0];
        const state = accountState(member);
        return [
          <div className="eu2-identity" key={member.email}><span className={`eu2-avatar${member.role === "Owner" ? " is-owner" : ""}`} aria-hidden="true">{member.role === "Owner" ? "企" : member.name.slice(0, 1)}</span><span><span className="eu2-identity-title"><b>{member.name}</b><small className="eu2-role">{member.role}</small></span><small className="eu2-phone">{maskPhone(member.phone)}</small></span></div>,
          <span className="eu2-model-count" key="models"><b>{enabled.length}<small> / {contractModels.length} 个</small></b><small>TTS {enabled.filter(model => model.kind === "TTS").length} · ASR {enabled.filter(model => model.kind === "ASR").length}</small></span>,
          <div className="eu2-member-usage" key="usage">{peak ? <><span className="eu2-peak-name">{peak.model.name}</span><CapacityMeter snapshot={peak.snapshot} label={`${member.name} ${peak.model.name} 近24h峰值`} /></> : <span>未授权模型</span>}</div>,
          keyState(member, apiKeys),
          <Status key="status" tone={state === "正常" ? "good" : "neutral"}>{state}</Status>,
          <span className="eu2-row-actions" key="actions"><button className="row-action" type="button" aria-label={`查看${member.name}`} onClick={() => setDetail(member)}>查看</button>{(canManageMember(currentRole, member.role) || canEditOwnQuota(currentMember, member)) && ["正常", "待接受"].includes(state) ? <button className="row-action" type="button" aria-label={`编辑${member.name}`} onClick={() => setEditing(member)}>编辑</button> : null}{canManageMember(currentRole, member.role) ? <button className="row-action eu2-state-action" type="button" aria-label={`移除${member.name}`} onClick={() => setConfirm(member)}>移除用户</button> : null}</span>,
        ];
      })} /> : <div className="empty-state compact"><Icon name="search" size={24}/><h3>没有匹配的用户</h3><p>试试其他姓名、手机号或邮箱，或清空筛选条件。</p><button className="btn secondary" type="button" onClick={clearFilters}>重置筛选</button></div>}
      <Pagination count={filtered.length} page={currentPage} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} label="用户" className="eu2-pagination" />
    </section>
    {editing ? <UserPolicyDialog member={editing === "new" ? undefined : editing} currentRole={currentRole} members={members} ownQuota={editing !== "new" && canEditOwnQuota(currentMember, editing)} close={() => setEditing(null)} save={member => { const error = save(member); if (!error) setEditing(null); return error; }} /> : null}
    {detail ? <UserDetail4 member={detail} apiKeys={apiKeys} canEdit={canManageMember(currentRole, detail.role) || canEditOwnQuota(currentMember, detail)} canRemove={canManageMember(currentRole, detail.role)} changeState={() => { setDetail(null); setConfirm(detail); }} close={() => setDetail(null)} edit={() => { setDetail(null); setEditing(detail); }} /> : null}
    {confirm ? <RemoveMemberDialog member={confirm} apiKeys={apiKeys} close={() => setConfirm(null)} confirm={() => { const error = save({ ...confirm, status: "已移除" }); if (!error) setConfirm(null); return error; }} /> : null}
  </div>;
}

function UserDetail4({ member, apiKeys, canEdit, canRemove, close, edit, changeState }: {
  member: Member; apiKeys: ApiKeyRecord[]; canEdit: boolean; canRemove: boolean;
  close: () => void; edit: () => void; changeState: () => void;
}) {
  const policies = defaultPolicies(member);
  const enabled = contractModels.filter(model => policies[model.id].enabled);
  const keys = memberKeys4(member, apiKeys);
  const state = member.status === "接近上限" ? "正常" : member.status;
  const activeKeys = member.status === "已移除" ? 0 : keys.filter(key => key.status === "有效").length;
  const statusTone = state === "正常" ? "good" : state === "接近上限" ? "warn" : "neutral";
  return <ModalSurface titleId="enterprise4-detail-title" close={close} className="governance-drawer enterprise4-drawer enterprise4-user-detail">
    <header className="e4-detail-header">
      <div><h2 id="enterprise4-detail-title">用户详情</h2><p>查看用户授权、并发用量与企业 API Key</p></div>
      <button type="button" data-autofocus className="e4-detail-close" aria-label="关闭用户详情" onClick={close}><Icon name="close" /></button>
    </header>
    <div className="e4-detail-body">
      <section className="e4-detail-identity" aria-label="用户信息">
        <div className="e4-detail-name"><h3>{member.name}</h3><Status tone={statusTone}>{state}</Status></div>
        <dl className="e4-detail-facts">
          <div><dt>手机号</dt><dd>{maskPhone(member.phone)}</dd></div>
          <div><dt>角色</dt><dd>{member.role}</dd></div>
          <div><dt>加入企业</dt><dd>{member.status === "待接受" ? "尚未加入" : member.joined ?? "未记录"}</dd></div>
          <div><dt>最近访问</dt><dd>{member.last || "尚未访问"}</dd></div>
        </dl>
      </section>
      <dl className="e4-detail-overview">
        <div><dt>授权模型</dt><dd>{enabled.length}<span> / {contractModels.length}</span></dd></div>
        <div><dt>有效 API Key</dt><dd>{activeKeys}<span> / {keys.length}</span></dd></div>
      </dl>
      <section className="e4-detail-section" aria-labelledby="e4-concurrency-title">
        <div className="e4-detail-section-heading"><h3 id="e4-concurrency-title">模型授权与并发</h3><span>近 24h 并发峰值 / 成员并发上限</span></div>
        <p className="e4-detail-help">成员共享企业并发资源；同一成员的所有企业 Key 共享成员上限，未设置时仅受企业总上限约束。</p>
        {member.status === "待接受" ? <p className="e4-detail-notice">用户尚未接受邀请，以下授权将在加入企业后生效。</p> : null}
        {enabled.length ? <>
          <div className="e4-detail-models">
            {enabled.map(model => <article key={model.id} className="e4-detail-model"><div className="e4-detail-model-name"><b>{model.name}</b><span>{model.kind} · 成员并发上限 {policies[model.id].concurrency === null ? "不限制" : `${policies[model.id].concurrency} 路`}</span></div><CapacityMeter snapshot={capacityFor(model.id, member)} label={`${member.name} ${model.name} 近24h峰值`} /></article>)}
          </div>
          <p className="e4-detail-help e4-detail-footnote">数据更新于 {capacityAsOf}</p>
        </> : <div className="e4-detail-empty"><b>尚未授权模型</b><p>授权后将在此显示模型及并发上限。</p></div>}
      </section>
      <section className="e4-detail-section" aria-labelledby="e4-keys-title">
        <div className="e4-detail-section-heading"><h3 id="e4-keys-title">企业 API Key</h3><span>{keyState(member, apiKeys)}</span></div>
        {keys.length ? <div className="e4-detail-key-table"><table><caption className="sr-only">用户的企业 API Key 明细</caption><thead><tr><th scope="col">名称 / Key</th><th scope="col">状态</th><th scope="col">最近调用</th></tr></thead><tbody>{keys.map(key => <tr key={key.id}>
          <td><b>{key.name}</b><small>{key.masked}</small></td>
          <td><Status tone={key.status === "有效" && member.status !== "已移除" ? "good" : "neutral"}>{member.status === "已移除" ? "已停用" : key.status}</Status></td>
          <td>{key.lastUsedAt || "尚未调用"}</td>
        </tr>)}</tbody></table></div> : <div className="e4-detail-empty"><b>尚未创建企业 API Key</b><p>{member.status === "待接受" ? "用户接受邀请后，可自行创建 Key 并调用已授权模型。" : "用户可在企业身份下自行创建 Key，继承已授权模型与并发配置。"}</p></div>}
        <p className="e4-detail-help e4-detail-footnote">仅展示该用户的企业 Key。Key 由用户本人管理，移除用户会使其企业 Key 永久失效，历史费用与用量保留。</p>
      </section>
    </div>
    <footer className="e4-detail-footer">
      <div>{canRemove ? <button type="button" className="btn secondary" onClick={changeState}>移除用户</button> : null}</div>
      <div><button type="button" className="btn secondary" onClick={close}>关闭</button>{canEdit && ["正常", "待接受"].includes(state) ? <button type="button" className="btn primary" onClick={edit}>编辑用户</button> : null}</div>
    </footer>
  </ModalSurface>;
}
