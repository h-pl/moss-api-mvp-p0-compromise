import type { Member, Role } from "./data";

const demoEmails: Partial<Record<Role, string>> = { Owner: "owner@yunfu.ai", Admin: "w***@yunfu.ai", Developer: "l***@yunfu.ai" };
export function mvpMemberForRole(role: Role, members: Member[]): Member {
  const preferred = members.find(member => member.email === demoEmails[role] && member.role === role);
  // The demo selector represents a role, so use an available member of that role
  // when the original example account was removed during earlier interactions.
  return (preferred?.status === "正常" ? preferred : members.find(member => member.role === role && member.status === "正常"))
    ?? preferred
    ?? { name: "个人用户", email: "unavailable", role, status: "未加入", scope: "", last: "—" };
}
export const hasEnterpriseAccount = (member: Member) => member.status === "正常";
