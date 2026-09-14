"use client";

import { useEffect, useRef, useState } from "react";
import { Member } from "./data";
import { Icon } from "./ui";

const maskPhone = (phone?: string) => phone?.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") ?? "未绑定手机号";

export type WorkspaceIdentity = "enterprise" | "personal";
export function UserCenter({ member, displayName, identity, onIdentityChange, hasEnterpriseAccount }: { member: Member; displayName: string; identity: WorkspaceIdentity; onIdentityChange: (identity: WorkspaceIdentity) => void; hasEnterpriseAccount: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const isEnterprise = identity === "enterprise";
  const identityLabel = isEnterprise ? "企业" : "个人";
  const selectIdentity = (next: "enterprise" | "personal") => {
    if (!hasEnterpriseAccount || next === identity) return;
    onIdentityChange(next);
    setOpen(false);
    window.requestAnimationFrame(() => trigger.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); window.requestAnimationFrame(() => trigger.current?.focus()); } };
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeEscape);
    return () => { window.removeEventListener("pointerdown", closeOutside); window.removeEventListener("keydown", closeEscape); };
  }, [open]);
  if (!hasEnterpriseAccount) return <div className="workspace-card"><span aria-hidden="true">{member.name.slice(0, 1)}</span><div className="user-center-trigger-copy"><div className="user-center-profile-title"><b>{member.name}</b><span>个人</span></div><div className="user-center-profile-meta"><span>{maskPhone(member.phone)}</span></div></div></div>;
  return <div className="user-center" ref={root}>
    {open ? <section className="user-center-menu" role="dialog" aria-label="账号与身份">
      <button className="user-center-close" type="button" aria-label="关闭用户中心" onClick={() => { setOpen(false); window.requestAnimationFrame(() => trigger.current?.focus()); }}><Icon name="close" size={15}/></button>
      <div className="user-center-profile"><span aria-hidden="true">{displayName.slice(0, 1)}</span><div className="user-center-profile-copy"><div className="user-center-profile-title"><b>{displayName}</b><span>{identityLabel}</span></div><div className="user-center-profile-meta"><span>{maskPhone(member.phone)}</span>{isEnterprise ? <em>{member.role}</em> : null}</div></div></div>
      <div className="user-center-section"><span>切换身份</span><button type="button" className={`user-center-identity${isEnterprise ? " is-current" : ""}`} aria-pressed={isEnterprise} onClick={() => selectIdentity("enterprise")}><span><span className="user-center-identity-title"><b>企业</b><span>云蝠智能</span></span><small>API Key、用量和费用归属企业</small></span>{isEnterprise ? <Icon name="check" size={15}/> : null}</button><button type="button" className={`user-center-identity${!isEnterprise ? " is-current" : ""}`} aria-pressed={!isEnterprise} onClick={() => selectIdentity("personal")}><span><b>个人</b><small>API Key、用量和费用归属个人</small></span>{!isEnterprise ? <Icon name="check" size={15}/> : null}</button></div>
    </section> : null}
    <button ref={trigger} className="workspace-card user-center-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span aria-hidden="true">{displayName.slice(0, 1)}</span><div className="user-center-trigger-copy"><div className="user-center-profile-title"><b>{displayName}</b><span>{identityLabel}</span></div><div className="user-center-profile-meta"><span>{maskPhone(member.phone)}</span>{isEnterprise ? <em>{member.role}</em> : null}</div></div><Icon name="chevron" size={15}/>
    </button>
  </div>;
}
