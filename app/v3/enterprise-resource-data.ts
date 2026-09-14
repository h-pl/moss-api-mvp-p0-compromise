import { ApiKeyRecord, Member, ModelPolicy } from "./data";

export type EnterpriseContractModel = {
  id: string;
  name: string;
  kind: "TTS" | "ASR";
  concurrency: number;
  rpm: number;
  usedConcurrency: number;
  usedRpm: number;
};

export const enterpriseContractModels: EnterpriseContractModel[] = [
  { id: "moss-tts-1.5-flash-2026-06-26", name: "MOSS-TTS-1.5-Flash", kind: "TTS", concurrency: 80, rpm: 500, usedConcurrency: 76, usedRpm: 480 },
  { id: "moss-ttsd-1.0-2026-03-20", name: "MOSS-TTSD-1.0", kind: "TTS", concurrency: 60, rpm: 300, usedConcurrency: 55, usedRpm: 280 },
  { id: "moss-voice-generator-1.0-2026-07-22", name: "MOSS-Voice-Generator-1.0", kind: "TTS", concurrency: 40, rpm: 200, usedConcurrency: 12, usedRpm: 96 },
  { id: "moss-tts-1.0-pro-2026-02-07", name: "MOSS-TTS-1.0-Pro", kind: "TTS", concurrency: 30, rpm: 200, usedConcurrency: 9, usedRpm: 72 },
  { id: "moss-transcribe-diarize-pro-2026-07-03", name: "MOSS-Transcribe-Diarize-Pro", kind: "ASR", concurrency: 50, rpm: 120, usedConcurrency: 22, usedRpm: 41 },
  { id: "moss-transcribe-1.0-2026-07-22", name: "MOSS-Transcribe-1.0", kind: "ASR", concurrency: 30, rpm: 100, usedConcurrency: 14, usedRpm: 36 },
];

const enterpriseCredentialMockRows: [string, string, string, string, ApiKeyRecord["status"]][] = [
  ["production-primary", "A101", "1,284 积分", "今天 14:32", "有效"], ["realtime-asr", "B206", "968 积分", "今天 13:18", "有效"],
  ["batch-transcribe", "C314", "742 积分", "今天 11:46", "有效"], ["customer-service", "D428", "615 积分", "昨天 22:09", "有效"],
  ["notification-tts", "E535", "488 积分", "昨天 18:25", "有效"], ["voice-preview", "F642", "326 积分", "昨天 16:40", "有效"],
  ["subtitle-pipeline", "G759", "271 积分", "09-04 20:16", "有效"], ["meeting-notes", "H863", "195 积分", "09-04 17:02", "有效"],
  ["call-center", "J974", "144 积分", "09-03 15:31", "有效"], ["quality-review", "K182", "86 积分", "09-02 10:45", "有效"],
  ["integration-test", "L297", "28 积分", "09-01 09:12", "轮换中"], ["legacy-worker", "M405", "1,906 积分", "停用于 08-30", "已停用"],
  ["sandbox-demo", "N518", "12 积分", "停用于 08-27", "已停用"],
];

export function enterpriseCredentialMockKeys(member: Member): ApiKeyRecord[] {
  if (member.status === "待接受") return [];
  const accountSlug = member.email.replace(/[^a-z0-9]+/gi, "_");
  return enterpriseCredentialMockRows.map(([name, suffix, usage, lastUsedAt, status], index) => ({
    id: `key_credentials7_${accountSlug}_${index + 1}`, identity: "enterprise", ownerPhone: member.phone,
    name, masked: `sk_live_••••${suffix}`, accountId: member.email, accountName: member.name,
    projectId: "enterprise", projectName: "企业账号", scopes: ["api:invoke"], ipAllowlist: "未限制", expiresAt: "长期有效",
    createdBy: member.name, createdAt: `2026-08-${String(28 - index).padStart(2, "0")} 10:${String(index * 3).padStart(2, "0")}`,
    lastUsedAt, lastRotatedAt: status === "轮换中" ? "2026-09-01 09:12" : "—", version: status === "轮换中" ? 2 : 1,
    usage, status, exposureEvents: [{ memberEmail: member.email, memberName: member.name, action: "创建", at: `2026-08-${String(28 - index).padStart(2, "0")} 10:${String(index * 3).padStart(2, "0")}`, version: 1 }],
  }));
}

// Each tuple follows enterpriseContractModels: member limit, current usage and demo key states.
export const enterpriseMemberScenarios: Record<string, { limits: number[]; used: number[]; keys: ApiKeyRecord["status"][] }> = {
  "owner@yunfu.ai": { limits: enterpriseContractModels.map(model => model.concurrency), used: [68, 50, 2, 2, 3, 2], keys: [] },
  "zhou@yunfu.ai": { limits: [20, 12, 0, 8, 10, 0], used: [7, 4, 0, 2, 3, 0], keys: ["有效", "有效", "已停用"] },
  "zhao@yunfu.ai": { limits: [0, 0, 0, 0, 15, 10], used: [0, 0, 0, 0, 6, 2], keys: ["有效"] },
  "sun@yunfu.ai": { limits: [12, 8, 0, 5, 0, 0], used: [11, 3, 0, 4, 0, 0], keys: ["有效", "有效"] },
  "wu@yunfu.ai": { limits: [0, 0, 0, 0, 0, 4], used: [0, 0, 0, 0, 0, 0], keys: [] },
  "zheng@yunfu.ai": { limits: [16, 10, 6, 0, 8, 5], used: [6, 9, 2, 0, 4, 5], keys: ["有效", "有效", "有效"] },
  "he@yunfu.ai": { limits: [0, 0, 0, 0, 0, 2], used: [0, 0, 0, 0, 0, 0], keys: [] },
  "gao@yunfu.ai": { limits: [0, 0, 0, 0, 8, 6], used: [0, 0, 0, 0, 0, 0], keys: ["已停用"] },
};

export const enterpriseSupplementalMembers: Member[] = [
  { name: "高审计", email: "gao@yunfu.ai", joined: "2026-06-28", phone: "13800006007", role: "Viewer", scope: "客服播报", status: "已停用", last: "上周五 16:10", allocation: { voice: 200, token: 5, rpm: 30, tpm: 300000, concurrency: 5 }, usage: { voice: 70, token: 2, rpm: 12, tpm: 90000, concurrency: 1 } },
  { name: "周运营", email: "zhou@yunfu.ai", joined: "2026-07-08", phone: "13800006001", role: "Admin", scope: "全部企业资源", status: "正常", last: "今天 09:42", allocation: { voice: 600, token: 20, rpm: 180, tpm: 1000000, concurrency: 20 }, usage: { voice: 280, token: 10, rpm: 92, tpm: 420000, concurrency: 8 } },
  { name: "赵产品", email: "zhao@yunfu.ai", joined: "2026-07-21", phone: "13800006002", role: "Developer", scope: "内部评测", status: "正常", last: "今天 09:31", allocation: { voice: 300, token: 12, rpm: 100, tpm: 800000, concurrency: 12 }, usage: { voice: 180, token: 6, rpm: 55, tpm: 260000, concurrency: 5 } },
  { name: "孙客服", email: "sun@yunfu.ai", joined: "2026-08-03", phone: "13800006003", role: "Developer", scope: "客服播报", status: "正常", last: "今天 09:18", allocation: { voice: 500, token: 18, rpm: 150, tpm: 900000, concurrency: 18 }, usage: { voice: 410, token: 14, rpm: 132, tpm: 700000, concurrency: 16 } },
  { name: "吴数据", email: "wu@yunfu.ai", joined: "2026-08-12", phone: "13800006004", role: "Viewer", scope: "客服播报", status: "正常", last: "昨天 18:20", allocation: { voice: 120, token: 4, rpm: 40, tpm: 300000, concurrency: 4 }, usage: { voice: 28, token: 1, rpm: 8, tpm: 70000, concurrency: 1 } },
  { name: "郑研发", email: "zheng@yunfu.ai", joined: "2026-07-16", phone: "13800006005", role: "Developer", scope: "内部评测", status: "接近上限", last: "昨天 17:45", allocation: { voice: 400, token: 16, rpm: 80, tpm: 800000, concurrency: 10 }, usage: { voice: 310, token: 12, rpm: 76, tpm: 620000, concurrency: 9 } },
  { name: "何财务", email: "he@yunfu.ai", phone: "13800006006", role: "Finance", scope: "企业费用与结算", status: "待接受", last: "尚未登录", allocation: { voice: 0, token: 0, rpm: 0, tpm: 0, concurrency: 0 }, usage: { voice: 0, token: 0, rpm: 0, tpm: 0, concurrency: 0 } },
];

export function enterpriseDisplayMembers(members: Member[]) {
  return [...members, ...enterpriseSupplementalMembers.filter(seed => !members.some(member => member.email === seed.email))]
    .map((member, index) => index === 0 && !member.phone ? { ...member, phone: `1380000${String(5678 + index).padStart(4, "0")}` } : member);
}

export const enterpriseDefaultPolicies = (member?: Member): Record<string, ModelPolicy> => Object.fromEntries(enterpriseContractModels.map((model, index) => {
  const stored = member?.modelPolicies?.[model.id];
  const owner = member?.role === "Owner";
  const scenarioLimit = member ? enterpriseMemberScenarios[member.email]?.limits[index] : undefined;
  return [model.id, {
    enabled: stored?.enabled ?? (owner ? true : scenarioLimit !== undefined ? scenarioLimit > 0 : member ? index === 0 : false),
    concurrency: stored?.concurrency !== undefined ? stored.concurrency : member ? (owner ? null : scenarioLimit || (index === 0 ? 10 : 1)) : 1,
  }];
}));

// Shared-pool variant: an Owner inherits each enterprise model limit until edited.
// Preserve explicit policies, including null and removed model authorization.
export const withSharedOwnerDefaults = (members: Member[]): Member[] => members.map(member => member.role !== "Owner" ? member : {
  ...member,
  modelPolicies: Object.fromEntries(enterpriseContractModels.map(model => [model.id,
    member.modelPolicies?.[model.id] ?? { enabled: true, concurrency: null },
  ])),
});

export function enterpriseUsedForMember(member: Member, index: number, limit: number) {
  if (!["正常", "接近上限"].includes(member.status)) return 0;
  const scenario = enterpriseMemberScenarios[member.email];
  if (scenario) return Math.min(limit, scenario.used[index] ?? 0);
  const baseline = member.usage?.concurrency ?? 0;
  return Math.min(limit, Math.max(0, Math.round(baseline * ([0.42, 0.3, 0.22, 0.18, 0.5, 0.35][index] ?? 0.25))));
}

export const enterpriseResourceIsNear = (model: EnterpriseContractModel) =>
  model.usedConcurrency / model.concurrency >= .8 || model.usedRpm / model.rpm >= .8;
