import { ApiKeyRecord, Member, ModelPolicy } from "./data";
import { enterpriseContractModels, enterpriseDefaultPolicies } from "./enterprise-resource-data";

// Demo enterprise entitlements; production receives these values from operations.
export const enterpriseModels = enterpriseContractModels.map(model => ({ ...model, available: true }));
export const phoneLabel = (phone?: string) => phone?.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") || "未设置手机号";
export function policiesFor(member?: Member): Record<string, ModelPolicy> { return enterpriseDefaultPolicies(member); }
export const ownsEnterpriseKey = (member: Member, key: ApiKeyRecord) =>
  key.identity !== "personal" && (key.ownerPhone ? key.ownerPhone === member.phone : key.createdBy === member.name);

export const auditActions = {
  "企业认证": ["查看企业认证", "提交企业认证", "修改企业认证", "认证通过", "认证驳回"],
  "组织成员": ["邀请用户", "接受邀请", "撤回邀请", "修改角色", "修改模型权限", "修改模型并发", "停用用户", "恢复用户", "导出审计记录"],
  "模型与资源": ["查看企业模型配置", "配置模型可用性", "配置企业积分", "配置模型 RPM", "配置模型并发"],
  "凭证与授权": ["创建自己的 API Key", "轮换自己的 API Key", "停用自己的 API Key", "启用自己的 API Key", "复制 API Key", "因账号停用使 Key 失效"],
  "登录安全": ["登录", "退出登录", "退出成员会话", "修改二次验证"],
  "费用": ["查看企业费用", "导出费用明细"],
} as const;
export type AuditModule = keyof typeof auditActions;
export type GovernanceEvent = {
  id: string; time: string; actor: string; phone: string; role: string;
  module: AuditModule; action: string; object: string; result: "成功" | "失败";
  ip: string; device: string; requestId: string; before: string; after: string; reason?: string;
};
export const memberSnapshot = (member: Member) => JSON.stringify({
  用户: member.name, 手机号: phoneLabel(member.phone), 角色: member.role, 状态: member.status,
  模型: enterpriseModels.filter(m => policiesFor(member)[m.id].enabled).map(m => ({ 模型: m.name, 并发: policiesFor(member)[m.id].concurrency })),
}, null, 2);
export function makeGovernanceEvent(actor: Member, module: AuditModule, action: string, object: string, before: string, after: string): GovernanceEvent {
  if (!(auditActions[module] as readonly string[]).includes(action)) throw new Error("未知审计动作");
  const id = crypto.randomUUID();
  return { id, time: new Date().toISOString(), actor: actor.name, phone: actor.phone ?? "", role: actor.role,
    module, action, object, result: "成功", ip: "本地演示", device: "浏览器演示", requestId: `demo-${id}`, before, after };
}
export const seedGovernanceEvents: GovernanceEvent[] = [
  { id: "A-001", time: "2026-08-31T11:18:42+08:00", actor: "王开发", phone: "13900001234", role: "Admin", module: "凭证与授权", action: auditActions["凭证与授权"][0], object: "王开发 · prod-tts", result: "成功", ip: "203.0.113.18", device: "Chrome / macOS", requestId: "demo-req-A001", before: "未创建", after: "已创建企业身份下本人 Key；使用企业资源并计入企业费用。" },
  { id: "A-002", time: "2026-08-30T16:22:09+08:00", actor: "企业 Owner", phone: "13800005678", role: "Owner", module: "组织成员", action: auditActions["组织成员"][5], object: "李测试 · MOSS-TTS-1.5-Flash", result: "成功", ip: "203.0.113.8", device: "Chrome / macOS", requestId: "demo-req-A002", before: "用户模型并发：5 路", after: "用户模型并发：10 路" },
  { id: "A-003", time: "2026-08-29T09:14:51+08:00", actor: "王开发", phone: "13900001234", role: "Admin", module: "组织成员", action: auditActions["组织成员"][0], object: "刘财务 · 137****9012", result: "成功", ip: "203.0.113.18", device: "Chrome / macOS", requestId: "demo-req-A003", before: "无邀请", after: "Finance · 待接受；手机号邀请已生成（演示）" },
  { id: "A-004", time: "2026-08-28T18:06:31+08:00", actor: "企业 Owner", phone: "13800005678", role: "Owner", module: "登录安全", action: auditActions["登录安全"][2], object: "李测试 · 186****5678", result: "成功", ip: "203.0.113.8", device: "Chrome / macOS", requestId: "demo-req-A004", before: "会话活跃", after: "控制台会话退出；API Key 不受影响" },
  { id: "A-005", time: "2026-08-28T17:44:10+08:00", actor: "王开发", phone: "13900001234", role: "Admin", module: "组织成员", action: auditActions["组织成员"][5], object: "陈审计 · MOSS-TTS-1.5-Flash", result: "失败", ip: "203.0.113.18", device: "Chrome / macOS", requestId: "demo-req-A005", before: "用户模型并发：10 路", after: "未变更", reason: "申请 100 路超过企业该模型 80 路并发上限。" },
];
