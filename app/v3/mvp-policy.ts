import { enterpriseSeatLimit, prepareMemberChange } from "./member-lifecycle";
import { retiredViewAliases } from "./page-navigation";
import type { ApiKeyRecord, Member, Role, View } from "./data";
import { enterpriseDefaultPolicies } from "./enterprise-resource-data";

export const mvpRoles = ["Owner", "Admin", "Developer"] as const;
export { credentialTabs as mvpCredentialTabs } from "./credential-navigation";
export { billingTabs as mvpBillingTabs } from "./comparison-navigation";
export const mvpEnterpriseTabs: { id: View; label: string }[] = [{ id: "enterprise", label: "企业与用户" }];
export const mvpViews: View[] = ["keys", "billing3", "usage3", "enterprise"];
export function canMvp(role: Role, view: View) {
  if (!(mvpRoles as readonly string[]).includes(role)) return false;
  if (["keys", "usage3"].includes(view)) return true;
  return ["Owner", "Admin"].includes(role) && ["billing3", "enterprise"].includes(view);
}
// Keep URL hydration, navigation and role changes inside the same P0 scope.
export function resolveMvpView(requested: string | null, role: Role): View {
  const canonical = retiredViewAliases[requested ?? ""] ?? requested;
  if (canonical && mvpViews.includes(canonical as View) && canMvp(role, canonical as View)) return canonical as View;
  return canonical === "billing3" && canMvp(role, "usage3") ? "usage3" : "keys";
}
export const mvpAssignableRoles = (role: Role): Role[] => role === "Owner" ? ["Admin", "Developer"] : role === "Admin" ? ["Developer"] : [];
export const mvpOwnsKey = (member: Member, key: ApiKeyRecord) => key.identity === "enterprise" && key.accountId === member.email;
export function validateMvpMember(actor: Member, next: Member, members: Member[], seats = enterpriseSeatLimit): string | null {
  return prepareMemberChange(actor, next, members, { roles: mvpAssignableRoles(members.find(member => member.email === actor.email)?.role ?? actor.role), seats }).error;
}

export function validateMvpKey(member: Member, key: ApiKeyRecord, keys: ApiKeyRecord[], action: "create" | "enable" | "disable"): string | null {
  if (member.status !== "正常") return "当前企业账号不可用";
  if (!mvpOwnsKey(member, key)) return "只能管理本人企业 API Key";
  if (action !== "disable" && !Object.values(enterpriseDefaultPolicies(member)).some(p => p.enabled)) return "当前未授权模型，无法创建或启用 API Key";
  if (action === "create") {
    if (!key.name.trim() || key.name.length > 50) return "请输入 1–50 字的 Key 名称";
    if (keys.some(item => item.id === key.id)) return "该 Key 已存在";
    if (keys.filter(item => mvpOwnsKey(member, item) && !item.revokedByMemberRemovalAt).length >= 50) return "API Key 已达 50 个上限（含已停用）";
  } else {
    const previous = keys.find(item => item.id === key.id);
    if (previous?.revokedByMemberRemovalAt) return "该 Key 因用户移除已永久失效，请创建新的 Key";
    if (!previous || !mvpOwnsKey(member, previous)) return "该 Key 不存在或无权操作";
    if ((action === "enable" && previous.status !== "已停用") || (action === "disable" && previous.status !== "有效")) return "Key 状态已变化，请刷新后重试";
  }
  return null;
}
