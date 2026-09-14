import type { Usage8Filters } from "./usage8-data";

export type Usage3Context = Pick<Usage8Filters, "period" | "modelId" | "userId">;
const queryKeys = { period: "usagePeriod", modelId: "usageModel", userId: "usageUser" } as const;

export function writeUsage3Context(params: URLSearchParams, context?: Usage3Context) {
  for (const field of Object.keys(queryKeys) as (keyof Usage3Context)[]) {
    params.delete(queryKeys[field]);
    if (context) params.set(queryKeys[field], context[field]);
  }
}

export function readUsage3Context(params: URLSearchParams, defaults: Usage8Filters, access: { userId: string; enterpriseWide: boolean; modelIds: string[]; userIds: string[] }): Usage8Filters {
  const period = params.get(queryKeys.period);
  const modelId = params.get(queryKeys.modelId);
  const userId = params.get(queryKeys.userId);
  return {
    ...defaults,
    period: period && ["2026-08", "2026-09"].includes(period) ? period : defaults.period,
    modelId: modelId && access.modelIds.includes(modelId) ? modelId : defaults.modelId,
    userId: access.enterpriseWide && userId && access.userIds.includes(userId) ? userId : access.userId,
    keyId: "all",
    window: "month",
  };
}
