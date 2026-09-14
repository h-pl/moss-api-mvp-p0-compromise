import type { Role, Tone } from "./data";
import { enterpriseContractModels } from "./enterprise-resource-data";

export type ServiceKind4 = "TTS" | "ASR";
export type TrendWindow4 = "1h" | "24h" | "7d" | "30d";
export type ReconciliationState4 = "已对账" | "待对账";
export type ReasonCode4 =
  | "SUCCESS"
  | "CONCURRENCY_LIMIT_EXCEEDED"
  | "RPM_LIMIT_EXCEEDED"
  | "QUEUE_LIMIT_EXCEEDED"
  | "UPSTREAM_CAPACITY_THROTTLED"
  | "UNKNOWN"
  | "INVALID_ARGUMENT"
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL_ERROR";
export type RequestMode4 = "同步" | "流式" | "异步";

export type PointPricingRule4 = {
  code: string;
  billingUnit: "INPUT_CHARACTERS" | "AUDIO_HOURS";
  unitLabel: string;
  unitSize: number;
  pointsPerUnit: number;
  minimumPointsPerRequest: number;
  source: "模型计费标准";
};

export type CommercialPricingRule4 = {
  code: string;
  rateCny: number | null;
  unitLabel: string;
  source: "企业生效计费协议换算";
  applicable: boolean;
  estimateOnly: true;
};

export const enterprisePointConversion4 = {
  cnyPerPoint: .03,
  publicReferenceMinCnyPerPoint: .0446,
  publicReferenceMaxCnyPerPoint: .05,
  contractDiscountLabel: "演示企业合同 6 折",
  ruleVersion: "enterprise_points_discount_2026_v1",
  effectiveFrom: "2026-08-01",
  source: "当前企业生效计费协议",
  note: "个人充值包参考约 ¥0.0446–¥0.0500/积分，首充赠送不计入；企业按生效计费协议生成已含折扣的有效换算率。",
} as const;

export type ModelCatalogItem4 = {
  id: string;
  name: string;
  service: ServiceKind4;
  concurrencyLimit: number;
  rpmLimit: number;
  currentConcurrency: number;
  currentRpm: number;
  gatewayLimits: {
    maxPending: number;
    burst: number;
    modelRpmLimit: number;
    modelRpdLimit: number;
  };
  pointPricing: PointPricingRule4;
  commercialPricing: CommercialPricingRule4;
};

const pointPricingByModel4: Record<string, PointPricingRule4> = {
  "MOSS-TTS-1.5-Flash": { code: "points_tts_input_v1", billingUnit: "INPUT_CHARACTERS", unitLabel: "万字符", unitSize: 10_000, pointsPerUnit: 20, minimumPointsPerRequest: .1, source: "模型计费标准" },
  "MOSS-TTSD-1.0": { code: "points_tts_input_v1", billingUnit: "INPUT_CHARACTERS", unitLabel: "万字符", unitSize: 10_000, pointsPerUnit: 20, minimumPointsPerRequest: .1, source: "模型计费标准" },
  "MOSS-Voice-Generator-1.0": { code: "points_voice_design_v1", billingUnit: "INPUT_CHARACTERS", unitLabel: "万字符", unitSize: 10_000, pointsPerUnit: 20, minimumPointsPerRequest: .1, source: "模型计费标准" },
  "MOSS-TTS-1.0-Pro": { code: "points_tts_input_v1", billingUnit: "INPUT_CHARACTERS", unitLabel: "万字符", unitSize: 10_000, pointsPerUnit: 20, minimumPointsPerRequest: .1, source: "模型计费标准" },
  "MOSS-Transcribe-Diarize-Pro": { code: "points_asr_diarize_v1", billingUnit: "AUDIO_HOURS", unitLabel: "音视频小时", unitSize: 1, pointsPerUnit: 17, minimumPointsPerRequest: .02, source: "模型计费标准" },
  "MOSS-Transcribe-1.0": { code: "points_asr_basic_v1", billingUnit: "AUDIO_HOURS", unitLabel: "音视频小时", unitSize: 1, pointsPerUnit: 13, minimumPointsPerRequest: .02, source: "模型计费标准" },
};

const commercialPricingByModel4: Record<string, CommercialPricingRule4> = {
  "MOSS-TTS-1.5-Flash": { code: enterprisePointConversion4.ruleVersion, rateCny: enterprisePointConversion4.cnyPerPoint, unitLabel: "积分", source: "企业生效计费协议换算", applicable: true, estimateOnly: true },
  "MOSS-TTSD-1.0": { code: enterprisePointConversion4.ruleVersion, rateCny: enterprisePointConversion4.cnyPerPoint, unitLabel: "积分", source: "企业生效计费协议换算", applicable: true, estimateOnly: true },
  "MOSS-Voice-Generator-1.0": { code: enterprisePointConversion4.ruleVersion, rateCny: enterprisePointConversion4.cnyPerPoint, unitLabel: "积分", source: "企业生效计费协议换算", applicable: true, estimateOnly: true },
  "MOSS-TTS-1.0-Pro": { code: enterprisePointConversion4.ruleVersion, rateCny: enterprisePointConversion4.cnyPerPoint, unitLabel: "积分", source: "企业生效计费协议换算", applicable: true, estimateOnly: true },
  "MOSS-Transcribe-Diarize-Pro": { code: enterprisePointConversion4.ruleVersion, rateCny: enterprisePointConversion4.cnyPerPoint, unitLabel: "积分", source: "企业生效计费协议换算", applicable: true, estimateOnly: true },
  "MOSS-Transcribe-1.0": { code: enterprisePointConversion4.ruleVersion, rateCny: enterprisePointConversion4.cnyPerPoint, unitLabel: "积分", source: "企业生效计费协议换算", applicable: true, estimateOnly: true },
};

const modelRpdByName4: Record<string, number> = {
  "MOSS-TTS-1.5-Flash": 500_000,
  "MOSS-TTSD-1.0": 300_000,
  "MOSS-Voice-Generator-1.0": 200_000,
  "MOSS-TTS-1.0-Pro": 200_000,
  "MOSS-Transcribe-Diarize-Pro": 120_000,
  "MOSS-Transcribe-1.0": 100_000,
};

/** Model names, ids and contract capacity are derived from the formal enterprise resource source. */
export const modelCatalog4: ModelCatalogItem4[] = enterpriseContractModels.map(model => ({
  id: model.id,
  name: model.name,
  service: model.kind,
  concurrencyLimit: model.concurrency,
  rpmLimit: model.rpm,
  currentConcurrency: model.usedConcurrency,
  currentRpm: model.usedRpm,
  gatewayLimits: {
    maxPending: 20,
    burst: 60,
    modelRpmLimit: model.rpm,
    modelRpdLimit: modelRpdByName4[model.name],
  },
  pointPricing: pointPricingByModel4[model.name],
  commercialPricing: commercialPricingByModel4[model.name],
}));

export type MeterUsage4 =
  | { kind: "TTS"; rawCharacters: number; billableCharacters: number }
  | { kind: "ASR"; audioSeconds: number; channels: number; billableAudioSeconds: number };

export type MeterLine4 = {
  id: string;
  month: string;
  service: ServiceKind4;
  modelId: string;
  model: string;
  user: string;
  role: Role;
  phone: string;
  key: string;
  usage: MeterUsage4;
  requests: number;
  successfulRequests: number;
  meterEvents: number;
  ledgerEntries: number;
  pointCharge: {
    ruleCode: string;
    chargedPoints: number;
    adjustmentPoints: number;
    netPoints: number;
    source: "平台账本";
    ruleStatus: "已确认" | "待确认";
    aggregateRecalculation: "已按聚合量核对" | "聚合量不可直接反算";
    note: string;
  };
  cnyEstimate: {
    ruleCode: string;
    grossAmount: number | null;
    adjustmentAmount: number;
    netAmount: number | null;
    source: "企业生效计费协议折后估算";
  };
  reconciliationState: ReconciliationState4;
  evidenceRequestId: string;
};

type MeterIdentity4 = Pick<MeterLine4, "month" | "model" | "user" | "role" | "phone" | "key" | "requests" | "successfulRequests" | "meterEvents" | "ledgerEntries" | "reconciliationState" | "evidenceRequestId">;

function catalogModel4(name: string) {
  const model = modelCatalog4.find(item => item.name === name);
  if (!model) throw new Error(`Unknown operations4 model: ${name}`);
  return model;
}

function ttsMeterLine4(id: string, input: MeterIdentity4 & { rawCharacters: number; billableCharacters: number; points: number; pointAdjustment?: number }): MeterLine4 {
  const model = catalogModel4(input.model);
  const pointAdjustment = input.pointAdjustment ?? 0;
  const cnyRate = enterprisePointConversion4.cnyPerPoint;
  return {
    id, ...input, service: "TTS", modelId: model.id,
    usage: { kind: "TTS", rawCharacters: input.rawCharacters, billableCharacters: input.billableCharacters },
    pointCharge: {
      ruleCode: model.pointPricing.code,
      chargedPoints: input.points,
      adjustmentPoints: pointAdjustment,
      netPoints: input.points + pointAdjustment,
      source: "平台账本",
      ruleStatus: "已确认",
      aggregateRecalculation: pointAdjustment ? "聚合量不可直接反算" : "已按聚合量核对",
      note: pointAdjustment
        ? `平台按单请求计费后聚合；已包含 ${pointAdjustment.toFixed(2)} 积分的单次最低扣费调整，不能用聚合字符数直接反算。`
        : "平台账本入账值；已按当前公开积分规则与聚合量核对。",
    },
    cnyEstimate: { ruleCode: model.commercialPricing.code, grossAmount: Number((input.points * cnyRate).toFixed(2)), adjustmentAmount: Number((pointAdjustment * cnyRate).toFixed(2)), netAmount: Number(((input.points + pointAdjustment) * cnyRate).toFixed(2)), source: "企业生效计费协议折后估算" },
  };
}

function asrMeterLine4(id: string, input: MeterIdentity4 & { audioSeconds: number; channels: number; billableAudioSeconds: number; points: number; pointAdjustment?: number }): MeterLine4 {
  const model = catalogModel4(input.model);
  const pointAdjustment = input.pointAdjustment ?? 0;
  return {
    id, ...input, service: "ASR", modelId: model.id,
    usage: { kind: "ASR", audioSeconds: input.audioSeconds, channels: input.channels, billableAudioSeconds: input.billableAudioSeconds },
    pointCharge: {
      ruleCode: model.pointPricing.code,
      chargedPoints: input.points,
      adjustmentPoints: pointAdjustment,
      netPoints: input.points + pointAdjustment,
      source: "平台账本",
      ruleStatus: "已确认",
      aggregateRecalculation: pointAdjustment ? "聚合量不可直接反算" : "已按聚合量核对",
      note: pointAdjustment
        ? `平台按单请求计费后聚合；已包含 ${pointAdjustment.toFixed(2)} 积分的单次最低扣费调整。声道数仅作请求证据，不倍增计费时长。`
        : "已按输入音视频时长与当前公开积分规则核对；声道数仅作请求证据，不倍增计费时长。",
    },
    cnyEstimate: { ruleCode: model.commercialPricing.code, grossAmount: Number((input.points * enterprisePointConversion4.cnyPerPoint).toFixed(2)), adjustmentAmount: Number((pointAdjustment * enterprisePointConversion4.cnyPerPoint).toFixed(2)), netAmount: Number(((input.points + pointAdjustment) * enterprisePointConversion4.cnyPerPoint).toFixed(2)), source: "企业生效计费协议折后估算" },
  };
}

export const meterLines4: MeterLine4[] = [
  ttsMeterLine4("ME4-2608-001", { month: "2026-08", model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "prod-tts", rawCharacters: 1_953_840, billableCharacters: 1_950_000, requests: 34_120, successfulRequests: 34_071, meterEvents: 34_071, ledgerEntries: 34_071, points: 3_900, reconciliationState: "已对账", evidenceRequestId: "req_4_success_flash_001" }),
  ttsMeterLine4("ME4-2608-002", { month: "2026-08", model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "scheduler-tts", rawCharacters: 1_028_920, billableCharacters: 1_025_000, requests: 22_840, successfulRequests: 22_806, meterEvents: 22_806, ledgerEntries: 22_806, points: 2_050, pointAdjustment: 230.6, reconciliationState: "已对账", evidenceRequestId: "req_4_success_flash_002" }),
  ttsMeterLine4("ME4-2608-003", { month: "2026-08", model: "MOSS-TTS-1.5-Flash", user: "李测试", role: "Developer", phone: "18600005678", key: "eval-tts", rawCharacters: 368_410, billableCharacters: 365_000, requests: 10_224, successfulRequests: 9_894, meterEvents: 9_894, ledgerEntries: 9_894, points: 730, pointAdjustment: 259.4, reconciliationState: "已对账", evidenceRequestId: "req_4_success_flash_003" }),
  ttsMeterLine4("ME4-2608-004", { month: "2026-08", model: "MOSS-TTSD-1.0", user: "周运营", role: "Admin", phone: "13800006001", key: "ops-tts", rawCharacters: 273_180, billableCharacters: 270_000, requests: 8_640, successfulRequests: 8_625, meterEvents: 8_625, ledgerEntries: 8_625, points: 540, reconciliationState: "已对账", evidenceRequestId: "req_4_success_ttsd_001" }),
  ttsMeterLine4("ME4-2608-005", { month: "2026-08", model: "MOSS-Voice-Generator-1.0", user: "王开发", role: "Admin", phone: "13900001234", key: "voice-preview", rawCharacters: 132_460, billableCharacters: 130_000, requests: 5_418, successfulRequests: 5_412, meterEvents: 5_412, ledgerEntries: 5_412, points: 260, reconciliationState: "已对账", evidenceRequestId: "req_4_success_voice_001" }),
  ttsMeterLine4("ME4-2608-006", { month: "2026-08", model: "MOSS-TTS-1.0-Pro", user: "孙客服", role: "Developer", phone: "13800006003", key: "service-tts", rawCharacters: 197_320, billableCharacters: 195_000, requests: 4_720, successfulRequests: 4_712, meterEvents: 4_712, ledgerEntries: 4_709, points: 390, reconciliationState: "待对账", evidenceRequestId: "req_4_success_pro_001" }),
  asrMeterLine4("ME4-2608-007", { month: "2026-08", model: "MOSS-Transcribe-Diarize-Pro", user: "赵产品", role: "Developer", phone: "13800006002", key: "product-asr", audioSeconds: 74_118, channels: 2, billableAudioSeconds: 74_118, requests: 7_326, successfulRequests: 7_314, meterEvents: 7_314, ledgerEntries: 7_314, points: 350, reconciliationState: "已对账", evidenceRequestId: "req_4_success_diarize_001" }),
  asrMeterLine4("ME4-2608-008", { month: "2026-08", model: "MOSS-Transcribe-1.0", user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", audioSeconds: 119_077, channels: 1, billableAudioSeconds: 119_077, requests: 6_198, successfulRequests: 6_187, meterEvents: 6_187, ledgerEntries: 6_187, points: 430, reconciliationState: "已对账", evidenceRequestId: "req_4_success_basic_001" }),
  ttsMeterLine4("ME4-2608-009", { month: "2026-08", model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "prod-tts", rawCharacters: 231_870, billableCharacters: 230_000, requests: 4_927, successfulRequests: 4_919, meterEvents: 4_919, ledgerEntries: 4_919, points: 460, reconciliationState: "已对账", evidenceRequestId: "req_4_success_flash_004" }),
  ttsMeterLine4("ME4-2608-010", { month: "2026-08", model: "MOSS-TTSD-1.0", user: "周运营", role: "Admin", phone: "13800006001", key: "ops-tts", rawCharacters: 152_640, billableCharacters: 150_000, requests: 3_846, successfulRequests: 3_839, meterEvents: 3_839, ledgerEntries: 3_839, points: 300, reconciliationState: "已对账", evidenceRequestId: "req_4_success_ttsd_002" }),
  ttsMeterLine4("ME4-2608-011", { month: "2026-08", model: "MOSS-Voice-Generator-1.0", user: "王开发", role: "Admin", phone: "13900001234", key: "voice-preview", rawCharacters: 91_820, billableCharacters: 90_000, requests: 2_955, successfulRequests: 2_952, meterEvents: 2_952, ledgerEntries: 2_952, points: 180, reconciliationState: "已对账", evidenceRequestId: "req_4_success_voice_002" }),
  asrMeterLine4("ME4-2608-012", { month: "2026-08", model: "MOSS-Transcribe-Diarize-Pro", user: "赵产品", role: "Developer", phone: "13800006002", key: "product-asr", audioSeconds: 29_648, channels: 2, billableAudioSeconds: 29_648, requests: 2_109, successfulRequests: 2_105, meterEvents: 2_105, ledgerEntries: 2_105, points: 140, reconciliationState: "已对账", evidenceRequestId: "req_4_success_diarize_002" }),
  asrMeterLine4("ME4-2608-013", { month: "2026-08", model: "MOSS-Transcribe-1.0", user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", audioSeconds: 55_473, channels: 1, billableAudioSeconds: 55_473, requests: 1_640, successfulRequests: 1_637, meterEvents: 1_637, ledgerEntries: 1_637, points: 200.32, reconciliationState: "已对账", evidenceRequestId: "req_4_success_basic_002" }),
  ttsMeterLine4("ME4-2607-001", { month: "2026-07", model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "prod-tts", rawCharacters: 1_612_280, billableCharacters: 1_610_000, requests: 29_206, successfulRequests: 29_171, meterEvents: 29_171, ledgerEntries: 29_171, points: 3_220, reconciliationState: "已对账", evidenceRequestId: "req_4_history_2607_flash_001" }),
  ttsMeterLine4("ME4-2607-002", { month: "2026-07", model: "MOSS-TTS-1.0-Pro", user: "孙客服", role: "Developer", phone: "13800006003", key: "service-tts", rawCharacters: 148_820, billableCharacters: 145_000, requests: 3_840, successfulRequests: 3_832, meterEvents: 3_832, ledgerEntries: 3_832, points: 290, reconciliationState: "已对账", evidenceRequestId: "req_4_history_2607_pro_001" }),
  asrMeterLine4("ME4-2607-003", { month: "2026-07", model: "MOSS-Transcribe-1.0", user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", audioSeconds: 92_410, channels: 1, billableAudioSeconds: 92_410, requests: 5_016, successfulRequests: 5_006, meterEvents: 5_006, ledgerEntries: 5_006, points: 333.7, reconciliationState: "已对账", evidenceRequestId: "req_4_history_2607_basic_001" }),
];

export const billingAccountSnapshot4 = {
  availablePoints: 230_748.98,
  cumulativeUsedPoints: 17_050.31,
  selectedPeriodPoints: 10_420.32,
  selectedPeriodApiRequests: 114_963,
  updatedAt: "2026-09-01 09:20 CST",
  ruleVersion: "模型计费标准（2026-08 快照）",
} as const;

export type Request4 = {
  id: string;
  logicalRequestId: string;
  retryGroupId?: string;
  attemptInGroup: number;
  occurredAt: string;
  displayTime: string;
  ageMinutes: number;
  service: ServiceKind4;
  modelId: string;
  model: string;
  user: string;
  role: Role;
  phone: string;
  key: string;
  requestMode: RequestMode4;
  status: number;
  reason: ReasonCode4;
  detail: string;
  meteredUsageLabel: string;
  latencyMs: number;
  concurrency: number;
  concurrencyLimit: number;
  rpm: number;
  rpmLimit: number;
  meterEventId?: string;
  /** Historical monthly evidence remains addressable even after it leaves the interactive log-retention window. */
  evidenceScope?: "LIVE_REQUEST" | "MONTHLY_SNAPSHOT";
  snapshotMonth?: string;
};

type RequestIdentity4 = Pick<Request4, "user" | "role" | "phone" | "key" | "requestMode">;

const requestIdentitiesByModel4: Record<string, RequestIdentity4[]> = {
  "MOSS-TTS-1.5-Flash": [
    { user: "王开发", role: "Admin", phone: "13900001234", key: "prod-tts", requestMode: "流式" },
    { user: "王开发", role: "Admin", phone: "13900001234", key: "scheduler-tts", requestMode: "异步" },
    { user: "李测试", role: "Developer", phone: "18600005678", key: "eval-tts", requestMode: "同步" },
  ],
  "MOSS-TTSD-1.0": [{ user: "周运营", role: "Admin", phone: "13800006001", key: "ops-tts", requestMode: "流式" }],
  "MOSS-Voice-Generator-1.0": [{ user: "王开发", role: "Admin", phone: "13900001234", key: "voice-preview", requestMode: "同步" }],
  "MOSS-TTS-1.0-Pro": [{ user: "孙客服", role: "Developer", phone: "13800006003", key: "service-tts", requestMode: "流式" }],
  "MOSS-Transcribe-Diarize-Pro": [{ user: "赵产品", role: "Developer", phone: "13800006002", key: "product-asr", requestMode: "异步" }],
  "MOSS-Transcribe-1.0": [{ user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", requestMode: "流式" }],
};

const baseTimestamp4 = Date.parse("2026-09-06T16:00:00+08:00");
const shanghaiTimestamp4 = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const isoAtAge4 = (ageMinutes: number) => new Date(baseTimestamp4 - ageMinutes * 60_000).toISOString();
const displayAtAge4 = (ageMinutes: number) => shanghaiTimestamp4.format(new Date(baseTimestamp4 - ageMinutes * 60_000)).replaceAll("/", "-");

function rejectionRows4(modelName: string, band: string, attempts: number, retryGroups: number, minAge: number, maxAge: number): Request4[] {
  const model = catalogModel4(modelName);
  const identities = requestIdentitiesByModel4[modelName];
  const requestModelSlug = model.id.replace(/[^a-z0-9]+/gi, "_");
  const distributionSeed = [...`${model.id}-${band}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const distributionPower = .82 + distributionSeed % 7 * .07;
  const groupSizes = Array.from({ length: retryGroups }, (_, index) => Math.floor(attempts / retryGroups) + (index < attempts % retryGroups ? 1 : 0));
  let sequence = 0;
  return groupSizes.flatMap((groupSize, groupIndex) => {
    const identity = identities[groupIndex % identities.length];
    const retryGroupId = `retry_4_${requestModelSlug}_${band}_${String(groupIndex + 1).padStart(3, "0")}`;
    const retrySpacingMinutes = 1 + (distributionSeed + groupIndex) % 3;
    const maxRetryOffset = (groupSize - 1) * retrySpacingMinutes;
    const groupProgress = retryGroups <= 1 ? .5 : groupIndex / (retryGroups - 1);
    const temporalProgress = .58 * groupProgress + .42 * groupProgress ** distributionPower;
    const groupCenterAge = minAge + Math.max(0, maxAge - minAge - maxRetryOffset) * temporalProgress;
    return Array.from({ length: groupSize }, (_, attemptIndex) => {
      // Limit failures arrive in retry bursts rather than at perfectly even intervals.
      // Group centers follow a monotone curve; retries within one group stay only minutes apart.
      const ageMinutes = Math.min(maxAge, Math.round(groupCenterAge + attemptIndex * retrySpacingMinutes));
      sequence += 1;
      return {
        id: `req_4_${requestModelSlug}_${band}_${String(sequence).padStart(4, "0")}`,
        logicalRequestId: retryGroupId,
        retryGroupId,
        attemptInGroup: attemptIndex + 1,
        occurredAt: isoAtAge4(ageMinutes),
        displayTime: displayAtAge4(ageMinutes),
        ageMinutes,
        service: model.service,
        modelId: model.id,
        model: model.name,
        ...identity,
        status: 429,
        reason: "CONCURRENCY_LIMIT_EXCEEDED" as const,
        detail: `单模型并发已达 ${model.concurrencyLimit} / ${model.concurrencyLimit}，请求未进入推理；当时 RPM ${Math.max(1, model.currentRpm - sequence % 17)} / ${model.rpmLimit}`,
        meteredUsageLabel: "未计费",
        latencyMs: 12 + sequence % 9,
        concurrency: model.concurrencyLimit,
        concurrencyLimit: model.concurrencyLimit,
        rpm: Math.max(1, Math.min(model.rpmLimit - 1, model.currentRpm - sequence % 17)),
        rpmLimit: model.rpmLimit,
        evidenceScope: "LIVE_REQUEST" as const,
      };
    });
  });
}

type SeedRequest4 = Omit<Request4, "modelId" | "service" | "occurredAt" | "displayTime">;

function seedRequest4(input: SeedRequest4): Request4 {
  const model = catalogModel4(input.model);
  return {
    evidenceScope: "LIVE_REQUEST",
    ...input,
    modelId: model.id,
    service: model.service,
    occurredAt: isoAtAge4(input.ageMinutes),
    displayTime: displayAtAge4(input.ageMinutes),
  };
}

function successfulRequestRows4(modelName: string, band: string, count: number, minAge: number, maxAge: number): Request4[] {
  const model = catalogModel4(modelName);
  const identities = requestIdentitiesByModel4[modelName];
  const modelSlug = model.id.replace(/[^a-z0-9]+/gi, "_");
  const seed = [...`${model.id}-${band}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, index) => {
    const progress = count <= 1 ? 0 : index / (count - 1);
    // Deterministic traffic waves keep demo buckets realistic without making repeated visits unstable.
    const temporalProgress = Math.min(1, Math.max(0,
      progress
      + Math.sin(progress * Math.PI * 10 + seed * .17) * .021
      + Math.sin(progress * Math.PI * 24 + seed * .07) * .008,
    ));
    const ageMinutes = Math.round(minAge + (maxAge - minAge) * temporalProgress);
    const flashSelector = index % 20;
    const identityIndex = modelName === "MOSS-TTS-1.5-Flash"
      ? flashSelector < 12 ? 0 : flashSelector < 17 ? 1 : 2
      : index % identities.length;
    const identity = identities[identityIndex];
    const wave = (Math.sin(index * 1.71 + seed * .13) + 1) / 2;
    const concurrency = Math.max(1, Math.min(model.concurrencyLimit - 1, Math.round(model.concurrencyLimit * (.18 + wave * .7))));
    const rpm = Math.max(1, Math.min(model.rpmLimit - 1, Math.round(model.rpmLimit * (.22 + ((index * 37 + seed) % 63) / 100))));
    const latencyMs = model.service === "TTS" ? 340 + (index * 47 + seed) % 940 : 260 + (index * 41 + seed) % 780;
    const sequence = String(index + 1).padStart(5, "0");
    return {
      id: `req_4_${modelSlug}_${band}_ok_${sequence}`,
      logicalRequestId: `call_4_${modelSlug}_${band}_${sequence}`,
      attemptInGroup: 1,
      occurredAt: isoAtAge4(ageMinutes),
      displayTime: displayAtAge4(ageMinutes),
      ageMinutes,
      service: model.service,
      modelId: model.id,
      model: model.name,
      ...identity,
      status: 200,
      reason: "SUCCESS" as const,
      detail: model.service === "TTS" ? "语音生成完成并写入计量事件" : "语音转写完成并写入计量事件",
      meteredUsageLabel: model.service === "TTS" ? `${420 + (index * 29 + seed) % 3_600} 字符` : `${35 + (index * 11 + seed) % 420} 秒`,
      latencyMs,
      concurrency,
      concurrencyLimit: model.concurrencyLimit,
      rpm,
      rpmLimit: model.rpmLimit,
      meterEventId: `ME4-LIVE-${modelSlug}-${band}-${sequence}`,
      evidenceScope: "LIVE_REQUEST" as const,
    };
  });
}

const requestSeeds4: Request4[] = [
  seedRequest4({ id: "req_4_success_flash_001", logicalRequestId: "call_4_flash_001", attemptInGroup: 1, ageMinutes: 18, model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "prod-tts", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "合成完成并写入计量事件", meteredUsageLabel: "1,842 字符", latencyMs: 486, concurrency: 76, concurrencyLimit: 80, rpm: 480, rpmLimit: 500, meterEventId: "ME4-2608-001" }),
  seedRequest4({ id: "req_4_success_flash_002", logicalRequestId: "call_4_flash_002", attemptInGroup: 1, ageMinutes: 42, model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "scheduler-tts", requestMode: "异步", status: 200, reason: "SUCCESS", detail: "异步合成完成并写入计量事件", meteredUsageLabel: "3,106 字符", latencyMs: 632, concurrency: 72, concurrencyLimit: 80, rpm: 461, rpmLimit: 500, meterEventId: "ME4-2608-002" }),
  seedRequest4({ id: "req_4_success_flash_003", logicalRequestId: "call_4_flash_003", attemptInGroup: 1, ageMinutes: 87, model: "MOSS-TTS-1.5-Flash", user: "李测试", role: "Developer", phone: "18600005678", key: "eval-tts", requestMode: "同步", status: 200, reason: "SUCCESS", detail: "合成完成并写入计量事件", meteredUsageLabel: "920 字符", latencyMs: 774, concurrency: 31, concurrencyLimit: 80, rpm: 118, rpmLimit: 500, meterEventId: "ME4-2608-003" }),
  seedRequest4({ id: "req_4_success_flash_004", logicalRequestId: "call_4_flash_004", attemptInGroup: 1, ageMinutes: 132, model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "prod-tts", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "合成完成并写入计量事件", meteredUsageLabel: "2,204 字符", latencyMs: 521, concurrency: 68, concurrencyLimit: 80, rpm: 437, rpmLimit: 500, meterEventId: "ME4-2608-009" }),
  seedRequest4({ id: "req_4_rpm_flash_001", logicalRequestId: "call_4_rpm_flash_001", attemptInGroup: 1, ageMinutes: 34, model: "MOSS-TTS-1.5-Flash", user: "李测试", role: "Developer", phone: "18600005678", key: "eval-tts", requestMode: "同步", status: 429, reason: "RPM_LIMIT_EXCEEDED", detail: "RPM 达到 500 / 500；并发水位 63 / 80，未触发并发上限", meteredUsageLabel: "未计费", latencyMs: 12, concurrency: 63, concurrencyLimit: 80, rpm: 500, rpmLimit: 500 }),
  seedRequest4({ id: "req_4_queue_flash_001", logicalRequestId: "call_4_queue_flash_001", attemptInGroup: 1, ageMinutes: 49, model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "scheduler-tts", requestMode: "异步", status: 429, reason: "QUEUE_LIMIT_EXCEEDED", detail: "待处理队列已达 20 / 20；该层级与并发令牌分开判定", meteredUsageLabel: "未计费", latencyMs: 18, concurrency: 71, concurrencyLimit: 80, rpm: 443, rpmLimit: 500 }),
  seedRequest4({ id: "req_4_upstream_capacity_ttsd_001", logicalRequestId: "call_4_upstream_capacity_ttsd_001", attemptInGroup: 1, ageMinutes: 116, model: "MOSS-TTSD-1.0", user: "周运营", role: "Admin", phone: "13800006001", key: "ops-tts", requestMode: "流式", status: 429, reason: "UPSTREAM_CAPACITY_THROTTLED", detail: "上游服务容量保护返回 429；企业并发与 RPM 均未到上限", meteredUsageLabel: "未计费", latencyMs: 31, concurrency: 42, concurrencyLimit: 60, rpm: 226, rpmLimit: 300 }),
  seedRequest4({ id: "req_4_unknown_flash_001", logicalRequestId: "call_4_unknown_flash_001", attemptInGroup: 1, ageMinutes: 213, model: "MOSS-TTS-1.5-Flash", user: "李测试", role: "Developer", phone: "18600005678", key: "eval-tts", requestMode: "同步", status: 429, reason: "UNKNOWN", detail: "上游返回 429，网关未获得可判定限流层级的标准原因码，责任待确认", meteredUsageLabel: "未计费", latencyMs: 27, concurrency: 58, concurrencyLimit: 80, rpm: 362, rpmLimit: 500 }),
  seedRequest4({ id: "req_4_invalid_basic_001", logicalRequestId: "call_4_invalid_basic_001", attemptInGroup: 1, ageMinutes: 304, model: "MOSS-Transcribe-1.0", user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", requestMode: "流式", status: 400, reason: "INVALID_ARGUMENT", detail: "audio_format 与实际音频编码不一致，请求在进入模型前校验失败", meteredUsageLabel: "未计费", latencyMs: 9, concurrency: 8, concurrencyLimit: 30, rpm: 24, rpmLimit: 100 }),
  seedRequest4({ id: "req_4_upstream_timeout_diarize_001", logicalRequestId: "call_4_upstream_timeout_diarize_001", attemptInGroup: 1, ageMinutes: 462, model: "MOSS-Transcribe-Diarize-Pro", user: "赵产品", role: "Developer", phone: "13800006002", key: "product-asr", requestMode: "异步", status: 504, reason: "UPSTREAM_TIMEOUT", detail: "上游转写任务超时，已记录为线上稳定性异常样本并关联观测窗口", meteredUsageLabel: "未计费", latencyMs: 30_000, concurrency: 19, concurrencyLimit: 50, rpm: 37, rpmLimit: 120 }),
  seedRequest4({ id: "req_4_internal_voice_001", logicalRequestId: "call_4_internal_voice_001", attemptInGroup: 1, ageMinutes: 728, model: "MOSS-Voice-Generator-1.0", user: "王开发", role: "Admin", phone: "13900001234", key: "voice-preview", requestMode: "同步", status: 500, reason: "INTERNAL_ERROR", detail: "服务内部解码异常，未产生有效音频与计量事件", meteredUsageLabel: "未计费", latencyMs: 1_842, concurrency: 10, concurrencyLimit: 40, rpm: 84, rpmLimit: 200 }),
  seedRequest4({ id: "req_4_success_ttsd_001", logicalRequestId: "call_4_ttsd_001", attemptInGroup: 1, ageMinutes: 26, model: "MOSS-TTSD-1.0", user: "周运营", role: "Admin", phone: "13800006001", key: "ops-tts", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "合成完成并写入计量事件", meteredUsageLabel: "1,126 字符", latencyMs: 612, concurrency: 55, concurrencyLimit: 60, rpm: 280, rpmLimit: 300, meterEventId: "ME4-2608-004" }),
  seedRequest4({ id: "req_4_success_ttsd_002", logicalRequestId: "call_4_ttsd_002", attemptInGroup: 1, ageMinutes: 245, model: "MOSS-TTSD-1.0", user: "周运营", role: "Admin", phone: "13800006001", key: "ops-tts", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "合成完成并写入计量事件", meteredUsageLabel: "886 字符", latencyMs: 584, concurrency: 48, concurrencyLimit: 60, rpm: 246, rpmLimit: 300, meterEventId: "ME4-2608-010" }),
  seedRequest4({ id: "req_4_success_voice_001", logicalRequestId: "call_4_voice_001", attemptInGroup: 1, ageMinutes: 73, model: "MOSS-Voice-Generator-1.0", user: "王开发", role: "Admin", phone: "13900001234", key: "voice-preview", requestMode: "同步", status: 200, reason: "SUCCESS", detail: "音色设计完成并写入计量事件", meteredUsageLabel: "680 字符", latencyMs: 728, concurrency: 12, concurrencyLimit: 40, rpm: 96, rpmLimit: 200, meterEventId: "ME4-2608-005" }),
  seedRequest4({ id: "req_4_success_voice_002", logicalRequestId: "call_4_voice_002", attemptInGroup: 1, ageMinutes: 356, model: "MOSS-Voice-Generator-1.0", user: "王开发", role: "Admin", phone: "13900001234", key: "voice-preview", requestMode: "同步", status: 200, reason: "SUCCESS", detail: "音色设计完成并写入计量事件", meteredUsageLabel: "556 字符", latencyMs: 704, concurrency: 9, concurrencyLimit: 40, rpm: 78, rpmLimit: 200, meterEventId: "ME4-2608-011" }),
  seedRequest4({ id: "req_4_success_pro_001", logicalRequestId: "call_4_pro_001", attemptInGroup: 1, ageMinutes: 118, model: "MOSS-TTS-1.0-Pro", user: "孙客服", role: "Developer", phone: "13800006003", key: "service-tts", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "合成完成并写入计量事件", meteredUsageLabel: "2,818 字符", latencyMs: 816, concurrency: 9, concurrencyLimit: 30, rpm: 72, rpmLimit: 200, meterEventId: "ME4-2608-006" }),
  seedRequest4({ id: "req_4_success_diarize_001", logicalRequestId: "call_4_diarize_001", attemptInGroup: 1, ageMinutes: 51, model: "MOSS-Transcribe-Diarize-Pro", user: "赵产品", role: "Developer", phone: "13800006002", key: "product-asr", requestMode: "异步", status: 200, reason: "SUCCESS", detail: "说话人分离转写完成并写入计量事件", meteredUsageLabel: "183.2 秒 × 2 声道", latencyMs: 842, concurrency: 22, concurrencyLimit: 50, rpm: 41, rpmLimit: 120, meterEventId: "ME4-2608-007" }),
  seedRequest4({ id: "req_4_success_diarize_002", logicalRequestId: "call_4_diarize_002", attemptInGroup: 1, ageMinutes: 424, model: "MOSS-Transcribe-Diarize-Pro", user: "赵产品", role: "Developer", phone: "13800006002", key: "product-asr", requestMode: "异步", status: 200, reason: "SUCCESS", detail: "说话人分离转写完成并写入计量事件", meteredUsageLabel: "245.4 秒 × 2 声道", latencyMs: 916, concurrency: 26, concurrencyLimit: 50, rpm: 47, rpmLimit: 120, meterEventId: "ME4-2608-012" }),
  seedRequest4({ id: "req_4_success_basic_001", logicalRequestId: "call_4_basic_001", attemptInGroup: 1, ageMinutes: 62, model: "MOSS-Transcribe-1.0", user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "实时转写完成并写入计量事件", meteredUsageLabel: "96.8 秒 × 1 声道", latencyMs: 674, concurrency: 14, concurrencyLimit: 30, rpm: 36, rpmLimit: 100, meterEventId: "ME4-2608-008" }),
  seedRequest4({ id: "req_4_success_basic_002", logicalRequestId: "call_4_basic_002", attemptInGroup: 1, ageMinutes: 286, model: "MOSS-Transcribe-1.0", user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "实时转写完成并写入计量事件", meteredUsageLabel: "74.1 秒 × 1 声道", latencyMs: 638, concurrency: 11, concurrencyLimit: 30, rpm: 31, rpmLimit: 100, meterEventId: "ME4-2608-013" }),
  seedRequest4({ id: "req_4_history_2607_flash_001", logicalRequestId: "snapshot_4_2607_flash_001", attemptInGroup: 1, ageMinutes: 53_628, model: "MOSS-TTS-1.5-Flash", user: "王开发", role: "Admin", phone: "13900001234", key: "prod-tts", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "2026 年 7 月完整月度快照中的历史请求证据；已超出当前 30 天交互日志保留窗口", meteredUsageLabel: "1,604 字符", latencyMs: 512, concurrency: 61, concurrencyLimit: 80, rpm: 402, rpmLimit: 500, meterEventId: "ME4-2607-001", evidenceScope: "MONTHLY_SNAPSHOT", snapshotMonth: "2026-07" }),
  seedRequest4({ id: "req_4_history_2607_pro_001", logicalRequestId: "snapshot_4_2607_pro_001", attemptInGroup: 1, ageMinutes: 57_317, model: "MOSS-TTS-1.0-Pro", user: "孙客服", role: "Developer", phone: "13800006003", key: "service-tts", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "2026 年 7 月完整月度快照中的历史请求证据；已超出当前 30 天交互日志保留窗口", meteredUsageLabel: "2,406 字符", latencyMs: 791, concurrency: 7, concurrencyLimit: 30, rpm: 61, rpmLimit: 200, meterEventId: "ME4-2607-002", evidenceScope: "MONTHLY_SNAPSHOT", snapshotMonth: "2026-07" }),
  seedRequest4({ id: "req_4_history_2607_basic_001", logicalRequestId: "snapshot_4_2607_basic_001", attemptInGroup: 1, ageMinutes: 59_431, model: "MOSS-Transcribe-1.0", user: "企业 Owner", role: "Owner", phone: "13800005678", key: "owner-asr", requestMode: "流式", status: 200, reason: "SUCCESS", detail: "2026 年 7 月完整月度快照中的历史请求证据；已超出当前 30 天交互日志保留窗口", meteredUsageLabel: "83.5 秒 × 1 声道", latencyMs: 612, concurrency: 12, concurrencyLimit: 30, rpm: 32, rpmLimit: 100, meterEventId: "ME4-2607-003", evidenceScope: "MONTHLY_SNAPSHOT", snapshotMonth: "2026-07" }),
];

const concurrencyRejectionRows4 = [
  ...rejectionRows4("MOSS-TTS-1.5-Flash", "1h", 6, 3, 4, 58),
  ...rejectionRows4("MOSS-TTS-1.5-Flash", "24h", 32, 11, 72, 1_410),
  ...rejectionRows4("MOSS-TTS-1.5-Flash", "7d", 64, 27, 1_500, 9_900),
  ...rejectionRows4("MOSS-TTS-1.5-Flash", "30d", 215, 92, 10_200, 42_900),
  ...rejectionRows4("MOSS-TTSD-1.0", "1h", 2, 1, 14, 47),
  ...rejectionRows4("MOSS-TTSD-1.0", "24h", 10, 4, 88, 1_380),
  ...rejectionRows4("MOSS-TTSD-1.0", "7d", 24, 10, 1_610, 9_720),
  ...rejectionRows4("MOSS-TTSD-1.0", "30d", 75, 31, 10_010, 42_640),
  ...rejectionRows4("MOSS-TTS-1.0-Pro", "7d", 2, 1, 4_320, 6_540),
  ...rejectionRows4("MOSS-TTS-1.0-Pro", "30d", 7, 3, 13_400, 38_200),
  ...rejectionRows4("MOSS-Transcribe-Diarize-Pro", "7d", 1, 1, 6_820, 6_820),
  ...rejectionRows4("MOSS-Transcribe-Diarize-Pro", "30d", 4, 2, 12_800, 36_400),
  ...rejectionRows4("MOSS-Transcribe-1.0", "1h", 1, 1, 37, 37),
  ...rejectionRows4("MOSS-Transcribe-1.0", "24h", 2, 1, 220, 1_160),
  ...rejectionRows4("MOSS-Transcribe-1.0", "7d", 7, 3, 2_400, 9_100),
  ...rejectionRows4("MOSS-Transcribe-1.0", "30d", 22, 9, 11_500, 41_900),
];

const successfulRequestBands4: [string, string, number, number, number][] = [
  ["MOSS-TTS-1.5-Flash", "1h", 80, 1, 59], ["MOSS-TTS-1.5-Flash", "24h", 800, 60, 1_435], ["MOSS-TTS-1.5-Flash", "7d", 1_400, 1_440, 10_070], ["MOSS-TTS-1.5-Flash", "30d", 2_700, 10_080, 43_180],
  ["MOSS-TTSD-1.0", "1h", 50, 1, 59], ["MOSS-TTSD-1.0", "24h", 450, 60, 1_435], ["MOSS-TTSD-1.0", "7d", 800, 1_440, 10_070], ["MOSS-TTSD-1.0", "30d", 1_600, 10_080, 43_180],
  ["MOSS-Voice-Generator-1.0", "1h", 30, 1, 59], ["MOSS-Voice-Generator-1.0", "24h", 280, 60, 1_435], ["MOSS-Voice-Generator-1.0", "7d", 500, 1_440, 10_070], ["MOSS-Voice-Generator-1.0", "30d", 1_000, 10_080, 43_180],
  ["MOSS-TTS-1.0-Pro", "1h", 30, 1, 59], ["MOSS-TTS-1.0-Pro", "24h", 300, 60, 1_435], ["MOSS-TTS-1.0-Pro", "7d", 600, 1_440, 10_070], ["MOSS-TTS-1.0-Pro", "30d", 1_100, 10_080, 43_180],
  ["MOSS-Transcribe-Diarize-Pro", "1h", 25, 1, 59], ["MOSS-Transcribe-Diarize-Pro", "24h", 250, 60, 1_435], ["MOSS-Transcribe-Diarize-Pro", "7d", 500, 1_440, 10_070], ["MOSS-Transcribe-Diarize-Pro", "30d", 1_000, 10_080, 43_180],
  ["MOSS-Transcribe-1.0", "1h", 25, 1, 59], ["MOSS-Transcribe-1.0", "24h", 220, 60, 1_435], ["MOSS-Transcribe-1.0", "7d", 400, 1_440, 10_070], ["MOSS-Transcribe-1.0", "30d", 800, 10_080, 43_180],
];

const mockSuccessRows4 = successfulRequestBands4.flatMap(([model, band, count, minAge, maxAge]) => successfulRequestRows4(model, band, count, minAge, maxAge));

/** Request rows contain every demo concurrency-rejected attempt, not one row per retry group. */
export const requests4: Request4[] = [...requestSeeds4, ...mockSuccessRows4, ...concurrencyRejectionRows4].sort((a, b) => a.ageMinutes - b.ageMinutes);

export type ConcurrencyTrendPoint4 = { time: string; average: number; peak: number; limit: number; rejected: number; rpm: number; rpmLimit: number };
export type ConcurrencyModel4 = {
  modelId: string;
  model: string;
  service: ServiceKind4;
  currentConcurrency: number;
  concurrencyLimit: number;
  currentRpm: number;
  rpmLimit: number;
  peakAtByWindow: Record<TrendWindow4, string>;
  trendByWindow: Record<TrendWindow4, ConcurrencyTrendPoint4[]>;
};

const dayLabels4 = Array.from({ length: 30 }, (_, index) => {
  if (index === 29) return "今天";
  const date = new Date(Date.UTC(2026, 7, 8 + index));
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
});

export const trendAxisLabels4: Record<TrendWindow4, string[]> = {
  "1h": ["15:05", "15:10", "15:15", "15:20", "15:25", "15:30", "15:35", "15:40", "15:45", "15:50", "15:55", "现在"],
  "24h": ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "现在"],
  "7d": ["08-31 00:00", "08-31 06:00", "08-31 12:00", "08-31 18:00", "09-01 00:00", "09-01 06:00", "09-01 12:00", "09-01 18:00", "09-02 00:00", "09-02 06:00", "09-02 12:00", "09-02 18:00", "09-03 00:00", "09-03 06:00", "09-03 12:00", "09-03 18:00", "09-04 00:00", "09-04 06:00", "09-04 12:00", "09-04 18:00", "09-05 00:00", "09-05 06:00", "09-05 12:00", "09-05 18:00", "09-06 00:00", "09-06 06:00", "09-06 12:00", "现在"],
  "30d": dayLabels4,
};

export const trendBucketLabels4: Record<TrendWindow4, string> = {
  "1h": "每 5 分钟统计",
  "24h": "每小时统计",
  "7d": "每 6 小时统计",
  "30d": "按天统计",
};

function trendForModel4(model: ModelCatalogItem4, windowFilter: TrendWindow4): ConcurrencyTrendPoint4[] {
  const labels = trendAxisLabels4[windowFilter];
  const seed = [...model.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const peakIndex = Math.round((labels.length - 1) * (.42 + seed % 23 / 100));
  return labels.map((time, index) => {
    const position = index / Math.max(1, labels.length - 1);
    const wave = .63
      + .17 * Math.sin(position * Math.PI * 2.4 - .8 + seed * .03)
      + .12 * Math.cos(index * 1.13 + seed * .09);
    const shapedPeak = Math.round(model.concurrencyLimit * Math.min(.97, Math.max(.22, wave)));
    const reachesLimit = index === peakIndex && model.currentConcurrency / Math.max(1, model.concurrencyLimit) >= .8;
    const peak = index === labels.length - 1
      ? model.currentConcurrency
      : reachesLimit ? model.concurrencyLimit : Math.max(1, shapedPeak);
    const rpm = index === labels.length - 1
      ? model.currentRpm
      : Math.min(model.rpmLimit, Math.max(1, Math.round(model.rpmLimit * Math.min(.97, Math.max(.16, wave + .04 * Math.sin(index * .73))))));
    const average = Math.max(0, Math.round(peak * (.64 + .08 * Math.sin(index * .83 + seed))));
    return { time, average, peak, limit: model.concurrencyLimit, rejected: 0, rpm, rpmLimit: model.rpmLimit };
  });
}

export const concurrencyModels4: ConcurrencyModel4[] = modelCatalog4.map(model => {
  const trendByWindow = {
    "1h": trendForModel4(model, "1h"),
    "24h": trendForModel4(model, "24h"),
    "7d": trendForModel4(model, "7d"),
    "30d": trendForModel4(model, "30d"),
  };
  const peakAt = (windowFilter: TrendWindow4) => {
    const points = trendByWindow[windowFilter];
    return points.reduce((best, point) => point.peak > best.peak ? point : best, points[0]).time;
  };
  return {
    modelId: model.id,
    model: model.name,
    service: model.service,
    currentConcurrency: model.currentConcurrency,
    concurrencyLimit: model.concurrencyLimit,
    currentRpm: model.currentRpm,
    rpmLimit: model.rpmLimit,
    peakAtByWindow: { "1h": peakAt("1h"), "24h": peakAt("24h"), "7d": peakAt("7d"), "30d": peakAt("30d") },
    trendByWindow,
  };
});

export type ConcurrencyAttributionFixture4 = {
  model: string;
  user: string;
  key: string;
  currentConcurrency: number;
  currentRpm: number;
  trendShareByWindow: Record<TrendWindow4, number>;
  source: "并发遥测归因";
};

/**
 * Explicit user / key attribution from the concurrency telemetry fixture.
 * These values intentionally do not derive from billing-request distribution: request volume and
 * simultaneously occupied lanes are different measurements and must never be used as proxies.
 */
export const concurrencyAttributionFixtures4: ConcurrencyAttributionFixture4[] = [
  { model: "MOSS-TTS-1.5-Flash", user: "王开发", key: "prod-tts", currentConcurrency: 44, currentRpm: 276, trendShareByWindow: { "1h": .58, "24h": .6, "7d": .61, "30d": .59 }, source: "并发遥测归因" },
  { model: "MOSS-TTS-1.5-Flash", user: "王开发", key: "scheduler-tts", currentConcurrency: 23, currentRpm: 144, trendShareByWindow: { "1h": .29, "24h": .27, "7d": .28, "30d": .3 }, source: "并发遥测归因" },
  { model: "MOSS-TTS-1.5-Flash", user: "李测试", key: "eval-tts", currentConcurrency: 9, currentRpm: 60, trendShareByWindow: { "1h": .13, "24h": .13, "7d": .11, "30d": .11 }, source: "并发遥测归因" },
  { model: "MOSS-TTSD-1.0", user: "周运营", key: "ops-tts", currentConcurrency: 55, currentRpm: 280, trendShareByWindow: { "1h": 1, "24h": 1, "7d": 1, "30d": 1 }, source: "并发遥测归因" },
  { model: "MOSS-Voice-Generator-1.0", user: "王开发", key: "voice-preview", currentConcurrency: 12, currentRpm: 96, trendShareByWindow: { "1h": 1, "24h": 1, "7d": 1, "30d": 1 }, source: "并发遥测归因" },
  { model: "MOSS-TTS-1.0-Pro", user: "孙客服", key: "service-tts", currentConcurrency: 9, currentRpm: 72, trendShareByWindow: { "1h": 1, "24h": 1, "7d": 1, "30d": 1 }, source: "并发遥测归因" },
  { model: "MOSS-Transcribe-Diarize-Pro", user: "赵产品", key: "product-asr", currentConcurrency: 22, currentRpm: 41, trendShareByWindow: { "1h": 1, "24h": 1, "7d": 1, "30d": 1 }, source: "并发遥测归因" },
  { model: "MOSS-Transcribe-1.0", user: "企业 Owner", key: "owner-asr", currentConcurrency: 14, currentRpm: 36, trendShareByWindow: { "1h": 1, "24h": 1, "7d": 1, "30d": 1 }, source: "并发遥测归因" },
];

export function getConcurrencyAttribution4(modelName: string, windowFilter: TrendWindow4, userFilter = "all", keyFilter = "all") {
  const candidates = concurrencyAttributionFixtures4.filter(fixture => fixture.model === modelName);
  const matchedFixtures = candidates.filter(fixture => (userFilter === "all" || fixture.user === userFilter)
    && (keyFilter === "all" || fixture.key === keyFilter));
  const share = Math.min(1, matchedFixtures.reduce((sum, fixture) => sum + fixture.trendShareByWindow[windowFilter], 0));
  return {
    source: "并发遥测归因" as const,
    hasMatch: matchedFixtures.length > 0,
    share,
    currentConcurrency: matchedFixtures.reduce((sum, fixture) => sum + fixture.currentConcurrency, 0),
    currentRpm: matchedFixtures.reduce((sum, fixture) => sum + fixture.currentRpm, 0),
    matchedFixtures,
  };
}

export function concurrencyAttributionShare4(modelName: string, windowFilter: TrendWindow4, userFilter = "all", keyFilter = "all") {
  return getConcurrencyAttribution4(modelName, windowFilter, userFilter, keyFilter).share;
}

export type OnlineOperationsAttributionFixture4 = {
  model: string;
  user: string;
  key: string;
  requestShare: number;
  successRateDeltaPct: number;
  latencyScale: number;
  source: "请求运营聚合";
};

/**
 * Request-volume attribution is intentionally independent from concurrency telemetry. A key can
 * generate many short requests without occupying the same share of simultaneous model lanes.
 */
export const onlineOperationsAttributionFixtures4: OnlineOperationsAttributionFixture4[] = [
  { model: "MOSS-TTS-1.5-Flash", user: "王开发", key: "prod-tts", requestShare: .61, successRateDeltaPct: .018, latencyScale: .96, source: "请求运营聚合" },
  { model: "MOSS-TTS-1.5-Flash", user: "王开发", key: "scheduler-tts", requestShare: .24, successRateDeltaPct: -.024, latencyScale: 1.13, source: "请求运营聚合" },
  { model: "MOSS-TTS-1.5-Flash", user: "李测试", key: "eval-tts", requestShare: .15, successRateDeltaPct: -.061, latencyScale: 1.06, source: "请求运营聚合" },
  { model: "MOSS-TTSD-1.0", user: "周运营", key: "ops-tts", requestShare: 1, successRateDeltaPct: 0, latencyScale: 1, source: "请求运营聚合" },
  { model: "MOSS-Voice-Generator-1.0", user: "王开发", key: "voice-preview", requestShare: 1, successRateDeltaPct: 0, latencyScale: 1, source: "请求运营聚合" },
  { model: "MOSS-TTS-1.0-Pro", user: "孙客服", key: "service-tts", requestShare: 1, successRateDeltaPct: 0, latencyScale: 1, source: "请求运营聚合" },
  { model: "MOSS-Transcribe-Diarize-Pro", user: "赵产品", key: "product-asr", requestShare: 1, successRateDeltaPct: 0, latencyScale: 1, source: "请求运营聚合" },
  { model: "MOSS-Transcribe-1.0", user: "企业 Owner", key: "owner-asr", requestShare: 1, successRateDeltaPct: 0, latencyScale: 1, source: "请求运营聚合" },
];

export function getOnlineOperationsAttribution4(modelName: string, userFilter = "all", keyFilter = "all") {
  const matchedFixtures = onlineOperationsAttributionFixtures4.filter(fixture => fixture.model === modelName
    && (userFilter === "all" || fixture.user === userFilter)
    && (keyFilter === "all" || fixture.key === keyFilter));
  const requestShare = Math.min(1, matchedFixtures.reduce((sum, fixture) => sum + fixture.requestShare, 0));
  const weighted = (pick: (fixture: OnlineOperationsAttributionFixture4) => number, fallback: number) => requestShare
    ? matchedFixtures.reduce((sum, fixture) => sum + pick(fixture) * fixture.requestShare, 0) / requestShare
    : fallback;
  return {
    source: "请求运营聚合" as const,
    hasMatch: matchedFixtures.length > 0,
    requestShare,
    successRateDeltaPct: weighted(fixture => fixture.successRateDeltaPct, 0),
    latencyScale: weighted(fixture => fixture.latencyScale, 1),
    matchedFixtures,
  };
}

export type QualityMetric4 = { label: string; value: string; tone?: Tone };
export type QualityModel4 = {
  modelId: string;
  model: string;
  service: ServiceKind4;
  contract: {
    applicable: boolean;
    monthlyAvailabilityReferencePct: number | null;
    availabilityDefinition: string | null;
    ordinarySupportResponseMinutes: number | null;
    responseMilestones: { label: string; referenceMinutes: number }[];
    exclusions: string[];
    remedy: string | null;
    source: string | null;
    note: string;
  };
  online: {
    sampleCount: number;
    successRatePct: number;
    source: "模型网关请求聚合 + 服务探针";
    updatedAt: string;
    metricRuleVersion: string;
    availabilityPctByWindow: Record<TrendWindow4, number>;
    modeShare: Record<RequestMode4, number>;
    streamingMetric: { label: string; value: string };
    meanMs: number;
    p50Ms: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
    clientErrorCount: number;
    serviceErrorCount: number;
    timeoutCount: number;
    voiceMetrics: QualityMetric4[];
  };
  offline: {
    status: "已评测" | "待评测";
    batchId: string;
    updatedAt: string;
    datasetVersion: string;
    sampleCount: number;
    meta: string;
    thresholdBasis: "产品评测阈值";
    metrics: { label: string; value: string; target: string; result: "通过" | "观察" }[];
  };
  capacity: {
    concurrency: { current: number; limit: number; peak24h: number; rejectedAttempts24h: number; retryGroups24h: number };
    rpm: { current: number; limit: number; peak24h: number };
    maxPending: number;
    burst: number;
    modelRpdLimit: number;
  };
};

type QualitySeed4 = {
  online: Omit<QualityModel4["online"], "source" | "updatedAt" | "metricRuleVersion" | "availabilityPctByWindow" | "modeShare" | "streamingMetric">;
  offline: Omit<QualityModel4["offline"], "thresholdBasis">;
};

const onlineAvailabilityByModel4: Record<string, Record<TrendWindow4, number>> = {
  "MOSS-TTS-1.5-Flash": { "1h": 100, "24h": 99.972, "7d": 99.958, "30d": 99.941 },
  "MOSS-TTSD-1.0": { "1h": 99.98, "24h": 99.962, "7d": 99.944, "30d": 99.918 },
  "MOSS-Voice-Generator-1.0": { "1h": 99.97, "24h": 99.934, "7d": 99.912, "30d": 99.884 },
  "MOSS-TTS-1.0-Pro": { "1h": 100, "24h": 99.976, "7d": 99.961, "30d": 99.948 },
  "MOSS-Transcribe-Diarize-Pro": { "1h": 99.99, "24h": 99.948, "7d": 99.923, "30d": 99.901 },
  "MOSS-Transcribe-1.0": { "1h": 99.96, "24h": 99.921, "7d": 99.887, "30d": 99.862 },
};

const onlineModeShareByModel4: Record<string, Record<RequestMode4, number>> = {
  "MOSS-TTS-1.5-Flash": { "同步": .25, "流式": .6, "异步": .15 },
  "MOSS-TTSD-1.0": { "同步": .1, "流式": .7, "异步": .2 },
  "MOSS-Voice-Generator-1.0": { "同步": .75, "流式": .15, "异步": .1 },
  "MOSS-TTS-1.0-Pro": { "同步": .2, "流式": .65, "异步": .15 },
  "MOSS-Transcribe-Diarize-Pro": { "同步": .05, "流式": .15, "异步": .8 },
  "MOSS-Transcribe-1.0": { "同步": .15, "流式": .7, "异步": .15 },
};

const onlineStreamingMetricByModel4: Record<string, { label: string; value: string }> = {
  "MOSS-TTS-1.5-Flash": { label: "首包 P95", value: "412 ms" },
  "MOSS-TTSD-1.0": { label: "首包 P95", value: "486 ms" },
  "MOSS-Voice-Generator-1.0": { label: "首包 P95", value: "604 ms" },
  "MOSS-TTS-1.0-Pro": { label: "首包 P95", value: "438 ms" },
  "MOSS-Transcribe-Diarize-Pro": { label: "中间结果 P95", value: "286 ms" },
  "MOSS-Transcribe-1.0": { label: "中间结果 P95", value: "244 ms" },
};

const qualitySeed4: Record<string, QualitySeed4> = {
  "MOSS-TTS-1.5-Flash": { online: { sampleCount: 748_442, successRatePct: 99.82, meanMs: 534, p50Ms: 486, p90Ms: 728, p95Ms: 910, p99Ms: 1_680, clientErrorCount: 892, serviceErrorCount: 311, timeoutCount: 144, voiceMetrics: [{ label: "完整生成率", value: "99.76%", tone: "good" }, { label: "首包 P95", value: "412 ms" }, { label: "RTF P95", value: "0.34" }, { label: "空音频率", value: "0.03%", tone: "good" }] }, offline: { status: "已评测", batchId: "eval-tts-flash-2608", updatedAt: "2026-09-02 18:00 CST", datasetVersion: "tts-zh-eval-v2026.08", sampleCount: 1_200, meta: "普通话 · 客服播报 / 长短文本", metrics: [{ label: "MOS 自然度", value: "4.62 / 5", target: "产品评测阈值 ≥ 4.50", result: "通过" }, { label: "音色相似度", value: "0.91", target: "产品评测阈值 ≥ 0.88", result: "通过" }, { label: "回识别 CER", value: "2.8%", target: "产品评测阈值 ≤ 4.0%", result: "通过" }, { label: "可懂度", value: "96.4%", target: "产品评测阈值 ≥ 95%", result: "通过" }, { label: "首包时延 P95", value: "412 ms", target: "产品评测阈值 ≤ 500 ms", result: "通过" }, { label: "RTF P95", value: "0.34", target: "产品评测阈值 ≤ 0.50", result: "通过" }] } },
  "MOSS-TTSD-1.0": { online: { sampleCount: 284_103, successRatePct: 99.78, meanMs: 612, p50Ms: 548, p90Ms: 836, p95Ms: 1_020, p99Ms: 1_840, clientErrorCount: 407, serviceErrorCount: 176, timeoutCount: 84, voiceMetrics: [{ label: "完整生成率", value: "99.71%", tone: "good" }, { label: "首包 P95", value: "486 ms" }, { label: "RTF P95", value: "0.39" }, { label: "截断率", value: "0.05%", tone: "good" }] }, offline: { status: "已评测", batchId: "eval-ttsd-2608", updatedAt: "2026-09-02 18:00 CST", datasetVersion: "tts-zh-eval-v2026.08", sampleCount: 960, meta: "普通话 · 对话 / 多轮上下文", metrics: [{ label: "MOS 自然度", value: "4.58 / 5", target: "产品评测阈值 ≥ 4.50", result: "通过" }, { label: "音色相似度", value: "0.89", target: "产品评测阈值 ≥ 0.87", result: "通过" }, { label: "回识别 CER", value: "3.1%", target: "产品评测阈值 ≤ 4.0%", result: "通过" }, { label: "可懂度", value: "95.8%", target: "产品评测阈值 ≥ 95%", result: "通过" }, { label: "首包时延 P95", value: "486 ms", target: "产品评测阈值 ≤ 550 ms", result: "通过" }, { label: "RTF P95", value: "0.39", target: "产品评测阈值 ≤ 0.55", result: "通过" }] } },
  "MOSS-Voice-Generator-1.0": { online: { sampleCount: 96_284, successRatePct: 99.68, meanMs: 728, p50Ms: 642, p90Ms: 1_040, p95Ms: 1_320, p99Ms: 2_180, clientErrorCount: 214, serviceErrorCount: 72, timeoutCount: 26, voiceMetrics: [{ label: "完整生成率", value: "99.61%", tone: "good" }, { label: "首包 P95", value: "604 ms" }, { label: "RTF P95", value: "0.48" }, { label: "空音频率", value: "0.06%" }] }, offline: { status: "待评测", batchId: "eval-voice-2609", updatedAt: "2026-09-05 17:30 CST", datasetVersion: "voice-design-eval-v2026.09", sampleCount: 420, meta: "普通话 · 音色设计 / 短文本", metrics: [{ label: "MOS 自然度", value: "采样中", target: "产品评测阈值 ≥ 4.30", result: "观察" }, { label: "音色相似度", value: "采样中", target: "产品评测阈值 ≥ 0.86", result: "观察" }, { label: "回识别 CER", value: "采样中", target: "产品评测阈值 ≤ 4.5%", result: "观察" }, { label: "可懂度", value: "采样中", target: "产品评测阈值 ≥ 94%", result: "观察" }, { label: "首包时延 P95", value: "采样中", target: "产品评测阈值 ≤ 700 ms", result: "观察" }, { label: "RTF P95", value: "采样中", target: "产品评测阈值 ≤ 0.60", result: "观察" }] } },
  "MOSS-TTS-1.0-Pro": { online: { sampleCount: 183_760, successRatePct: 99.81, meanMs: 586, p50Ms: 524, p90Ms: 792, p95Ms: 968, p99Ms: 1_742, clientErrorCount: 281, serviceErrorCount: 96, timeoutCount: 41, voiceMetrics: [{ label: "完整生成率", value: "99.79%", tone: "good" }, { label: "首包 P95", value: "438 ms" }, { label: "RTF P95", value: "0.36" }, { label: "解码失败率", value: "0.02%", tone: "good" }] }, offline: { status: "已评测", batchId: "eval-tts-pro-2608", updatedAt: "2026-09-02 18:00 CST", datasetVersion: "tts-zh-expressive-v2026.08", sampleCount: 1_080, meta: "普通话 · 有声内容 / 情感文本", metrics: [{ label: "MOS 自然度", value: "4.67 / 5", target: "产品评测阈值 ≥ 4.50", result: "通过" }, { label: "音色相似度", value: "0.92", target: "产品评测阈值 ≥ 0.88", result: "通过" }, { label: "回识别 CER", value: "2.6%", target: "产品评测阈值 ≤ 4.0%", result: "通过" }, { label: "可懂度", value: "96.8%", target: "产品评测阈值 ≥ 95%", result: "通过" }, { label: "首包时延 P95", value: "438 ms", target: "产品评测阈值 ≤ 520 ms", result: "通过" }, { label: "RTF P95", value: "0.36", target: "产品评测阈值 ≤ 0.50", result: "通过" }] } },
  "MOSS-Transcribe-Diarize-Pro": { online: { sampleCount: 63_518, successRatePct: 99.76, meanMs: 438, p50Ms: 392, p90Ms: 647, p95Ms: 842, p99Ms: 1_290, clientErrorCount: 104, serviceErrorCount: 36, timeoutCount: 13, voiceMetrics: [{ label: "空转写率", value: "0.42%", tone: "good" }, { label: "最终结果率", value: "99.72%", tone: "good" }, { label: "处理 RTF P95", value: "0.18" }, { label: "说话人错分率", value: "3.1%" }] }, offline: { status: "已评测", batchId: "eval-asr-diarize-2608", updatedAt: "2026-09-03 11:20 CST", datasetVersion: "asr-meeting-zh-v2026.08", sampleCount: 680, meta: "普通话 · 双人 / 多人会议 · 86.4 小时", metrics: [{ label: "CER / WER", value: "5.4% / 6.8%", target: "产品评测阈值 ≤ 7% / 8%", result: "通过" }, { label: "替换 / 删除 / 插入", value: "3.2% / 2.1% / 1.5%", target: "产品评测阈值：分项可追溯", result: "通过" }, { label: "处理 RTF P95", value: "0.18", target: "产品评测阈值 ≤ 0.25", result: "通过" }, { label: "热词召回率", value: "94.1%", target: "产品评测阈值 ≥ 92%", result: "通过" }, { label: "标点 F1", value: "91.8%", target: "产品评测阈值 ≥ 90%", result: "通过" }, { label: "ITN 准确率", value: "96.2%", target: "产品评测阈值 ≥ 95%", result: "通过" }, { label: "说话人错误率 DER", value: "8.6%", target: "产品评测阈值 ≤ 10%", result: "通过" }] } },
  "MOSS-Transcribe-1.0": { online: { sampleCount: 51_284, successRatePct: 99.61, meanMs: 382, p50Ms: 344, p90Ms: 598, p95Ms: 776, p99Ms: 1_182, clientErrorCount: 132, serviceErrorCount: 44, timeoutCount: 18, voiceMetrics: [{ label: "空转写率", value: "0.51%" }, { label: "最终结果率", value: "99.66%", tone: "good" }, { label: "处理 RTF P95", value: "0.15" }, { label: "重连成功率", value: "99.2%" }] }, offline: { status: "待评测", batchId: "eval-asr-basic-2609", updatedAt: "2026-09-05 16:40 CST", datasetVersion: "asr-general-zh-v2026.09", sampleCount: 540, meta: "普通话 · 实时转写 / 客服 · 42.7 小时", metrics: [{ label: "CER / WER", value: "采样中", target: "产品评测阈值 ≤ 7% / 8%", result: "观察" }, { label: "替换 / 删除 / 插入", value: "采样中", target: "产品评测阈值：分项可追溯", result: "观察" }, { label: "处理 RTF P95", value: "采样中", target: "产品评测阈值 ≤ 0.22", result: "观察" }, { label: "热词召回率", value: "采样中", target: "产品评测阈值 ≥ 92%", result: "观察" }, { label: "标点 F1", value: "采样中", target: "产品评测阈值 ≥ 90%", result: "观察" }, { label: "ITN 准确率", value: "采样中", target: "产品评测阈值 ≥ 95%", result: "观察" }] } },
};

export const windowMinutes4: Record<TrendWindow4, number> = { "1h": 60, "24h": 1_440, "7d": 10_080, "30d": 43_200 };
export const trendWindowLabels4: Record<TrendWindow4, string> = { "1h": "近 1 小时", "24h": "近 24 小时", "7d": "近 7 天", "30d": "近 30 天" };

export function calculateAvailability4(periodMinutes: number, unavailableMinutes: number) {
  if (periodMinutes <= 0) return 0;
  return Number(((periodMinutes - unavailableMinutes) / periodMinutes * 100).toFixed(3));
}

export function requestWithinWindow4(request: Request4, windowFilter: TrendWindow4) {
  return request.ageMinutes <= windowMinutes4[windowFilter];
}

export function isHistoricalRequestEvidence4(request: Request4) {
  return request.evidenceScope === "MONTHLY_SNAPSHOT";
}

export function findRequestEvidence4(requestId: string) {
  return requests4.find(request => request.id === requestId) ?? null;
}

export function filterRequests4({ windowFilter = "24h", modelFilter = "all", userFilter = "all", keyFilter = "all", reasonFilter = "all" }: {
  windowFilter?: TrendWindow4;
  modelFilter?: string;
  userFilter?: string;
  keyFilter?: string;
  reasonFilter?: ReasonCode4 | "all";
}) {
  return requests4.filter(request => requestWithinWindow4(request, windowFilter)
    && (modelFilter === "all" || request.model === modelFilter)
    && (userFilter === "all" || request.user === userFilter)
    && (keyFilter === "all" || request.key === keyFilter)
    && (reasonFilter === "all" || request.reason === reasonFilter));
}

export function concurrencyEvidence4(modelFilter: string, windowFilter: TrendWindow4, userFilter = "all", keyFilter = "all") {
  const attempts = filterRequests4({ modelFilter, windowFilter, userFilter, keyFilter, reasonFilter: "CONCURRENCY_LIMIT_EXCEEDED" });
  return {
    attempts: attempts.length,
    retryGroups: new Set(attempts.map(request => request.retryGroupId ?? request.logicalRequestId)).size,
    requestIds: attempts.map(request => request.id),
    rows: attempts,
  };
}

function rejectionBuckets4(rows: Request4[], windowFilter: TrendWindow4) {
  const length = trendAxisLabels4[windowFilter].length;
  const buckets = Array.from({ length }, () => 0);
  rows.forEach(request => {
    const position = Math.min(.999999, Math.max(0, request.ageMinutes / windowMinutes4[windowFilter]));
    const bucketIndex = Math.max(0, length - 1 - Math.floor(position * length));
    buckets[bucketIndex] += 1;
  });
  return buckets;
}

export function getConcurrencyView4(modelName: string, windowFilter: TrendWindow4, userFilter = "all", keyFilter = "all") {
  const model = concurrencyModels4.find(item => item.model === modelName) ?? concurrencyModels4[0];
  const evidence = concurrencyEvidence4(model.model, windowFilter, userFilter, keyFilter);
  const attribution = getConcurrencyAttribution4(model.model, windowFilter, userFilter, keyFilter);
  const share = attribution.share;
  const rpmShare = model.currentRpm ? Math.min(1, attribution.currentRpm / model.currentRpm) : 0;
  const buckets = rejectionBuckets4(evidence.rows, windowFilter);
  const trend = model.trendByWindow[windowFilter].map((point, index) => ({
    ...point,
    average: Math.round(point.average * share),
    peak: Math.round(point.peak * share),
    rpm: Math.round(point.rpm * rpmShare),
    rejected: buckets[index],
  }));
  const currentConcurrency = attribution.currentConcurrency;
  const currentRpm = attribution.currentRpm;
  return {
    ...model,
    trend,
    currentConcurrency,
    currentRpm,
    peakConcurrency: Math.max(currentConcurrency, ...trend.map(point => point.peak)),
    peakAt: model.peakAtByWindow[windowFilter],
    rejectedAttempts: evidence.attempts,
    rejectedRetryGroups: evidence.retryGroups,
    remainingConcurrency: Math.max(0, model.concurrencyLimit - currentConcurrency),
    utilizationPct: Math.round(currentConcurrency / Math.max(1, model.concurrencyLimit) * 100),
    rpmUtilizationPct: Math.round(currentRpm / Math.max(1, model.rpmLimit) * 100),
    attribution,
  };
}

export const qualityModels4: Record<string, QualityModel4> = Object.fromEntries(modelCatalog4.map(model => {
  const seed = qualitySeed4[model.name];
  const evidence = concurrencyEvidence4(model.name, "24h");
  const trend = concurrencyModels4.find(item => item.model === model.name)?.trendByWindow["24h"] ?? [];
  const applicable = model.name === "MOSS-TTS-1.5-Flash";
  return [model.name, {
    modelId: model.id,
    model: model.name,
    service: model.service,
    online: {
      ...seed.online,
      source: "模型网关请求聚合 + 服务探针",
      updatedAt: "2026-09-06 15:42:30 CST",
      metricRuleVersion: "speech_operations_metrics_v4",
      availabilityPctByWindow: onlineAvailabilityByModel4[model.name],
      modeShare: onlineModeShareByModel4[model.name],
      streamingMetric: onlineStreamingMetricByModel4[model.name],
    },
    offline: { ...seed.offline, thresholdBasis: "产品评测阈值" },
    contract: applicable ? {
      applicable: true,
      monthlyAvailabilityReferencePct: 99,
      availabilityDefinition: "月度可用性 = （当月总分钟数 - 乙方原因导致的连续 5xx / 超时不可用分钟数）/ 当月总分钟数",
      ordinarySupportResponseMinutes: 1_440,
      responseMilestones: [
        { label: "重大故障首次响应", referenceMinutes: 15 },
        { label: "重大故障初步判断", referenceMinutes: 30 },
        { label: "恢复服务或提供经认可临时方案", referenceMinutes: 120 },
      ],
      exclusions: ["测试 / 试用 / Beta", "客户系统、配置或数据异常", "超出频率、并发或容量限制", "第三方与非可控网络", "约定维护与不可抗力"],
      remedy: "低于约定服务水平时可按实际影响协商减免当期费用，合同未给出固定公式",
      source: "合同第 4.2 条",
      note: "仅适用于 MOSS-TTS-1.5-Flash，作为商务服务承诺参考，不自动映射线上运营指标。",
    } : {
      applicable: false,
      monthlyAvailabilityReferencePct: null,
      availabilityDefinition: null,
      ordinarySupportResponseMinutes: null,
      responseMilestones: [],
      exclusions: [],
      remedy: null,
      source: null,
      note: "当前资料没有该模型的商务服务承诺参考。",
    },
    capacity: {
      concurrency: { current: model.currentConcurrency, limit: model.concurrencyLimit, peak24h: Math.max(model.currentConcurrency, ...trend.map(point => point.peak)), rejectedAttempts24h: evidence.attempts, retryGroups24h: evidence.retryGroups },
      rpm: { current: model.currentRpm, limit: model.rpmLimit, peak24h: Math.min(model.rpmLimit, Math.ceil(model.currentRpm * 1.08)) },
      maxPending: model.gatewayLimits.maxPending,
      burst: model.gatewayLimits.burst,
      modelRpdLimit: model.gatewayLimits.modelRpdLimit,
    },
  } satisfies QualityModel4];
}));

export type OnlineOperationsTrendPoint4 = {
  time: string;
  requests: number;
  successRatePct: number | null;
  availabilityPct: number;
};

/** Model-level operational trend. Availability comes from probe time windows and is independent of request outcomes. */
export function getOnlineOperationsTrend4(modelName: string, windowFilter: TrendWindow4, requestCount: number, successRatePct: number | null): OnlineOperationsTrendPoint4[] {
  const model = qualityModels4[modelName] ?? qualityModels4[modelCatalog4[0].name];
  const labels = trendAxisLabels4[windowFilter];
  const seed = [...`${model.modelId}-${windowFilter}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const requestShape = labels.map((_, index) => {
    const position = index / Math.max(1, labels.length - 1);
    return Math.max(.28, .72
      + .2 * Math.sin((position * (2.1 + seed % 5 * .11) - .32) * Math.PI + seed * .03)
      + .12 * Math.cos(position * (4.6 + seed % 4 * .2) * Math.PI + seed * .07));
  });
  const successDelta = labels.map((_, index) => Number((-.018 + .036 * Math.sin(index * 1.41 + seed * .09)).toFixed(3)));
  const availabilityDelta = labels.map((_, index) => Number((-.006 + .018 * Math.cos(index * 1.17 + seed * .05)).toFixed(3)));
  const shapeTotal = requestShape.reduce((sum, value) => sum + value, 0) || 1;
  const availabilityBase = model.online.availabilityPctByWindow[windowFilter];
  return labels.map((time, index) => ({
    time,
    requests: Math.max(0, Math.round(requestCount * requestShape[index] / shapeTotal)),
    successRatePct: successRatePct == null ? null : Number(Math.max(0, Math.min(100, successRatePct + successDelta[index])).toFixed(3)),
    availabilityPct: Number(Math.max(0, Math.min(100, availabilityBase + availabilityDelta[index])).toFixed(3)),
  }));
}

export function meterLineMatches4(line: MeterLine4, { month, modelFilter = "all", userFilter = "all", keyFilter = "all", reconciliationFilter = "all" }: {
  month: string;
  modelFilter?: string;
  userFilter?: string;
  keyFilter?: string;
  reconciliationFilter?: ReconciliationState4 | "all";
}) {
  return line.month === month
    && (modelFilter === "all" || line.model === modelFilter)
    && (userFilter === "all" || line.user === userFilter)
    && (keyFilter === "all" || line.key === keyFilter)
    && (reconciliationFilter === "all" || line.reconciliationState === reconciliationFilter);
}

export function monthlySnapshot4(month: string) {
  const rows = meterLines4.filter(line => line.month === month);
  return {
    month,
    rows,
    lineCount: rows.length,
    requests: rows.reduce((sum, line) => sum + line.requests, 0),
    successfulRequests: rows.reduce((sum, line) => sum + line.successfulRequests, 0),
    meterEvents: rows.reduce((sum, line) => sum + line.meterEvents, 0),
    ledgerEntries: rows.reduce((sum, line) => sum + line.ledgerEntries, 0),
    points: rows.reduce((sum, line) => sum + line.pointCharge.netPoints, 0),
    estimatedCny: rows.reduce((sum, line) => sum + (line.cnyEstimate.netAmount ?? 0), 0),
    cnyPricedLines: rows.filter(line => line.cnyEstimate.netAmount != null).length,
    contractExtras: [
      { label: "并发增购", quantity: "0 路/月", estimatedCny: 0, status: "本期未发生" },
      { label: "技术服务", quantity: "0 天", estimatedCny: 0, status: "本期未发生" },
    ],
    reconciliationDifferences: rows.reduce((sum, line) => sum + Math.max(0, line.meterEvents - line.ledgerEntries), 0),
    snapshotId: `billing4-${month.replace("-", "")}-v1`,
  };
}

export function billingTrend4(lines: MeterLine4[], month = lines[0]?.month ?? "2026-08") {
  const totalCny = lines.reduce((sum, line) => sum + (line.cnyEstimate.netAmount ?? 0), 0);
  const totalRequests = lines.reduce((sum, line) => sum + line.requests, 0);
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const year = match ? Number(match[1]) : 2026;
  const monthNumber = match ? Number(match[2]) : 8;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthLabel = String(monthNumber).padStart(2, "0");
  const dates = Array.from({ length: lastDay }, (_, index) => `${monthLabel}-${String(index + 1).padStart(2, "0")}`);
  const selectionSeed = lines.reduce((sum, line) => sum + [...line.id].reduce((idSum, character) => idSum + character.charCodeAt(0), 0), 0);
  const weekdayFactors = [.62, 1.04, 1.12, 1.08, 1.02, .94, .72];
  const dailyActivity = dates.map((_, index) => {
    const day = index + 1;
    const weekday = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay();
    const selectionVariation = 1 + .045 * Math.sin(day * .89 + selectionSeed * .013);
    // July rises around the middle of the month and settles after the 24th;
    // August has an early-month valley, a 10–14th burst and a stronger month end.
    const monthShape = month === "2026-07"
      ? .84 + day * .007 + .16 * Math.sin(day * .54 - .9) + (day >= 17 && day <= 22 ? .24 : 0) + (day >= 25 ? -.08 : 0)
      : month === "2026-08"
        ? .72 + day * .011 + .14 * Math.cos(day * .47 + .35) + (day >= 10 && day <= 14 ? .31 : 0) + (day >= 27 ? .2 : 0)
        : .8 + day * .008 + .15 * Math.sin(day * .51 + monthNumber * .37) + (day >= lastDay - 4 ? .12 : 0);
    return Math.max(.16, weekdayFactors[weekday] * monthShape * selectionVariation);
  });
  const activityTotal = dailyActivity.reduce((sum, value) => sum + value, 0) || 1;
  const terminalRequests = Number((totalRequests / 10_000).toFixed(2));
  let cumulativeActivity = 0;
  let previousCost = 0;
  let previousRequests = 0;
  return dates.map((date, index) => {
    cumulativeActivity += dailyActivity[index];
    const share = cumulativeActivity / activityTotal;
    const terminal = index === dates.length - 1;
    const cost = terminal ? totalCny : Math.max(previousCost, Math.min(totalCny, Number((totalCny * share).toFixed(2))));
    const requests = terminal ? terminalRequests : Math.max(previousRequests, Number((terminalRequests * share).toFixed(2)));
    previousCost = cost;
    previousRequests = requests;
    return { date, usage: cost, requests, cost };
  });
}

export function formatMoney4(value: number) {
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPoints4(value: number) {
  return `${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 积分`;
}

export function formatRawUsage4(usage: MeterUsage4) {
  if (usage.kind === "TTS") return `${usage.rawCharacters.toLocaleString("zh-CN")} 字符`;
  return `${(usage.audioSeconds / 3_600).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 小时 · ${usage.channels} 声道`;
}

export function formatBillableUsage4(usage: MeterUsage4) {
  if (usage.kind === "TTS") return `${usage.billableCharacters.toLocaleString("zh-CN")} 字符`;
  return `${(usage.billableAudioSeconds / 3_600).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 音视频小时`;
}

export function formatPointRule4(modelName: string) {
  const rule = catalogModel4(modelName).pointPricing;
  return `${rule.pointsPerUnit} 积分 / ${rule.unitLabel} · 最低 ${rule.minimumPointsPerRequest.toFixed(2)} 积分`;
}

export function formatPointChargeBasis4(line: MeterLine4) {
  if (line.pointCharge.adjustmentPoints) return `${formatPointRule4(line.model)} · 单次最低扣费调整 +${line.pointCharge.adjustmentPoints.toFixed(2)} 积分`;
  return `${formatPointRule4(line.model)} · ${line.pointCharge.source}已核对`;
}

export function formatCommercialRule4(modelName: string) {
  const rule = catalogModel4(modelName).commercialPricing;
  return rule.rateCny == null ? "无生效的企业积分换算率" : `本企业折后 ¥${rule.rateCny.toFixed(4)} / ${rule.unitLabel}`;
}

export function maskPhone4(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export const reasonLabel4: Record<ReasonCode4, string> = {
  SUCCESS: "成功",
  CONCURRENCY_LIMIT_EXCEEDED: "超并发拒绝",
  RPM_LIMIT_EXCEEDED: "RPM 限流",
  QUEUE_LIMIT_EXCEEDED: "等待队列已满",
  UPSTREAM_CAPACITY_THROTTLED: "上游容量限流",
  UNKNOWN: "层级 / 责任未识别",
  INVALID_ARGUMENT: "参数错误",
  UPSTREAM_TIMEOUT: "上游超时",
  INTERNAL_ERROR: "服务内部错误",
};

export function resultTone4(request: Request4): Tone {
  if (request.status === 200) return "good";
  if (request.reason === "CONCURRENCY_LIMIT_EXCEEDED" || request.reason === "RPM_LIMIT_EXCEEDED") return "warn";
  return "bad";
}

export function buildCapacityEvidence4(modelName: string, windowFilter: TrendWindow4, userFilter = "all", keyFilter = "all") {
  const view = getConcurrencyView4(modelName, windowFilter, userFilter, keyFilter);
  const attribution = [userFilter === "all" ? "全部用户" : userFilter, keyFilter === "all" ? "全部 API Key" : keyFilter].join(" / ");
  return [
    `模型：${view.model}`,
    `归因：${attribution}`,
    `观察窗口：${trendWindowLabels4[windowFilter]}`,
    `当前并发 / 生效上限：${view.currentConcurrency} / ${view.concurrencyLimit}`,
    `窗口峰值并发：${view.peakConcurrency}`,
    `超并发拒绝：${view.rejectedAttempts} 次尝试 / ${view.rejectedRetryGroups} 个重试组`,
    `RPM 当前 / 上限：${view.currentRpm} / ${view.rpmLimit}（独立限流口径）`,
    `证据 request_id：${concurrencyEvidence4(view.model, windowFilter, userFilter, keyFilter).requestIds.slice(0, 5).join("、") || "无拒绝样本"}`,
  ].join("\n");
}
