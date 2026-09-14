import { isRetiredMonitoringView } from "./page-navigation";
export type View =
  | "overview" | "models" | "modelDetail" | "experience" | "solutions"
  | "playground" | "docs" | "projects" | "projectDetail" | "accounts" | "accountDetail"
  | "keys" | "keyDetail" | "quota" | "voices" | "billing3" | "usage3" | "enterprise"
  | "memberDetail" | "permissions" | "security" | "audit" | "notifications" | "dedicated";
export type Role = "Owner" | "Admin" | "Developer" | "Finance" | "Viewer";
export type Tone = "good" | "warn" | "bad" | "neutral";
export type ResourceAllocation = { voice: number; token: number; rpm: number; tpm?: number; concurrency: number };
export type MemberQuota = { points: number; asr: number; tts: number; rpm: number; concurrency: number };
// null means no member-specific cap; enterprise-wide concurrency still applies.
export type ModelPolicy = { enabled: boolean; concurrency: number | null };
export type Member = { removedAt?: string; membershipVersion?: number; policyVersion?: number; name: string; email: string; phone?: string; role: Role; scope: string; status: string; last: string; title?: string; mfa?: string; joined?: string; login?: string; event?: string; projectIds?: string[]; credentialProjectIds?: string[]; keyExposure?: string[]; allocation?: ResourceAllocation; usage?: ResourceAllocation; quota?: MemberQuota; usageQuota?: MemberQuota; modelPolicies?: Record<string, ModelPolicy> };
export type ProjectContext = string;
export type WorkspaceProject = { id: string; name: string; owner: string; accounts: number; keys: number; rpm: string; usage: string; status: string };
export type ServiceAccount = { name: string; id: string; projectId: string; project: string; keys: number; usage: string; owner: string; state: string };
export type CredentialExposure = { memberEmail: string; memberName: string; action: "创建" | "复制" | "轮换"; at: string; version: number };
export type ApiKeyRecord = { revokedByMemberRemovalAt?: string; id: string; ownerPhone?: string; identity?: "enterprise" | "personal"; name: string; masked: string; accountId: string; accountName: string; projectId: string; projectName: string; scopes: string[]; ipAllowlist: string; expiresAt: string; createdBy: string; createdAt: string; lastUsedAt: string; lastRotatedAt: string; version: number; usage: string; status: "有效" | "轮换中" | "已停用"; exposureEvents: CredentialExposure[] };
export type NotificationCategory = "权限与安全" | "凭证" | "配额" | "费用" | "服务质量" | "系统";
export type NotificationRecord = { id: string; title: string; summary: string; category: NotificationCategory; time: string; target: View; actionLabel: string; tone: Tone; audience: Role[]; projectId?: string; recipientEmails?: string[]; requiresCredentialManage?: boolean; isRead: boolean };
export type PermissionAction = "project.create" | "member.manage" | "member.admin.manage" | "enterprise.security.manage" | "key.create" | "key.rotate" | "key.disable" | "usage.view" | "quality.view" | "audit.view";

export const labels: Record<View, string> = {
  overview: "平台首页", models: "模型与服务", modelDetail: "模型详情", experience: "体验中心",
  solutions: "解决方案", playground: "Playground", docs: "API Docs", projects: "项目",
  projectDetail: "项目详情", accounts: "项目详情", accountDetail: "项目详情", keys: "API 密钥", keyDetail: "API Key 详情",
  quota: "配额与限流", voices: "音色授权", billing3: "费用概览", usage3: "用量明细", enterprise: "企业与用户", memberDetail: "成员账号详情", permissions: "角色与权限", security: "企业认证", audit: "操作审计", notifications: "通知中心", dedicated: "专属服务",
};

export const projects: WorkspaceProject[] = [
  { id: "proj_yunfu_prod_01", name: "客服播报", owner: "王开发", accounts: 2, keys: 2, rpm: "318 / 500", usage: "102.20M 字符", status: "运行中" },
  { id: "proj_yunfu_eval_01", name: "内部评测", owner: "李测试", accounts: 1, keys: 1, rpm: "42 / 100", usage: "26.44M 字符", status: "运行中" },
];

// 企业订单权益是资源池；Owner 的保留量与成员分配量都从这里计算，页面只读展示或由 Owner 在邀请/编辑成员时调整。
export const enterpriseEntitlements: ResourceAllocation = { voice: 2000, token: 100, rpm: 500, tpm: 5000000, concurrency: 80 };
export const enterpriseQuotaEntitlements: MemberQuota = { points: 100000, asr: 2000, tts: 100000000, rpm: 500, concurrency: 80 };
export const resourceLabels: Record<keyof ResourceAllocation, string> = { voice: "Voice 小时", token: "Token（M）", rpm: "RPM", tpm: "TPM", concurrency: "并发" };

export const projectOptionsForRole: Record<Role, ProjectContext[]> = {
  Owner: ["all", "proj_yunfu_prod_01", "proj_yunfu_eval_01"],
  Admin: ["all", "proj_yunfu_prod_01", "proj_yunfu_eval_01"],
  Developer: ["proj_yunfu_eval_01"],
  Finance: ["all", "proj_yunfu_prod_01", "proj_yunfu_eval_01"],
  Viewer: ["all", "proj_yunfu_prod_01", "proj_yunfu_eval_01"],
};

export const projectName = (id: ProjectContext, source: WorkspaceProject[] = projects) => id === "all" ? "全部项目" : source.find(project => project.id === id)?.name ?? "未知项目";

export const callingAccounts: ServiceAccount[] = [
  { name: "客服生产服务", id: "sa_service_prod", projectId: "proj_yunfu_prod_01", project: "客服播报", keys: 1, usage: "72.4M 字符", owner: "客服系统", state: "启用" },
  { name: "播报调度服务", id: "sa_scheduler_prod", projectId: "proj_yunfu_prod_01", project: "客服播报", keys: 1, usage: "29.8M 字符", owner: "调度系统", state: "启用" },
  { name: "评测流水线", id: "sa_eval_ci", projectId: "proj_yunfu_eval_01", project: "内部评测", keys: 1, usage: "26.4M 字符", owner: "评测系统", state: "启用" },
];

export const initialApiKeys: ApiKeyRecord[] = [
  { id: "key_prod_tts_v3", name: "prod-tts", masked: "sk_live_••••7F2A", accountId: "sa_service_prod", accountName: "客服生产服务", projectId: "proj_yunfu_prod_01", projectName: "客服播报", scopes: ["tts:invoke"], ipAllowlist: "203.0.113.0/24", expiresAt: "2027-02-28", createdBy: "王开发", createdAt: "2026-06-20 10:18", lastUsedAt: "今天 11:42", lastRotatedAt: "2026-08-18", version: 3, usage: "2,146 积分", status: "有效", exposureEvents: [{ memberEmail: "w***@yunfu.ai", memberName: "王开发", action: "创建", at: "2026-06-20 10:18", version: 1 }, { memberEmail: "w***@yunfu.ai", memberName: "王开发", action: "轮换", at: "2026-08-18 16:18", version: 3 }] },
  { id: "key_scheduler_tts_v1", name: "scheduler-tts", masked: "sk_live_••••4D8B", accountId: "sa_scheduler_prod", accountName: "播报调度服务", projectId: "proj_yunfu_prod_01", projectName: "客服播报", scopes: ["tts:invoke"], ipAllowlist: "203.0.113.0/24", expiresAt: "2027-02-28", createdBy: "王开发", createdAt: "2026-07-10 15:20", lastUsedAt: "今天 11:31", lastRotatedAt: "2026-07-10", version: 1, usage: "884 积分", status: "有效", exposureEvents: [{ memberEmail: "w***@yunfu.ai", memberName: "王开发", action: "创建", at: "2026-07-10 15:20", version: 1 }] },
  { id: "key_eval_tts_v2", name: "eval-tts", masked: "sk_test_••••9C11", accountId: "sa_eval_ci", accountName: "评测流水线", projectId: "proj_yunfu_eval_01", projectName: "内部评测", scopes: ["tts:invoke"], ipAllowlist: "未限制", expiresAt: "2026-12-31", createdBy: "李测试", createdAt: "2026-07-02 09:30", lastUsedAt: "今天 10:08", lastRotatedAt: "2026-07-02", version: 2, usage: "736 积分", status: "有效", exposureEvents: [{ memberEmail: "l***@yunfu.ai", memberName: "李测试", action: "创建", at: "2026-07-02 09:30", version: 1 }, { memberEmail: "l***@yunfu.ai", memberName: "李测试", action: "轮换", at: "2026-07-02 10:04", version: 2 }] },
];

export const usageByAccount = [
  { id: "sa_service_prod", name: "客服生产服务", projectId: "proj_yunfu_prod_01" as ProjectContext, project: "客服播报", requests: "724,108", usage: "72.4M", success: "99.85%", cost: "¥4,344.00" },
  { id: "sa_scheduler_prod", name: "播报调度服务", projectId: "proj_yunfu_prod_01" as ProjectContext, project: "客服播报", requests: "298,404", usage: "29.8M", success: "99.78%", cost: "¥1,788.00" },
  { id: "sa_eval_ci", name: "评测流水线", projectId: "proj_yunfu_eval_01" as ProjectContext, project: "内部评测", requests: "261,596", usage: "26.4M", success: "99.71%", cost: "¥1,586.40" },
];

export const usageByKey = [
  { id: "prod-tts", projectId: "proj_yunfu_prod_01" as ProjectContext, project: "客服播报", requests: "724,108", usage: "72.4M", success: "99.85%", cost: "¥4,344.00" },
  { id: "scheduler-tts", projectId: "proj_yunfu_prod_01" as ProjectContext, project: "客服播报", requests: "298,404", usage: "29.8M", success: "99.78%", cost: "¥1,788.00" },
  { id: "eval-tts", projectId: "proj_yunfu_eval_01" as ProjectContext, project: "内部评测", requests: "261,596", usage: "26.4M", success: "99.71%", cost: "¥1,586.40" },
];

export const usageTrend = [
  { date: "08-01", usage: 3.2, requests: 31.4, cost: 192 }, { date: "08-05", usage: 3.8, requests: 37.2, cost: 228 },
  { date: "08-09", usage: 3.4, requests: 33.1, cost: 204 }, { date: "08-13", usage: 4.6, requests: 45.8, cost: 276 },
  { date: "08-17", usage: 4.2, requests: 41.9, cost: 252 }, { date: "08-21", usage: 5.1, requests: 50.4, cost: 306 },
  { date: "08-25", usage: 4.8, requests: 47.6, cost: 288 }, { date: "08-31", usage: 5.6, requests: 55.2, cost: 336 },
];

export const requestTrend = [
  { time: "00:00", success: 1180, client: 18, service: 3 }, { time: "04:00", success: 980, client: 12, service: 2 },
  { time: "08:00", success: 1420, client: 21, service: 4 }, { time: "12:00", success: 1680, client: 26, service: 5 },
  { time: "16:00", success: 1510, client: 19, service: 3 }, { time: "20:00", success: 1620, client: 24, service: 4 },
  { time: "当前", success: 1240, client: 17, service: 2 },
];

export const qualityTrend = [
  { date: "08-01", availability: 99.995, success: 99.84, p95: 826 }, { date: "08-06", availability: 99.982, success: 99.79, p95: 912 },
  { date: "08-11", availability: 100, success: 99.88, p95: 804 }, { date: "08-16", availability: 99.961, success: 99.74, p95: 1042 },
  { date: "08-21", availability: 99.989, success: 99.86, p95: 872 }, { date: "08-26", availability: 99.974, success: 99.81, p95: 936 },
  { date: "08-31", availability: 99.973, success: 99.82, p95: 910 },
];

export const initialNotifications: NotificationRecord[] = [
  { id: "N-107", title: "王开发的 Member RPM 接近上限", summary: "当前 248 / 250 RPM，近 5 分钟接近成员分配上限，相关请求可能返回 429。请 Owner 调整该成员分配或错峰调用。", category: "配额", time: "刚刚", target: "quota", actionLabel: "查看 Member 配额", tone: "warn", audience: ["Owner", "Admin"], recipientEmails: ["owner@yunfu.ai"] , isRead: false },
  { id: "N-108", title: "企业资源池仍有可分配余额", summary: "当前仍有 30,000 积分、400 小时 ASR、30 万 TTS 字符、95 RPM 和 15 路并发未分配，可在邀请成员时直接分配。", category: "配额", time: "今天 08:40", target: "quota", actionLabel: "查看资源池", tone: "good", audience: ["Owner", "Admin"], isRead: true },
  { id: "N-106", title: "王开发的 Member RPM 水位达到 64%", summary: "王开发账号过去 5 分钟 RPM 为 160 / 250，尚未触发限流。达到阈值前会继续在通知中心提醒。", category: "配额", time: "8 分钟前", target: "quota", actionLabel: "查看 Member 配额", tone: "warn", audience: ["Owner", "Admin", "Developer"], isRead: false },
  { id: "N-105", title: "2026 年 8 月结算数据已更新", summary: "本期计量快照已生成，预计费用 ¥8,318.40。最终金额仍以商务发送的月度结算单为准。", category: "费用", time: "今天 09:20", target: "usage3", actionLabel: "查看用量与计量", tone: "good", audience: ["Owner", "Admin", "Finance"], isRead: false },
  { id: "N-104", title: "刘财务的邀请等待接受", summary: "邀请将在 6 天后过期。接受后将获得费用与结算范围的只读权限，并要求首次登录设置 MFA。", category: "权限与安全", time: "昨天 16:22", target: "enterprise", actionLabel: "查看成员邀请", tone: "neutral", audience: ["Owner", "Admin"], isRead: false },
  { id: "N-103", title: "prod-tts 将在 30 天后到期", summary: "该 Key 归属 Member 王开发。建议由凭证管理员安排轮换，旧 Key 可保留 24 小时迁移窗口。", category: "凭证", time: "昨天 11:18", target: "keys", actionLabel: "管理 API Key", tone: "warn", audience: ["Owner", "Admin", "Developer"], requiresCredentialManage: true, isRead: true },
  { id: "N-101", title: "企业主体认证已通过", summary: "企业主体认证已完成，可查看认证结果与主体信息。", category: "系统", time: "08-28 10:36", target: "security", actionLabel: "查看企业认证", tone: "neutral", audience: ["Owner", "Admin"], isRead: true },
];

export const requestRows = [
  { id: "req_01J7KX8F3Y2M", time: "08-31 11:42:18.386", project: "客服播报", account: "客服生产服务", key: "prod-tts", model: "MOSS-TTS 1.5-flash", chars: "1,842", status: 200, latency: 486, reason: "成功" },
  { id: "req_01J7KX7R6D9Q", time: "08-31 11:41:56.024", project: "客服播报", account: "客服生产服务", key: "prod-tts", model: "MOSS-TTS 1.5-flash", chars: "3,106", status: 200, latency: 632, reason: "成功" },
  { id: "req_01J7KX6TBW1C", time: "08-31 11:40:12.908", project: "客服播报", account: "播报调度服务", key: "scheduler-tts", model: "MOSS-TTS 1.5-flash", chars: "920", status: 504, latency: 3000, reason: "上游推理超时" },
  { id: "req_01J7KX5K4P7N", time: "08-31 11:37:08.441", project: "内部评测", account: "评测流水线", key: "eval-tts", model: "MOSS-TTS 1.5-flash", chars: "410", status: 429, latency: 18, reason: "超过 Member RPM" },
  { id: "req_01J7KX4A9F2V", time: "08-31 11:35:49.120", project: "客服播报", account: "客服生产服务", key: "prod-tts", model: "MOSS-TTS 1.5-flash", chars: "2,204", status: 200, latency: 521, reason: "成功" },
  { id: "req_01J7KX3G8C6L", time: "08-31 11:31:22.602", project: "客服播报", account: "播报调度服务", key: "scheduler-tts", model: "MOSS-TTS 1.5-flash", chars: "1,126", status: 200, latency: 448, reason: "成功" },
  { id: "req_01J7KX2M5W8R", time: "08-31 11:28:17.281", project: "内部评测", account: "评测流水线", key: "eval-tts", model: "MOSS-TTS 1.5-flash", chars: "680", status: 200, latency: 774, reason: "成功" },
  { id: "req_01J7KX1P2H4T", time: "08-31 11:24:40.946", project: "客服播报", account: "客服生产服务", key: "prod-tts", model: "MOSS-TTS 1.5-flash", chars: "2,818", status: 200, latency: 594, reason: "成功" },
  { id: "req_01J7KWZQ7N1B", time: "08-31 11:19:06.407", project: "客服播报", account: "客服生产服务", key: "prod-tts", model: "MOSS-TTS 1.5-flash", chars: "1,034", status: 504, latency: 3000, reason: "上游推理超时" },
  { id: "req_01J7KWYH9A3D", time: "08-31 11:12:38.155", project: "内部评测", account: "评测流水线", key: "eval-tts", model: "MOSS-TTS 1.5-flash", chars: "556", status: 200, latency: 816, reason: "成功" },
];

export const modelData = [
  { name: "MOSS-TTS-1.5-Flash", id: "moss-tts-1.5-flash-2026-06-26", kind: "音频合成", desc: "低延迟流式语音合成，适合实时播报与语音交互。", delivery: "共享 API / 商务合同", state: "已开通" },
  { name: "MOSS-TTSD-1.0", id: "moss-ttsd-1.0-2026-03-20", kind: "音频合成", desc: "支持语音与文本联合生成的音频合成模型。", delivery: "共享 API / 商务合同", state: "已开通" },
  { name: "MOSS-Voice-Generator-1.0", id: "moss-voice-generator-1.0-2026-07-22", kind: "音频合成", desc: "面向多场景的音色生成与语音合成模型。", delivery: "共享 API / 商务合同", state: "已开通" },
  { name: "MOSS-TTS-1.0-Pro", id: "moss-tts-1.0-pro-2026-02-07", kind: "音频合成", desc: "高表现力专业语音合成，适合生产内容。", delivery: "共享 API / 商务合同", state: "已开通" },
  { name: "MOSS-Transcribe-Diarize-Pro", id: "moss-transcribe-diarize-pro-2026-07-03", kind: "语音识别", desc: "多人会话转写、说话人分离与时间轴输出。", delivery: "共享 API", state: "可申请" },
  { name: "MOSS-Transcribe-1.0", id: "moss-transcribe-1.0-2026-07-22", kind: "语音识别", desc: "通用语音转文本，支持稳定的实时与离线转写。", delivery: "共享 API", state: "可申请" },
];

export const initialMembers: Member[] = [
  { name: "企业 Owner", email: "owner@yunfu.ai", phone: "13800005678", role: "Owner", scope: "全部企业资源", status: "正常", last: "今天 12:03", title:"企业管理员", mfa:"已开启", joined:"2026-06-18", login:"南京 · 203.0.113.8", projectIds:["proj_yunfu_prod_01","proj_yunfu_eval_01"], credentialProjectIds:["proj_yunfu_prod_01","proj_yunfu_eval_01"], allocation:{voice:200,token:10,rpm:80,tpm:1000000,concurrency:10}, usage:{voice:86,token:4,rpm:37,tpm:180000,concurrency:4} },
  { name: "王开发", email: "w***@yunfu.ai", phone: "13900001234", role: "Admin", scope: "全部企业资源", status: "正常", last: "今天 11:42", title:"研发负责人", mfa:"已开启", joined:"2026-06-20", login:"南京 · 203.0.113.18", projectIds:["proj_yunfu_prod_01","proj_yunfu_eval_01"], credentialProjectIds:["proj_yunfu_prod_01","proj_yunfu_eval_01"], keyExposure:["key_prod_tts_v3"], allocation:{voice:800,token:40,rpm:250,tpm:2500000,concurrency:35}, usage:{voice:412,token:32,rpm:248,tpm:1760000,concurrency:29} },
  { name: "李测试", email: "l***@yunfu.ai", phone: "18600005678", role: "Developer", scope: "内部评测", status: "正常", last: "今天 10:08", title:"测试工程师", mfa:"未开启", joined:"2026-07-02", login:"上海 · 198.51.100.24", projectIds:["proj_yunfu_eval_01"], credentialProjectIds:["proj_yunfu_eval_01"], keyExposure:["key_eval_tts_v2"], allocation:{voice:400,token:15,rpm:60,tpm:1000000,concurrency:15}, usage:{voice:210,token:8,rpm:42,tpm:320000,concurrency:5} },
  { name: "刘财务", email: "f***@yunfu.ai", phone: "13700009012", role: "Finance", scope: "企业费用与结算", status: "待接受", last: "尚未登录", title:"财务负责人", mfa:"待设置", joined:"邀请于 2026-08-30", login:"尚无登录记录", projectIds:[], credentialProjectIds:[], allocation:{voice:0,token:0,rpm:0,tpm:0,concurrency:0}, usage:{voice:0,token:0,rpm:0,tpm:0,concurrency:0} },
  { name: "陈审计", email: "a***@yunfu.ai", phone: "13600007890", role: "Viewer", scope: "客服播报", status: "正常", last: "昨天 17:06", title:"客户审计", mfa:"已开启", joined:"2026-08-12", login:"北京 · 198.51.100.36", projectIds:["proj_yunfu_prod_01"], credentialProjectIds:[], allocation:{voice:200,token:5,rpm:15,tpm:500000,concurrency:5}, usage:{voice:41,token:2,rpm:12,tpm:90000,concurrency:0} },
]; 

export function memberQuota(member: Member, usage = false): MemberQuota {
  const source = usage ? member.usageQuota : member.quota;
  const legacy = usage ? member.usage : member.allocation;
  return source ?? {
    points: (legacy?.token ?? 0) * 1000,
    asr: legacy?.voice ?? 0,
    tts: (legacy?.token ?? 0) * 10000,
    rpm: legacy?.rpm ?? 0,
    concurrency: legacy?.concurrency ?? 0,
  };
}

export const rolePermissions: Record<Role, View[]> = {
  Owner: Object.keys(labels) as View[],
  Admin: Object.keys(labels) as View[],
  Developer: ["overview","models","modelDetail","experience","solutions","playground","docs","projects","projectDetail","keys","keyDetail","quota","voices","usage3","notifications","dedicated"],
  Finance: ["overview","keys","voices","billing3","usage3","notifications"],
  Viewer: ["overview","models","modelDetail","docs","keys","voices","usage3","notifications"],
};

export function can(role: Role, view: View) { return !isRetiredMonitoringView(view) && rolePermissions[role].includes(view); }
export const actionPermissions: Record<PermissionAction, Role[]> = {
  "project.create": ["Owner", "Admin"],
  "member.manage": ["Owner", "Admin"],
  "member.admin.manage": ["Owner"],
  "enterprise.security.manage": ["Owner"],
  "key.create": ["Owner", "Admin", "Developer"],
  "key.rotate": ["Owner", "Admin", "Developer"],
  "key.disable": ["Owner", "Admin", "Developer"],
  "usage.view": ["Owner", "Admin", "Developer", "Finance", "Viewer"],
  "quality.view": ["Owner", "Admin", "Developer", "Finance", "Viewer"],
  "audit.view": ["Owner", "Admin"],
};
export function canAct(role: Role, action: PermissionAction) { return actionPermissions[action].includes(role); }
export const assignableRoles = (actorRole: Role): Role[] => actorRole === "Owner"
  ? ["Admin", "Developer", "Finance", "Viewer"]
  : actorRole === "Admin"
    ? ["Developer", "Finance", "Viewer"]
    : [];
export function canManageMember(actorRole: Role, targetRole: Role) {
  if (actorRole === "Owner") return targetRole !== "Owner";
  if (actorRole === "Admin") return targetRole !== "Owner" && targetRole !== "Admin";
  return false;
}
export function canAccessProject(role: Role, projectId: string, member?: Member) {
  if (role === "Owner" || role === "Admin" || role === "Finance") return true;
  return (role === "Developer" || role === "Viewer") && Boolean(member?.projectIds?.includes(projectId));
}
export function canManageCredentials(role: Role, projectId: string, member?: Member) {
  if (role === "Owner" || role === "Admin") return true;
  return role === "Developer"
    && Boolean(member?.projectIds?.includes(projectId))
    && Boolean(member?.credentialProjectIds?.includes(projectId));
}
export function notice(message: string) { window.dispatchEvent(new CustomEvent<string>("moss:v3-toast", { detail: message })); }
