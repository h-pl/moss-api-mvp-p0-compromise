/** Personal public rates verified at platform.mosi.cn/app/pricing/ on 2026-10-17.
 * Enterprise contract fixtures retain their independently agreed baseline. */
export type RatePolicy = { version: string; model: string; standardCents: number; basisUnits: number; basisLabel: string; discountBps: number; minimumCents: number };
export const enterpriseContract = { id: 'ent-xinghe', name: '星河科技', pricingVersion: 'contract-xinghe-2026-07', effectiveFrom: '2026-07-01', effectiveTo: '2027-06-30' };
const contractBaseRates: Record<string, { standardCents: number; basisUnits: number; basisLabel: string; minimumCents: number }> = {
  'moss-tts-1.0-pro': { standardCents: 2000, basisUnits: 10000, basisLabel: '万字符', minimumCents: 10 },
  'moss-tts-1.5-flash': { standardCents: 2000, basisUnits: 10000, basisLabel: '万字符', minimumCents: 10 },
  'moss-transcribe': { standardCents: 1300, basisUnits: 3600, basisLabel: '小时', minimumCents: 2 },
  'moss-ttsd-1.0': { standardCents: 2000, basisUnits: 10000, basisLabel: '万字符', minimumCents: 10 },
  'moss-voice-generator-1.0': { standardCents: 2000, basisUnits: 10000, basisLabel: '万字符', minimumCents: 10 },
  'moss-transcribe-diarize-pro': { standardCents: 1700, basisUnits: 3600, basisLabel: '小时', minimumCents: 2 },
};
// Identity/operations API will provide a contract by enterprise ID, never by caller-editable role.
const enterpriseDiscounts: Record<string, Record<string, number>> = { 'ent-xinghe': { 'moss-tts-1.0-pro': 8000, 'moss-tts-1.5-flash': 9000, 'moss-transcribe': 8500, 'moss-ttsd-1.0': 9000, 'moss-voice-generator-1.0': 8500, 'moss-transcribe-diarize-pro': 8000 } };
export function rateFor(context: 'enterprise' | 'personal', model: string, enterpriseId = enterpriseContract.id): RatePolicy {
  const baseline = contractBaseRates[model];
  const rate = context === 'personal' && baseline
    ? { ...baseline, standardCents: model === 'moss-transcribe' ? 1600 : 4000, minimumCents: 0 }
    : baseline;
  if (!rate) throw new Error(`未配置模型计费标准：${model}`);
  const discounts = enterpriseDiscounts[enterpriseId];
  if (context === 'enterprise' && !discounts) throw new Error('企业合同价格尚未配置');
  return { ...rate, model, version: context === 'enterprise' ? enterpriseContract.pricingVersion : 'platform-list-2026-10-17', discountBps: context === 'enterprise' ? discounts[model] : 10000 };
}
export const ratePoints = (rate: RatePolicy) => rate.standardCents * rate.discountBps / 1_000_000;
export const discountLabel = (bps: number) => bps === 10000 ? '标准价' : `${Number((bps / 1000).toFixed(2))} 折`;
export function chargeCents(units: number, rate: RatePolicy) {
  if (!Number.isFinite(units) || units < 0) throw new Error('计费用量必须为非负数');
  if (units === 0) return 0;
  return Math.max(rate.minimumCents, Math.round(units * rate.standardCents * rate.discountBps / (rate.basisUnits * 10000)));
}

// Estimate only: screenshot base package 400 points / RMB 20. Does not apply a second model discount.
export const estimateYuan = (pointCents: number) => pointCents / 100 * 0.05;

// Shared with the enterprise ledger so the price page and mock bills cannot drift.
export const kimiContractCategories = ['输入-缓存命中', '输入-缓存未命中', '输出'] as const;
export const kimiContractTiers = [
  { upperTokens: 100_000_000, threshold: '≤100', range: '≤100', yuan: [2, 20, 100] },
  { upperTokens: 200_000_000, threshold: '>100', range: '>100–200', yuan: [1.6, 16, 80] },
  { upperTokens: Infinity, threshold: '>200', range: '>200', yuan: [1.2, 12, 60] },
] as const;
