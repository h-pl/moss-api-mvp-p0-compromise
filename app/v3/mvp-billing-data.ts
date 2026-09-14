import type { ApiKeyRecord, Member } from "./data";
import { sumUsage8, selectUsage8, usage8Range, usage8AsOf, type Usage8Access, type Usage8Filters, type Usage8Model, type Usage8Key, type Usage8Row } from "./usage8-data";
import { makeMvpUsageDemo, mvpPointCents } from "./mvp-fixtures";
export { mvpUsageCatalog } from "./mvp-fixtures";
// Fixture generation only. Production must return ledger-backed charges, never price in the browser.
export function makeMvpBillingDemo(members: Member[], keys: ApiKeyRecord[]) {
  return makeMvpUsageDemo(members, keys).map(row => {
    const pointCents = mvpPointCents(row);
    return { ...row, pointCents, amountCents: Math.round(pointCents * .03) };
  });
}
export type MvpBillingRow = Usage8Row & { pointCents: number; amountCents: number };
export function sumMvpBilling(rows: MvpBillingRow[]) {
  return { ...sumUsage8(rows), pointCents: rows.reduce((sum,row) => sum + row.pointCents, 0), amountCents: rows.reduce((sum,row) => sum + row.amountCents, 0) };
}
export function groupMvpBilling(rows: MvpBillingRow[], byModelOnly = false) {
  const groups = new Map<string, MvpBillingRow[]>();
  rows.forEach(row => { const key = byModelOnly ? row.modelId : JSON.stringify([row.modelId,row.userId,row.keyId]); groups.set(key, [...(groups.get(key) ?? []), row]); });
  return [...groups.values()].map(items => ({ ...items[0], ...sumMvpBilling(items) })).sort((a,b) => b.pointCents - a.pointCents);
}


export function groupMvpBillingByUser(rows: MvpBillingRow[]) {
  const groups = new Map<string, MvpBillingRow[]>();
  rows.forEach(row => {
    const id = JSON.stringify([row.modelId, row.userId]);
    groups.set(id, [...(groups.get(id) ?? []), row]);
  });
  return [...groups.values()].map(items => ({ modelId: items[0].modelId, userId: items[0].userId, ...sumMvpBilling(items) }))
    .sort((a, b) => b.pointCents - a.pointCents || a.modelId.localeCompare(b.modelId) || a.userId.localeCompare(b.userId));
}

const csvCell = (value: string | number) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
const csvDocument = (values: (string | number)[][]) => "\uFEFF" + values.map(row => row.map(csvCell).join(",")).join("\r\n");
const csvPeriod = (filters: Usage8Filters) => {
  const range = usage8Range(filters.period, filters.window);
  return [filters.period, `${range.startDate} 00:00:00`, range.end === Date.parse(usage8AsOf) ? usage8AsOf.slice(0, 19).replace("T", " ") : `${range.endDate} 23:59:59`];
};
const csvQuantity = (row: Pick<MvpBillingRow, "ttsCharacters" | "asrDeciseconds">, kind?: string) =>
  kind === "TTS" ? [row.ttsCharacters, "字符"] : [(row.asrDeciseconds / 10).toFixed(1), "秒"];

// Use stable IDs for grouping only; customer exports show names and masked keys.
export function csvMvpBilling(rows: MvpBillingRow[], filters: Usage8Filters, models: Usage8Model[], keys: Usage8Key[]) {
  const values: (string | number)[][] = [["账期", "统计开始（UTC+8）", "统计结束（UTC+8）", "模型", "用户", "API Key 名称", "API Key（脱敏）", "计费调用次数（次）", "计费用量", "计费单位", "消耗积分（积分）", "折后金额估算（元）"]];
  groupMvpBilling(rows).sort((a, b) => b.calls - a.calls || a.keyId.localeCompare(b.keyId)).forEach(row => {
    const key = keys.find(item => item.id === row.keyId);
    const model = models.find(item => item.id === row.modelId);
    values.push([...csvPeriod(filters), model?.name ?? "未知模型", key?.user ?? "企业成员", key?.name ?? "未知 Key", key?.masked ?? "—", row.calls, ...csvQuantity(row, model?.kind), (row.pointCents / 100).toFixed(2), (row.amountCents / 100).toFixed(2)]);
  });
  return csvDocument(values);
}

// Full-period export ignores display filters, but always preserves actor access.
export function mvpPeriodDetails(rows: MvpBillingRow[], period: string, access: Usage8Access) {
  const filters: Usage8Filters = { period, window: "month", modelId: "all", userId: "all", keyId: "all" };
  return { filters, rows: selectUsage8(rows, filters, access) };
}
