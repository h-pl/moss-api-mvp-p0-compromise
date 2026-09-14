"use client";
import { useState } from "react";
import type { ApiKeyRecord, Member } from "./data";
import { ownsMemberKey } from "./member-lifecycle";
import { ModalSurface } from "./modal-surface";
import { Icon } from "./ui";

export function RemoveMemberDialog({ member, apiKeys, close, confirm }: { member: Member; apiKeys: ApiKeyRecord[]; close: () => void; confirm: () => string | null }) {
  const [error, setError] = useState("");
  const activeKeys = apiKeys.filter(key => ownsMemberKey(member, key) && key.status !== "已停用").length;
  return <ModalSurface role="alertdialog" titleId="remove-member-title" descriptionId="remove-member-description" close={close} className="enterprise4-state-dialog">
    <button className="dialog-close" type="button" aria-label="关闭" onClick={close}><Icon name="close" /></button>
    <header className="enterprise4-state-heading"><h2 id="remove-member-title">移除用户</h2><p id="remove-member-description">移除后，该用户将从用户与配额列表中移除，无法继续访问当前企业资源。</p></header>
    <div className="enterprise4-state-member"><div><b>{member.name}</b><span>{member.phone?.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") ?? "—"}</span></div><span>{member.role}</span></div>
    <section className="enterprise4-state-effects" aria-label="操作影响"><h3>移除后</h3><ul>
      <li>释放该用户占用的席位，取消其企业访问权限和待接受邀请。</li>
      <li>{activeKeys} 个可用企业 Key 将立即失效；原有企业 Key 不能重新启用。</li>
      <li>历史费用、用量及原用户归属保留，费用记账不受影响。</li>
      <li>再次添加时，使用同一手机号重新邀请；接受邀请后按新授权加入。</li>
    </ul></section>
    <p className="enterprise4-state-note">个人账号及个人 API Key 不受影响。</p>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <footer><button className="btn secondary" data-autofocus type="button" onClick={close}>取消</button><button className="btn danger" type="button" onClick={() => setError(confirm() ?? "")}>确认移除</button></footer>
  </ModalSurface>;
}
