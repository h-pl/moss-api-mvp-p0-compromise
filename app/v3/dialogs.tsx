"use client";

import { FormEvent, useState } from "react";
import { ApiKeyRecord, ProjectContext, WorkspaceProject } from "./data";
import { Icon } from "./ui";

function MemberKeyForm({ projects, actorName, actorEmail, close, complete }: { projects: WorkspaceProject[]; projectContext: ProjectContext; actorName: string; actorEmail: string; close: () => void; complete: (key: ApiKeyRecord) => void }) {
  const [stage, setStage] = useState<"create" | "secret">("create");
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ApiKeyRecord | null>(null);
  const compatibilityProject = projects[0];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError("请输入便于识别的 Key 名称");
    const createdAt = "2026-09-03 10:20";
    setCreated({ id: `key_demo_${Date.now()}`, name: name.trim(), masked: "sk_live_••••A91C", accountId: actorEmail, accountName: actorName, projectId: compatibilityProject?.id ?? "enterprise", projectName: "企业账号", scopes: ["tts:invoke"], ipAllowlist: ip.trim() || "未限制", expiresAt: "2027-03-02", createdBy: actorName, createdAt, lastUsedAt: "尚未调用", lastRotatedAt: createdAt, version: 1, usage: "0 积分", status: "有效", exposureEvents: [{ memberEmail: actorEmail, memberName: actorName, action: "创建", at: createdAt, version: 1 }] });
    setStage("secret");
  };
  const copy = () => { void navigator.clipboard?.writeText("sk_live_moss_7F2A8C91K4YUNFU"); };
  return <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="key-title"><button className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>{stage === "create" ? <form noValidate onSubmit={submit}><span className="eyebrow">MEMBER CREDENTIAL</span><h2 id="key-title">创建 API Key</h2><p>Key 归属于当前 Member 账号，继承其资源策略。</p><div className="dialog-readonly-field"><span>归属账号</span><b>{actorName}</b><small>{actorEmail}</small></div><label><span>Key 名称</span><input autoFocus value={name} onChange={event => { setName(event.target.value); setError(""); }} placeholder="例如：prod-tts" />{error ? <em role="alert">{error}</em> : null}</label><label><span>IP 白名单</span><input value={ip} onChange={event => setIp(event.target.value)} placeholder="可选" /></label><div className="notice warning"><Icon name="shield" /><div><b>安全提示</b><span>完整 Key 只展示一次；撤销 Key 不删除历史用量和调用日志。</span></div></div><footer><button className="btn secondary" type="button" onClick={close}>取消</button><button className="btn primary" type="submit" disabled={!name.trim()}>创建并展示完整 Key</button></footer></form> : <div className="secret-result"><span className="success-icon"><Icon name="check" /></span><span className="eyebrow">CREATED</span><h2 id="key-title">API Key 已创建</h2><p>这是完整 Key 唯一一次展示。关闭后只能轮换，不能再次查看。</p><code>sk_live_moss_7F2A8C91K4YUNFU</code><button className="btn secondary" type="button" onClick={copy}><Icon name="copy" size={14} /> 复制 Key</button><footer><button className="btn primary" type="button" onClick={() => created && complete(created)}>我已安全保存</button></footer></div>}</section></div>;
}

export function KeyDialog({ projects, projectContext: _projectContext, actorName, actorEmail, close, complete }: { projects: WorkspaceProject[]; projectContext: ProjectContext; actorName: string; actorEmail: string; close: () => void; complete: (key: ApiKeyRecord) => void }) {
  return <MemberKeyForm projects={projects} projectContext={_projectContext} actorName={actorName} actorEmail={actorEmail} close={close} complete={complete} />;
}
