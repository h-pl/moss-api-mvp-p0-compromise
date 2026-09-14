"use client";
import { FormEvent, useRef, useState } from "react";
import { Member, Role } from "./data";
import { Icon } from "./ui";
import { ModalSurface } from "./modal-surface";
import { mvpAssignableRoles as assignableRoles } from "./mvp-policy";
import { enterpriseContractModels as contractModels, enterpriseDefaultPolicies as defaultPolicies } from "./enterprise-resource-data";
const maskPhone = (phone: string) => `${phone.slice(0, 3)}****${phone.slice(-4)}`;

export function UserPolicyDialog({ member, currentRole, ownQuota = false, close, save }: { member?: Member; currentRole: Role; members: Member[]; ownQuota?: boolean; close: () => void; save: (member: Member) => string | null }) {
  const [phone, setPhone] = useState(member?.phone ?? ""), [role, setRole] = useState<Role>(member?.role ?? "Developer"), [policies, setPolicies] = useState(() => defaultPolicies(member)), [error, setError] = useState("");
  const [badInputs, setBadInputs] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const roleOptions: Role[] = ownQuota ? ["Owner"] : Array.from(new Set([member?.role, ...assignableRoles(currentRole)].filter(Boolean) as Role[]));
  const enabled = contractModels.filter(model => policies[model.id]?.enabled);
  const initialPolicies = defaultPolicies(member);
  const normalizedPhone = phone.replace(/\s/g, "");
  const phoneValid = /^1[3-9]\d{9}$/.test(normalizedPhone);
  const roleValid = Boolean(member) || assignableRoles(currentRole).includes(role);
  const invalidPolicy = (modelId: string) => {
    const policy = policies[modelId];
    const maximum = contractModels.find(model => model.id === modelId)!.concurrency;
    return policy.enabled && (badInputs[modelId] || (policy.concurrency !== null && (!Number.isInteger(policy.concurrency) || policy.concurrency < 1 || policy.concurrency > maximum)));
  };
  const policiesValid = (Boolean(member) || enabled.length > 0) && !contractModels.some(model => invalidPolicy(model.id));
  const changed = !member || normalizedPhone !== (member.phone?.replace(/\s/g, "") ?? "") || role !== member.role || contractModels.some(model => policies[model.id].enabled !== initialPolicies[model.id].enabled || policies[model.id].concurrency !== initialPolicies[model.id].concurrency);
  const canSubmit = phoneValid && roleValid && policiesValid && changed;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!phoneValid) { setError("请输入有效的 11 位手机号"); formRef.current?.querySelector<HTMLInputElement>("[name=phone]")?.focus(); return; }
    if (!member && !assignableRoles(currentRole).includes(role)) return;
    const invalidModel = contractModels.find(model => invalidPolicy(model.id));
    if (invalidModel) { setError("请输入有效的并发数"); formRef.current?.querySelector<HTMLInputElement>(`input[data-model-id="${invalidModel.id}"]`)?.focus(); return; }
    if (!member && !enabled.length) { setError("请至少开启一个模型"); formRef.current?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus(); return; }
    const saveError = save({ ...(member ?? {}), name: member?.name ?? `用户 ${maskPhone(normalizedPhone)}`, email: member?.email ?? `${normalizedPhone}@phone-invite.moss.local`, phone: normalizedPhone, role, scope: "企业模型权限", status: member?.status ?? "待接受", last: member?.last ?? "尚未登录", modelPolicies: policies });
    if (saveError) setError(saveError);
  };
  return <ModalSurface titleId="enterprise4-policy-title" close={close} className="e2-detail-modal enterprise4-dialog mvp-policy-dialog mvp-shared-policy-dialog">
    <button className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>
    <form ref={formRef} noValidate onSubmit={submit}>
      <header className="e2-detail-header"><h2 id="enterprise4-policy-title">{member ? "编辑用户" : "邀请用户"}</h2></header>
      <fieldset className="e2-detail-section" aria-describedby={error && !phoneValid ? "enterprise4-policy-error" : undefined}><legend>用户信息</legend><div className="e2-detail-grid"><label className="ep-field"><span>手机号 *</span><input data-autofocus name="phone" type="tel" inputMode="numeric" value={phone} readOnly={Boolean(member)} aria-invalid={Boolean(error && !phoneValid)} onChange={event => { setPhone(event.target.value); setError(""); }} /></label><label className="ep-field"><span>角色</span><select value={role} disabled={ownQuota} onChange={event => setRole(event.target.value as Role)}>{roleOptions.map(item => <option key={item}>{item}</option>)}</select></label></div></fieldset>
      <fieldset className="e2-detail-section enterprise4-policy-section" aria-describedby={error && phoneValid ? "enterprise4-policy-error" : undefined}><legend>模型授权与并发上限</legend><div className="enterprise4-policy-heading"><span>TTS · 4 个　　ASR · 2 个</span><b>授权模型：<strong className={enabled.length === 0 ? "is-empty" : undefined}>{enabled.length} 个</strong></b></div>
        <div className="enterprise4-policy-grid">{contractModels.map(model => {
          const enabledForModel = Boolean(policies[model.id]?.enabled);
          const maximum = model.concurrency;
          const configuredLimit = policies[model.id].concurrency;
          const overLimit = enabledForModel && configuredLimit !== null && configuredLimit > maximum;
          return <article className={`enterprise4-policy-card${enabledForModel ? " is-enabled" : ""}`} key={model.id}>
            <label htmlFor={`enterprise4-authorize-${model.id}`}><input id={`enterprise4-authorize-${model.id}`} type="checkbox" checked={enabledForModel} disabled={!enabledForModel && maximum < 1} onChange={event => { const checked = event.target.checked; setError(""); setBadInputs(current => ({ ...current, [model.id]: false })); setPolicies(current => ({ ...current, [model.id]: { concurrency: checked ? null : 0, enabled: checked } })); }} /><span className="mvp-model-card-title"><b>{model.name}</b><span className={`enterprise4-policy-remaining${overLimit ? " is-over-quota" : ""}`}>· 企业并发上限 {maximum} 路</span></span><em>{model.kind}</em></label>
            <label className="enterprise4-policy-input"><span>成员上限</span><input aria-label={`${model.name} 成员并发上限（选填）`} placeholder={enabledForModel ? "不限制" : ""} data-model-id={model.id} type="number" min={1} max={maximum} step={1} disabled={!enabledForModel} aria-invalid={invalidPolicy(model.id)} aria-describedby={invalidPolicy(model.id) ? `quota-error-${model.id}` : undefined} value={enabledForModel ? configuredLimit ?? "" : ""} onChange={event => { const value = event.target.value; const badInput = event.target.validity.badInput; setError(""); setBadInputs(current => ({ ...current, [model.id]: badInput })); setPolicies(current => ({ ...current, [model.id]: { enabled: true, concurrency: value === "" ? null : Number(value) } })); }} /><i>路</i></label>
            {invalidPolicy(model.id) ? <span id={`quota-error-${model.id}`} className="sr-only" role="alert">{overLimit ? `成员并发上限不能超过企业并发上限 ${maximum} 路` : "请输入正整数，或留空表示不限制"}</span> : null}
          </article>;
        })}</div></fieldset>
      {error ? <p id="enterprise4-policy-error" className="form-error" role="alert">{error}</p> : null}
      <footer><button className="btn secondary" type="button" onClick={close}>取消</button><button className="btn primary" type="submit" disabled={!canSubmit}>{member ? "保存" : "发送邀请"}</button></footer>
    </form>
  </ModalSurface>;
}
