import { aggregate, usageModels as models, requestEndpoint, timeLabel, type Filters, type KeyRecord, type RequestRecord } from './data.ts';
import { estimateYuan } from './pricing-data.ts';

export function usageExport(kind: 'keys' | 'requests', rows: RequestRecord[], keys: KeyRecord[], account: string, filters: Filters) {
  const commonHeaders = ['账户', '统计开始日期', '统计结束日期'];
  const base = [account, filters.from, filters.to];
  if (kind === 'requests') {
    const headers = [...commonHeaders, '请求时间（北京时间）', '请求 ID', '计费模型', 'API Key ID', 'API Key 名称', '密钥掩码', 'API Key 备注', '接口', '请求状态', '计费用量', '用量单位', '消耗积分', '折算金额（元）'];
    const data = rows.map(r => {
      const key = keys.find(key => key.id === r.keyId);
      return [...base, timeLabel(r.start), r.id, r.model, r.keyId, key?.name ?? '', key?.masked ?? '', key?.note ?? '', requestEndpoint(r.model), r.status, r.units, models.find(model => model.id === r.model)?.unit ?? '', (r.cents / 100).toFixed(2), estimateYuan(r.cents).toFixed(4)];
    });
    return { headers, data };
  }
  const headers = [...commonHeaders, '计费模型', 'API Key ID', 'API Key 名称', '密钥掩码', 'API Key 备注', '计费请求次数', '计费用量', '用量单位', '消耗积分', '折算金额（元）'];
  const data = aggregate(rows, true).map(r => {
    const key = keys.find(key => key.id === r.keyId);
    return [...base, r.model, r.keyId, key?.name ?? '', key?.masked ?? '', key?.note ?? '', r.billedCount, r.units, models.find(model => model.id === r.model)?.unit ?? '', (r.cents / 100).toFixed(2), estimateYuan(r.cents).toFixed(4)];
  });
  return { headers, data };
}
