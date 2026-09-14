import { aggregate, models, timeLabel, type Filters, type KeyRecord, type RequestRecord } from './data.ts';
import { discountLabel, estimateYuan, ratePoints } from './pricing-data.ts';

export function usageExport(kind: 'keys' | 'requests', rows: RequestRecord[], keys: KeyRecord[], account: string, filters: Filters) {
  const commonHeaders = ['账户', '开始日期', '结束日期'];
  const base = [account, filters.from, filters.to];
  if (kind === 'requests') {
    const headers = [...commonHeaders, '请求时间（北京时间）', '请求 ID', '计费模型', 'Key ID', 'API Key', '密钥掩码', '备注', '接口', '状态', '计费用量', '单位', '消耗积分', '结算单价', '单价单位', '模型折扣', '折后金额估算（元）'];
    const data = rows.map(r => {
      const key = keys.find(key => key.id === r.keyId);
      return [...base, timeLabel(r.start), r.id, r.model, r.keyId, key?.name ?? '', key?.masked ?? '', key?.note ?? '', '/api/v2/tasks', r.status, r.units, models.find(model => model.id === r.model)?.unit ?? '', (r.cents / 100).toFixed(2), r.rate ? ratePoints(r.rate) : '', r.rate?.basisLabel ?? '', r.rate ? discountLabel(r.rate.discountBps) : '', estimateYuan(r.cents).toFixed(2)];
    });
    return { headers, data };
  }
  const headers = [...commonHeaders, '计费模型', 'Key ID', 'API Key', '密钥掩码', '备注', '计费请求次数', '计费用量', '单位', '消耗积分', '折后金额估算（元）'];
  const data = aggregate(rows, true).map(r => {
    const key = keys.find(key => key.id === r.keyId);
    return [...base, r.model, r.keyId, key?.name ?? '', key?.masked ?? '', key?.note ?? '', r.billedCount, r.units, models.find(model => model.id === r.model)?.unit ?? '', (r.cents / 100).toFixed(2), estimateYuan(r.cents).toFixed(2)];
  });
  return { headers, data };
}
