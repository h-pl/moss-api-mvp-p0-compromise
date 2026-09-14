import { normalizeMemberLifecycle } from "./member-lifecycle";
import { initialMembers, type ApiKeyRecord, type Member } from "./data";
import { enterpriseContractModels, enterpriseCredentialMockKeys, enterpriseDefaultPolicies, enterpriseSupplementalMembers } from "./enterprise-resource-data";
import { makeUsage8Demo, usage8AsOf, type Usage8Key, type Usage8Row } from "./usage8-data";

export { enterpriseCompany as mvpCompany } from "./enterprise-company";
export const mvpSeedMembers: Member[] = [...initialMembers, ...enterpriseSupplementalMembers]
  .filter(member => ["Owner", "Admin", "Developer"].includes(member.role))
  .map(member => ({ ...member, status: member.status === "接近上限" ? "正常" : member.status }));
mvpSeedMembers.push({ name: "高开发", email: "disabled@moss.demo", phone: "13800006007", role: "Developer", scope: "企业模型权限", status: "已停用", last: "2026-08-29 16:10", joined: "2026-06-28" });

// Historical authorization and lifecycle facts are frozen at the demo snapshot.
// Editing today's permissions or disabling a key must never rewrite billed history.
export const mvpMemberDisabledAt: Record<string, string> = { "disabled@moss.demo": "2026-08-30T00:00:00+08:00" };
export const mvpHistoricalPolicies = Object.fromEntries(mvpSeedMembers.map(member => [member.email,
  enterpriseDefaultPolicies(member),
]));
const seedKeys = mvpSeedMembers.flatMap((member, memberIndex) => enterpriseCredentialMockKeys(member).map((key, keyIndex): ApiKeyRecord => ({
  ...key, masked: `sk_demo_••••${(0xA100 + memberIndex * 0x100 + keyIndex + 1).toString(16).toUpperCase()}`,
  status: member.status === "已停用" ? "已停用" : key.status === "轮换中" ? "有效" : key.status,
  version: 1, lastRotatedAt: "—", exposureEvents: key.exposureEvents.filter(event => event.action === "创建"),
})));
export const mvpKeyDisabledAt = Object.fromEntries(seedKeys.filter(key => /_(12|13)$/.test(key.id)).map(key => [key.id, key.id.endsWith("_12") ? "2026-08-30T00:00:00+08:00" : "2026-08-27T00:00:00+08:00"]));
export function mvpUsageCatalog(members: Member[], keys: ApiKeyRecord[]): Usage8Key[] {
  const users = new Map(members.map(member => [member.email, member]));
  return keys.filter(key => key.identity === "enterprise" && users.has(key.accountId)).map(key => ({ id: key.id, name: key.name, masked: key.masked, userId: key.accountId, user: users.get(key.accountId)!.name, createdAt: key.createdAt }));
}
export const mvpHistoricalUsage: Usage8Row[] = makeUsage8Demo(mvpUsageCatalog(mvpSeedMembers, seedKeys), enterpriseContractModels).filter(row => {
  const member = mvpSeedMembers.find(member => member.email === row.userId)!;
  const cutoff = [mvpMemberDisabledAt[row.userId], mvpKeyDisabledAt[row.keyId], usage8AsOf].filter(Boolean).sort()[0];
  return mvpHistoricalPolicies[row.userId][row.modelId].enabled
    && row.date >= (member.joined ?? "2026-08-01") && Date.parse(`${row.date}T20:00:00+08:00`) < Date.parse(cutoff);
});
export function makeMvpUsageDemo(members: Member[], keys: ApiKeyRecord[]) {
  const identities = new Map(mvpUsageCatalog(members, keys).map(key => [key.id, key.userId]));
  return mvpHistoricalUsage.filter(row => identities.get(row.keyId) === row.userId);
}
// Read access to one's own historical usage survives a later invocation-authorization change.
export function mvpQueryableModels(member: Member) {
  const policies = enterpriseDefaultPolicies(member);
  return enterpriseContractModels.filter(model => policies[model.id].enabled || mvpHistoricalUsage.some(row => row.userId === member.email && row.modelId === model.id));
}
export function mvpLastUsedAt(keyId: string) {
  const lastDate = mvpHistoricalUsage.filter(row => row.keyId === keyId).map(row => row.date).sort().at(-1);
  return lastDate ? `${lastDate} 20:00` : "尚未调用";
}
// User-confirmed contract rates; ledger and printed statement share this mapping.
export const mvpBillingRules = {
  "moss-tts-1.5-flash-2026-06-26": { pointCents: 2000, quantity: 10000, unit: "万字符", kind: "TTS" },
  "moss-ttsd-1.0-2026-03-20": { pointCents: 2000, quantity: 10000, unit: "万字符", kind: "TTS" },
  "moss-voice-generator-1.0-2026-07-22": { pointCents: 2000, quantity: 10000, unit: "万字符", kind: "TTS" },
  "moss-tts-1.0-pro-2026-02-07": { pointCents: 2000, quantity: 10000, unit: "万字符", kind: "TTS" },
  "moss-transcribe-diarize-pro-2026-07-03": { pointCents: 1700, quantity: 36000, unit: "音视频小时", kind: "ASR" },
  "moss-transcribe-1.0-2026-07-22": { pointCents: 1300, quantity: 36000, unit: "音视频小时", kind: "ASR" },
} as const;
export function mvpBillingRule(modelId: string) {
  const rule = mvpBillingRules[modelId as keyof typeof mvpBillingRules];
  if (!rule) throw new Error(`Missing billing rule for ${modelId}`);
  return rule;
}
export const mvpPointCents = (row: Usage8Row) => {
  const rule = mvpBillingRule(row.modelId);
  const quantity = rule.kind === "TTS" ? row.ttsCharacters : row.asrDeciseconds;
  return Math.round(quantity * rule.pointCents / rule.quantity);
};
export const mvpSeedKeys = seedKeys.map(key => ({ ...key, lastUsedAt: mvpLastUsedAt(key.id), usage: `${(mvpHistoricalUsage.filter(row => row.keyId === key.id && row.date.startsWith("2026-09")).reduce((sum, row) => sum + mvpPointCents(row), 0) / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 积分` }));

// Upgrade only fixture metadata; retain user-created keys, invitations, policies and state changes.
export function normalizeMvpMockState(members: Member[], keys: ApiKeyRecord[]) {
  const migrated = normalizeMemberLifecycle(members, keys);
  members = migrated.members; keys = migrated.apiKeys;
  const seeds = new Map(mvpSeedKeys.map(key => [key.id, key]));
  return {
    members: members.map(member => member.email === "disabled@moss.demo" && member.last === "08-30 16:10" ? { ...member, last: "2026-08-29 16:10" } : member),
    apiKeys: keys.map(key => {
      const seed = seeds.get(key.id);
      const metadata = seed ? { masked: seed.masked, lastUsedAt: seed.lastUsedAt, version: 1, lastRotatedAt: "—", usage: seed.usage, exposureEvents: seed.exposureEvents } : {};
      return { ...key, ...metadata, status: members.find(member => member.email === key.accountId)?.status === "已停用" ? "已停用" as const : key.status === "轮换中" ? "有效" as const : key.status };
    }),
  };
}

export const mvpVoiceAuthorizations = [
  { id: "voice_cn_warm_f", name: "暖阳女声", model: "MOSS-TTS-1.5-Flash", scope: "企业全部用户", source: "合同权益", effectiveAt: "2026-06-18", expiresAt: "2027-02-28", entitlement: "有效", usage: "客服播报、通知提醒" },
  { id: "voice_cn_service_m", name: "客服男声", model: "MOSS-TTS-1.5-Flash", scope: "企业全部用户", source: "企业复刻", effectiveAt: "2026-06-20", expiresAt: "2027-02-28", entitlement: "有效", usage: "客服应答、业务播报" },
];
export function mvpAvailableVoices(member: Member) {
  const date = usage8AsOf.slice(0, 10);
  return member.status !== "正常" ? [] : mvpVoiceAuthorizations.filter(voice => voice.effectiveAt <= date && voice.expiresAt >= date && enterpriseContractModels.some(model => model.name === voice.model && enterpriseDefaultPolicies(member)[model.id]?.enabled));
}
