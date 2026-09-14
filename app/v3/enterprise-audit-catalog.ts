import type { GovernanceEvent } from "./enterprise-governance";

// Navigation modules; locations identify subpages, never comparison tab numbers.
export const audit3Actions = {
  "凭证与授权": {
    "创建 API Key": "API Keys", "轮换 API Key": "API Key 行内操作", "停用 API Key": "API Key 行内操作", "启用 API Key": "API Key 行内操作",
    "复制 API Key": "Key 一次性展示", "因账号停用使 Key 失效": "API Keys",
  },
  "费用中心": {
    "导出费用明细": "用量明细 / 费用对账", "导出用量明细": "用量归因", "导出计量事件": "用量详情",
  },
  "企业管理": {
    "邀请用户": "企业与用户", "修改角色": "企业与用户", "修改模型授权": "企业与用户", "修改模型并发": "企业与用户",
    "停用账号": "企业与用户", "恢复账号": "企业与用户",
    "退出会话": "企业认证 · 登录会话", "导出审计记录": "操作审计",
  },
} as const;
export type Audit3Module = keyof typeof audit3Actions;
export type Audit3Event = Omit<GovernanceEvent, "module"> & { module: Audit3Module; location: string };
const moduleNames: Record<GovernanceEvent["module"], Audit3Module> = {
  企业认证: "企业管理", 组织成员: "企业管理", 模型与资源: "企业管理", 登录安全: "企业管理", 凭证与授权: "凭证与授权", 费用: "费用中心",
};
const actionNames: Record<string, string> = {
  修改模型权限: "修改模型授权", 停用用户: "停用账号", 恢复用户: "恢复账号", 退出成员会话: "退出会话",
  "创建自己的 API Key": "创建 API Key", "轮换自己的 API Key": "轮换 API Key", "停用自己的 API Key": "停用 API Key", "启用自己的 API Key": "启用 API Key",
};
// Only the final matrix belongs in this customer audit view. Source history is retained.
export function isAudit3Action(moduleName: string, action: string): moduleName is Audit3Module {
  return Object.hasOwn(audit3Actions, moduleName) && Object.hasOwn(audit3Actions[moduleName as Audit3Module], action);
}
export function audit3Location(module: Audit3Module, action: string): string {
  const location = (audit3Actions[module] as Record<string, string>)[action];
  if (!location) throw new Error(`Unknown audit action: ${module}/${action}`);
  return location;
}
export const maskAuditText = (value: string) => value.replace(/(1[3-9]\d)\d{4}(\d{4})/g, "$1****$2");
// Adapt old history without mutating the independent comparison pages or losing events.
export function normalizeAudit3Event(event: GovernanceEvent): Audit3Event | null {
  const moduleName = moduleNames[event.module], action = actionNames[event.action] ?? event.action;
  if (!isAudit3Action(moduleName, action)) return null;
  return { ...event, ip: event.ip === "本地演示" ? "未记录" : event.ip, module: moduleName, action, location: audit3Location(moduleName, action), object: maskAuditText(event.object), before: maskAuditText(event.before), after: maskAuditText(event.after) };
}
