import { Audit3Event, audit3Location } from "./enterprise-audit-catalog";

// Prototype fixtures: every final action has two examples; no secret values.
export function makeAudit3Fixtures(now: number): Audit3Event[] {
  const templates: (Pick<Audit3Event, "module" | "action" | "object" | "before" | "after"> & { failure: string })[] = [
    { module: "凭证与授权", action: "创建 API Key", object: "本人 API Key · asr-production · key_021", before: "未创建", after: "已创建 · v1 · 已完成一次性交付", failure: "有效 Key 数量已达上限，未创建新凭证。" },
    { module: "凭证与授权", action: "轮换 API Key", object: "本人 API Key · prod-tts · key_018", before: "v1 · 有效", after: "v2 已签发 · v1 已失效", failure: "二次验证已过期，未签发新凭证。" },
    { module: "凭证与授权", action: "停用 API Key", object: "本人 API Key · batch-asr · key_019", before: "v1 · 有效", after: "v1 · 已停用", failure: "凭证服务暂时不可用，停用未完成。" },
    { module: "凭证与授权", action: "启用 API Key", object: "本人 API Key · legacy-worker · key_020", before: "v1 · 已停用", after: "v1 · 有效 · 已继承当前账号策略", failure: "当前账号没有有效模型授权，Key 未启用。" },
    { module: "凭证与授权", action: "复制 API Key", object: "本人 API Key · prod-tts · key_018 · v2", before: "本次复制尚未执行", after: "复制操作成功 · 密钥状态未变更", failure: "浏览器拒绝剪贴板访问，本次复制未完成。" },
    { module: "凭证与授权", action: "因账号停用使 Key 失效", object: "高审计 · 138****6007 · 2 个企业 Key", before: "key_031、key_032 有效", after: "系统联动：2 个企业 Key 已失效\n关联停用账号请求：req-disable-6007", failure: "Key 撤销未完成，需要重试；账号停用结果单独保留。" },
    { module: "费用中心", action: "导出费用明细", object: "2026年8月 · 企业费用对账", before: "账期：2026-08\n范围：全部企业用户", after: "文件已生成 · 128 条记录", failure: "账单快照暂不可用，未生成导出文件。" },
    { module: "费用中心", action: "导出用量明细", object: "近7天 · ASR 模型 · 按 API Key 归因", before: "时间范围：近7天\n模型类型：ASR", after: "文件已生成 · 86 条记录", failure: "用量查询超时，未生成导出文件。" },
    { module: "费用中心", action: "导出计量事件", object: "key_021 · MOSS-Transcribe-1.0", before: "对象：key_021\n时间范围：近24小时", after: "文件已生成 · 240 条计量事件", failure: "计量查询暂时不可用，导出未完成。" },
    { module: "企业管理", action: "邀请用户", object: "周运营 · 138****6001", before: "未加入企业", after: "邀请记录已创建 · 待接受\nDeveloper · 授权4个模型", failure: "目标手机号已归属其他企业，邀请未创建。" },
    { module: "企业管理", action: "修改角色", object: "赵产品 · 138****6002", before: "Viewer", after: "Developer", failure: "目标角色超出当前操作者授予范围，角色未修改。" },
    { module: "企业管理", action: "修改模型授权", object: "李测试 · 138****5680", before: "授权2个TTS模型", after: "新增 MOSS-Transcribe-1.0\n共授权3个模型", failure: "模型权益已变更，所选模型不再可用。" },
    { module: "企业管理", action: "修改模型并发", object: "孙客服 · MOSS-TTS-1.0-Pro", before: "用户并发上限：3", after: "用户并发上限：5", failure: "申请40路超过企业该模型30路上限，配置未修改。" },
    { module: "企业管理", action: "停用账号", object: "高审计 · 138****6007", before: "账号正常", after: "账号已停用\n关联请求：req-disable-6007\n有效企业 Key 的失效结果见关联事件", failure: "账号服务返回错误，账号状态未变更。" },
    { module: "企业管理", action: "恢复账号", object: "陈审计 · 138****5682", before: "账号已停用 · 原企业 Key 已失效", after: "账号已恢复 · 保留角色与授权\n原企业 Key 保持失效", failure: "账号状态发生变化，恢复未执行。" },
    { module: "企业管理", action: "退出会话", object: "李测试 · Edge / Windows · 203.0.113.28", before: "目标设备会话活跃", after: "目标会话已退出\n其他设备、账号及 API Key 不受影响", failure: "会话服务暂时不可用，退出未完成。" },
    { module: "企业管理", action: "导出审计记录", object: "近7天 · 企业管理 · 全部动作", before: "模块：企业管理\n时间范围：近7天\n结果：全部结果", after: "CSV 文件已生成 · 24 条记录", failure: "导出文件生成失败，请重试。" },
  ];
  return Array.from({ length: 34 }, (_, index) => {
    const { failure, ...template } = templates[index % templates.length];
    const failed = [18, 19, 20, 22, 27, 29].includes(index);
    const operator = index % 3 === 0 ? ["王开发", "13800005679", "Admin"] : ["企业 Owner", "13800005678", "Owner"];
    return { ...template, location: audit3Location(template.module, template.action), id: `audit3-fixture-${index}`, time: new Date(now - (index < 16 ? (index + 1) * 10 * 60000 : (index - 15) * 8 * 3600000)).toISOString(), actor: operator[0], phone: operator[1], role: operator[2],
      result: failed ? "失败" : "成功", ip: `203.0.113.${18 + index}`, device: index % 2 ? "Edge / Windows" : "Chrome / macOS", requestId: `demo-audit3-${String(index + 1).padStart(4, "0")}`,
      after: failed ? "操作未生效，保持原状态" : template.after,
      ...(failed ? { reason: failure } : {}),
    };
  });
}
