import { assignableRoles, type ApiKeyRecord, type Member, type Role } from "./data";
import { enterpriseContractModels, enterpriseDefaultPolicies } from "./enterprise-resource-data";

import { canEditOwnQuota } from "./member-allocation";

export const enterpriseSeatLimit = 50;

export const isRemovedMember = (member: Member) => ["已移除", "已停用"].includes(member.status);
export const visibleMembers = (members: Member[]) => members.filter(member => !isRemovedMember(member));
export const ownsMemberKey = (member: Member, key: ApiKeyRecord) => key.identity !== "personal" &&
  (key.accountId === member.email || (key.identity !== "enterprise" && (key.ownerPhone ? key.ownerPhone === member.phone : key.createdBy === member.name)));

// Archive membership rather than deleting billing identities or credential metadata.
export function normalizeMemberLifecycle(members: Member[], apiKeys: ApiKeyRecord[]) {
  const archived = members.map(member => isRemovedMember(member) ? { ...member, status: "已移除", removedAt: member.removedAt ?? "legacy-removal" } : member);
  return { members: archived, apiKeys: apiKeys.map(key => {
    const owner = archived.find(member => isRemovedMember(member) && ownsMemberKey(member, key));
    return owner || key.revokedByMemberRemovalAt ? { ...key, status: "已停用" as const, revokedByMemberRemovalAt: key.revokedByMemberRemovalAt ?? owner!.removedAt } : key;
  }) };
}

export function prepareMemberChange(actor: Member, draft: Member, members: Member[], options: { roles?: Role[]; seats?: number } = {}): { member: Member; error: string | null } {
  const fail = (error: string) => ({ member: draft, error });
  const liveActor = members.find(member => member.email === actor.email);
  if (!liveActor || !["正常", "接近上限"].includes(liveActor.status)) return fail("当前企业账号不可用");
  const roles = options.roles ?? assignableRoles(liveActor.role);
  const previous = members.find(member => member.email === draft.email);
  const archived = members.find(member => member.phone === draft.phone && isRemovedMember(member));
  const inviting = draft.status === "待接受" && (!previous || (isRemovedMember(previous) && draft.email === `${draft.phone}@phone-invite.moss.local` && draft.membershipVersion === undefined));
  const identity = inviting ? archived ?? previous : previous;
  const ownQuota = Boolean(previous && !inviting && draft.status !== "已移除" && canEditOwnQuota(liveActor, previous));
  if (!ownQuota && (identity?.email === actor.email || draft.email === actor.email)) return fail("不能移除本人或修改本人权限");
  if (ownQuota ? draft.role !== "Owner" : (!roles.includes(draft.role) || (identity && (!isRemovedMember(identity) || identity.role === "Owner") && !roles.includes(identity.role)))) return fail("无权管理该角色");
  if (!inviting && (!previous || isRemovedMember(previous) || ((previous.membershipVersion ?? 0) !== (draft.membershipVersion ?? 0) || (previous.policyVersion ?? 0) !== (draft.policyVersion ?? 0)))) return fail("成员状态已变化，请刷新后重试");
  if (draft.status === "已移除") return { member: { ...previous!, status: "已移除", removedAt: new Date().toISOString(), event: "用户已移除，企业 API Key 永久失效" }, error: null };
  if (!/^1[3-9]\d{9}$/.test(draft.phone ?? "")) return fail("请输入有效的 11 位手机号");
  if (!inviting && draft.phone !== previous?.phone) return fail("成员身份不可修改");
  if (members.some(member => !isRemovedMember(member) && member.phone === draft.phone && (inviting || member.email !== draft.email))) return fail("该账号已有成员或邀请记录，不能重复邀请");
  if (inviting && members.filter(member => ["正常", "接近上限", "待接受"].includes(member.status)).length >= (options.seats ?? enterpriseSeatLimit)) return fail("可邀请席位不足");
  if (!inviting && (!["正常", "接近上限", "待接受"].includes(previous!.status) || draft.status !== previous!.status)) return fail("当前状态不支持此操作");
  const policies = enterpriseDefaultPolicies(draft);
  if (inviting && !enterpriseContractModels.some(model => policies[model.id]?.enabled)) return fail("请至少开启一个模型");
  for (const model of enterpriseContractModels) {
    const policy = policies[model.id];
    if (!policy.enabled) { policy.concurrency = 0; continue; }
    if (policy.concurrency === null) continue;
    if (!Number.isInteger(policy.concurrency) || policy.concurrency < 1) return fail("用户并发必须为正整数");
    if (policy.concurrency > model.concurrency) return fail(`${model.name} 成员并发上限不能超过企业并发上限 ${model.concurrency} 路`);
  }
  const member = inviting ? { ...draft, modelPolicies: policies, email: identity?.email ?? draft.email, name: identity?.name ?? draft.name, status: "待接受", membershipVersion: (identity?.membershipVersion ?? 0) + 1, removedAt: undefined, event: undefined, last: "尚未登录", joined: undefined } : { ...previous!, role: draft.role, modelPolicies: policies, policyVersion: (previous!.policyVersion ?? 0) + 1 };
  return { member, error: null };
}

export function applyMemberChange(members: Member[], apiKeys: ApiKeyRecord[], next: Member) {
  return normalizeMemberLifecycle(members.some(member => member.email === next.email) ? members.map(member => member.email === next.email ? next : member) : [...members, next], apiKeys);
}
