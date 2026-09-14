import type { MemberQuota } from "./data";

export type ResourceAlertLevel = "default" | "warning" | "critical";

export const RESOURCE_WARNING_RATIO = .8;
export const RESOURCE_CRITICAL_RATIO = .95;

/**
 * Customer-facing utilization colour. This is deliberately independent from
 * rejection evidence: a low sampled water level must not turn red only because
 * the same observation window contains a historical rejection.
 */
export function resourceUtilizationLevel(
  used: number,
  limit: number,
  unlimited = false,
): ResourceAlertLevel {
  if (unlimited || !Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return "default";
  const ratio = used / limit;
  if (ratio >= RESOURCE_CRITICAL_RATIO) return "critical";
  if (ratio >= RESOURCE_WARNING_RATIO) return "warning";
  return "default";
}

/**
 * Aggregate attention severity used by status summaries. Rejection evidence is
 * critical here, while the meter itself still uses resourceUtilizationLevel.
 */
export function resourceAlertLevel(
  used: number,
  limit: number,
  rejected = 0,
  unlimited = false,
): ResourceAlertLevel {
  if (rejected > 0) return "critical";
  return resourceUtilizationLevel(used, limit, unlimited);
}

export const resourceAlertTone = (level: ResourceAlertLevel) =>
  level === "critical" ? "bad" as const : level === "warning" ? "warn" as const : "good" as const;

export function resourceAlertLabel(level: ResourceAlertLevel, rejected = 0) {
  if (level === "critical") return rejected > 0 ? "发生拒绝" : "容量高风险";
  return level === "warning" ? "接近上限" : "充足";
}

export function strongestResourceAlertLevel(levels: ResourceAlertLevel[]): ResourceAlertLevel {
  if (levels.includes("critical")) return "critical";
  return levels.includes("warning") ? "warning" : "default";
}

// Preview policy fixture, not a product-wide fixed threshold. Production supplies
// the effective policy per metric; the UI must not edit or invent a threshold.
export const previewMemberWarningPolicy: Partial<Record<keyof MemberQuota, number>> = {
  points: 0.8, asr: 0.8, tts: 0.8, rpm: 0.8, concurrency: 0.8,
};

export function metricIsNearLimit(used: number, quota: number, threshold: number | undefined, unlimited = false) {
  return !unlimited && Number.isFinite(used) && Number.isFinite(quota) && quota > 0
    && threshold !== undefined && Number.isFinite(threshold) && threshold > 0 && threshold <= 1
    && used / quota >= threshold;
}

export function aggregateMemberStatus(lifecycle: string, warnings: boolean[]) {
  if (lifecycle !== "正常" && lifecycle !== "接近上限") return lifecycle === "已撤回" ? "已过期" : lifecycle;
  return warnings.some(Boolean) ? "接近上限" : "正常";
}
