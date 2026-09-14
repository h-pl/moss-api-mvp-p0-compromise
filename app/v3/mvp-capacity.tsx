import type { Member } from "./data";
import { enterpriseContractModels, enterpriseDefaultPolicies } from "./enterprise-resource-data";

export type CapacitySnapshot = { peak: number | null; currentLimit: number | null; peakAt: string | null; covered: boolean; unlimited?: boolean; enterpriseLimit?: number };
export const capacityAsOf = "2026-09-08 21:00（UTC+8）";
// Concurrent samples share a timeline. Enterprise occupancy is summed at each
// instant, then peaked; independently peaking each member and summing is invalid.
import { mvpHistoricalPolicies, mvpSeedMembers } from "./mvp-fixtures";
export type CapacitySample = { modelId: string; at: string; users: Record<string, number> };
const users = ["owner@yunfu.ai", "w***@yunfu.ai", "l***@yunfu.ai", "zhou@yunfu.ai", "zhao@yunfu.ai", "sun@yunfu.ai", "zheng@yunfu.ai"];
const scenarios: [number, string, number[]][] = [
  [0, "14:32", [6,8,0,0,0,0,0]], [0, "10:08", [3,0,5,7,0,11,6]],
  [1, "11:16", [4,0,0,4,0,3,8]], [1, "16:02", [2,0,0,1,0,1,9]],
  [2, "10:08", [2,0,0,0,0,0,2]],
  [3, "16:42", [2,0,0,2,0,3,0]], [3, "15:12", [1,0,0,1,0,4,0]],
  [4, "13:18", [3,0,0,3,6,0,1]], [4, "17:05", [1,0,0,1,2,0,4]],
  [5, "12:20", [2,0,0,0,2,0,5]],
];
const baseCapacitySamples: CapacitySample[] = scenarios.map(([index, time, values]) => ({ modelId: enterpriseContractModels[index].id, at: `2026-09-08T${time}:00+08:00`, users: Object.fromEntries(users.map((user, i) => [user, values[i]])) }));
// Shared enterprise pool uses one consistent member/enterprise timeline.
export const capacitySamples: CapacitySample[] = [
  ...baseCapacitySamples,
  ...[[0, "15:20", 68], [1, "15:40", 50]].map(([index, time, peak]) => ({
    modelId: enterpriseContractModels[Number(index)].id,
    at: `2026-09-08T${time}:00+08:00`,
    users: Object.fromEntries(users.map((user, i) => [user, i === 0 ? Number(peak) : 0])),
  })),
];
export function capacityFor(modelId: string, member?: Member): CapacitySnapshot {
  const model = enterpriseContractModels.find(item => item.id === modelId);
  const historical = member ? mvpHistoricalPolicies[member.email]?.[modelId] : undefined;
  const policy = member ? enterpriseDefaultPolicies(member)[modelId] : undefined;
  const currentLimit = member ? (policy?.enabled ? policy.concurrency === null ? model?.concurrency ?? null : Math.min(policy.concurrency ?? 0, model?.concurrency ?? 0) : null) : model?.concurrency ?? null;
  const context = policy?.enabled && policy.concurrency === null ? { unlimited: true, enterpriseLimit: model?.concurrency } : {};
  const missing = { ...context, peak: null, currentLimit, peakAt: null, covered: false };
  // The last model deliberately has missing enterprise telemetry, not a zero peak.
  if (!model || (!member && model === enterpriseContractModels.at(-1)) || (member && !historical?.enabled)) return missing;
  const points = capacitySamples.filter(point => point.modelId === modelId).map(point => ({
    at: point.at, peak: member ? point.users[member.email] ?? 0 : Object.values(point.users).reduce((sum, value) => sum + value, 0),
  })).sort((a, b) => b.peak - a.peak || b.at.localeCompare(a.at));
  if (!points.length || (member && !mvpSeedMembers.some(seed => seed.email === member.email))) return missing;
  return { ...context, peak: points[0].peak, currentLimit, peakAt: points[0].at.slice(5, 16).replace("T", " "), covered: true };
}
export function capacityLevel(snapshot: CapacitySnapshot) {
  if (!snapshot.covered || snapshot.peak === null || snapshot.currentLimit === null || !Number.isFinite(snapshot.peak) || !Number.isFinite(snapshot.currentLimit) || snapshot.peak < 0 || snapshot.currentLimit <= 0) return "unknown";
  const ratio = snapshot.peak / snapshot.currentLimit;
  return ratio >= 1 ? "critical" : ratio >= .8 ? "warning" : "default";
}
export const capacityLabel = (snapshot: CapacitySnapshot) => ({ unknown: "暂无完整数据", default: "充足", warning: "接近上限", critical: "已达上限" })[capacityLevel(snapshot)];
export function capacityLimitState(snapshot: CapacitySnapshot) {
  return ({ unknown: "unknown", default: "normal", warning: "near", critical: "reached" } as const)[capacityLevel(snapshot)];
}
export const capacityLimitLabel = capacityLabel;
export function CapacityMeter({ snapshot, label }: { snapshot: CapacitySnapshot; label: string }) {
  const level = capacityLevel(snapshot);
  if (snapshot.currentLimit === 0) return <span className="mvp-capacity-empty">0 路<small>未分配并发额度</small></span>;
  if (level === "unknown") return <span className="mvp-capacity-empty">—{snapshot.currentLimit !== null && Number.isFinite(snapshot.currentLimit) && snapshot.currentLimit > 0 ? ` / ${snapshot.currentLimit} 路` : null}<small>暂无完整数据</small></span>;
  const peak = snapshot.peak!, limit = snapshot.currentLimit!;
  return <div className={`mvp-capacity ${level}`}><div><b>{peak}<span> / {limit} 路</span></b><small className="mvp-capacity-status">{capacityLabel(snapshot)}</small></div><div className="mvp-capacity-track" role="meter" aria-label={label} aria-valuenow={peak} aria-valuemin={0} aria-valuemax={Math.max(peak, limit)} aria-valuetext={`近 24h 峰值 ${peak}，当前并发上限 ${limit}，${capacityLabel(snapshot)}，峰值发生于 ${snapshot.peakAt}`}><i style={{ width: `${Math.min(100, peak / limit * 100)}%` }} /></div><small>峰值发生于 {snapshot.peakAt}</small></div>;
}

export function CapacityNote() {
  return <p className="eu2-resource-note">数据更新于 {capacityAsOf}</p>;
}
