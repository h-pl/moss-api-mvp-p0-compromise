# Moss API 企业控制台原型

**在线演示：[Moss API 企业控制台](https://moss-api-enterprise-console.vercel.app)**

当前交付 API 密钥、费用概览、用量明细、企业与用户四页。2026-09-10 选定共享并发版本作为唯一“企业与用户”，入口 `?view=enterprise`；旧 `enterprise2` 链接自动归一。Vercel 关联 main 分支，推送自动部署。四张主列表仍默认5条，可选5/10/20。

同一企业内的成员按模型共享并发资源池，成员上限不预留资源，其总和可以超过企业上限。勾选后留空表示不单独限制，填写时为1至企业模型上限的整数。Owner默认继承全部模型企业上限，可编辑各模型上限；列表、详情和本人资源使用统一峰值及生效上限。四页共用演示存储并迁移已有记录，原永久失效Key不会恢复。真实请求限制仍需后端网关接入。

本次收敛前对比版本保存在Git提交 `92c29a2`，新规则见 [共享并发定稿记录](prdmvp/企业共享并发定稿-20260910.md)。

2026-09-09 MVP-P0 范围收缩：仅交付 API 密钥、费用概览、用量明细、企业与用户四页。「凭证与授权」更名为「接入管理」，「API 凭证」更名为「API 密钥」。音色授权、操作审计、首页、发现、开发工具和通知入口退出本期；历史地址归一到保留页面。

快捷入口：[企业与用户](https://moss-api-enterprise-console.vercel.app/?view=enterprise) · [API 密钥](https://moss-api-enterprise-console.vercel.app/?view=keys) · [费用概览](https://moss-api-enterprise-console.vercel.app/?view=billing3) · [用量明细](https://moss-api-enterprise-console.vercel.app/?view=usage3)。

部署由 `vercel.json` 指定 Next.js 和 `pnpm run build:vercel`。当前项目使用 Node.js 24；`.vercel` 与本地环境文件不提交。Git 自动部署需使用关联 GitHub 账号的提交邮箱，避免使用本机自动生成的邮箱导致提交者无法识别。

2026-09-09企业与用户定稿：选定原“企业与用户2”，正式名称为“企业与用户”，唯一入口 `?view=enterprise`。旧 `enterprise2`、`enterprise3`、`enterprise4`、`enterprise2Detail`、`memberDetail`、`permissions`、`quota` 地址归一到正式页；旧版组件和比较页签已清理。清理前双版本已提交并推送 GitHub（`f41aa38`），可通过该提交回溯。

2026-09-09凭证与授权定稿：选定API凭证2，正式名称为“API 凭证”，入口为 `?view=keys`；`?view=keys2`–`?view=keys8` 兼容归一到 `keys`。页签仅保留“API 凭证 / 音色授权”。采用 `credentials-mvp.tsx` 的 `ApiCredentialsMvp`，保留原API凭证2的资源摘要、本人Key管理及独立演示存储。原API凭证（候选7）组件和比较页签已移除，历史通过Git查询。

这是 Moss API 企业控制台的前端原型。


历史基线：`core-metrics-ui-freeze-20260908`（2026-09-08 页面暂时封板）。该版本冻结正式费用概览、页面7核心指标闭环和配套 PRD，作为下一阶段精简核心功能前的可追溯页面基线。页面7仍是前端候选，业务数据为 Mock。

> **核心功能精简起点：从 `core-metrics-ui-freeze-20260908` 之后，页面迭代进入核心功能精简阶段。这个 tag 是精简前的页面查找基线。**

## 当前页面结构（MVP-P0）

- **管理**
  - **接入管理**
    - **API 密钥**：`?view=keys`（默认页）
  - **费用中心**
    - **费用概览**：`?view=billing3`
    - **用量明细**：`?view=usage3`
- **组织**
  - **企业管理**
    - **企业与用户**：`?view=enterprise`

有正常企业成员关系的 Owner、Admin 可访问全部四页；Developer 仅访问 API 密钥和本人用量明细。音色旧地址归一到 keys，审计旧地址归一到 enterprise（Developer 回到 keys）；其他已下线或未知页面回到 keys。旧费用与用量链接仍归一到 billing3 / usage3。

个人身份参考现有C端，保留个人导航并在新窗口打开platform.mosi.cn服务。无企业账号只有个人页与静态身份信息，无身份切换入口；右上角演示角色始终保留，刷新恢复。四张主列表默认5条，可选5/10/20。

本次范围与验证见 [MVP-P0页面范围](prdmvp/MVP-P0页面范围.md)。上文定稿记录与下文 Git 标签为历史记录，当前交付以本节为准。

## Git tag 页面索引

tag 按页面决策时间排列。“迭代完成页面”明确到当前导航下的具体子页面；“快照”表示用于回看，不代表产生了新的正式页面。

| Tag | 阶段性质 | 迭代完成页面 | 同 tag 可回看的其他页面 | 核心变化 |
|---|---|---|---|---|
| `pre-user-removal-major-update-20260909` | 重大更新前基线 | **无新增移除用户功能** | 当前全部页面 | 保存停用/恢复账户改为移除用户之前的完整状态，含资源池及摘要顺序调整。 |
| `enterprise-users4-final-20260905` | 单页迭代完成 | **组织 → 企业管理 → 企业与用户（页面4）** | — | 完成企业资源摘要、用户列表、邀请/编辑、详情和账号状态交互，并选定页面4。 |
| `enterprise-audit3-final-20260905` | 单页迭代完成 | **组织 → 企业管理 → 操作审计（页面3）** | 操作审计页面1、2 | 完成三版对比并选定操作审计3；包含详情抽屉、筛选、分页、CSV 和当时的 3 模块 16 动作。 |
| `pre-gpt6-optimization-20260906` | 优化前快照 | **无新增迭代完成页面** | 企业与用户1/2、企业认证1/2、操作审计1/2/3 | GPT-6 优化前的完整企业管理比较快照，适合回看被收敛前的页面形态。 |
| `enterprise-management-iteration-complete-20260906` | 模块迭代完成 | **组织 → 企业管理 → 企业与用户、企业认证、操作审计** | — | 企业管理迭代完成；收敛到三个正式页面，移除不再渲染的比较组件和旧分支。 |
| `enterprise-management-final-release-20260906` | 模块正式封版 | **组织 → 企业管理 → 企业与用户、企业认证、操作审计** | — | 三个完成页固定为正式入口 `enterprise`、`security`、`audit`；代码和产品文档完成一致性核验。 |
| `credentials-authorization-comparison-complete-20260906` | 方案对比完成 | **无新增正式页面；API 凭证候选7完成拟选** | API 凭证原版/5/6/7/8、音色授权 | 保留最终选择前的完整凭证对比快照；可回看 API Key 创建、轮换、停用、启用、筛选、分页和积分用量。 |
| `credentials-authorization-final-release-20260906` | 模块正式封版 | **管理 → 凭证与授权 → API 凭证（候选7转正式）、音色授权** | — | 凭证与授权正式收敛，历史凭证与音色地址归一到 `keys`、`voices` 两个正式入口。 |
| `billing-logs-page6-final-release-20260907` | 跨模块页面6迭代完成 | **管理 → 费用中心 → 费用概览6、用量明细6；管理 → 调用日志 → 请求日志6、服务质量6** | 四类页面的候选1—5 | 页面6统一用户→API Key 筛选；补齐费用标签、账期模型汇总预览、打印标识和跨页归因。 |
| `billing-overview-final-release-20260907` | 单页正式封版 | **管理 → 费用中心 → 费用概览（页面6转正式）** | 用量明细、请求日志、服务质量候选保持 | `billing2`–`billing6` 归一到正式 `billing`，月度打印快照仍为 Mock。 |
| `core-metrics-ui-freeze-20260908` | **页面暂时封板／精简前基线** | **管理 → 费用中心 → 用量明细7；管理 → 调用日志 → 请求日志7、服务质量7（候选迭代完成，尚未转正式）** | 此前全部正式页面及数字候选页 | 页面7形成请求/计费、TTS/ASR 用量、request/trace/MeterEvent 证据和并发峰值/上限闭环；同步 PRD、调研和 105 项验证。**从此 tag 之后开始精简核心功能。** |

查找历史页面时可使用：

```bash
git show <tag> --stat
git switch --detach <tag>
git diff <旧tag>..<新tag> -- app prd
```

回到当前开发分支：

```bash
git switch main
```

## 本地运行

环境要求：Node.js 22.13 或更高版本、pnpm 11。

```bash
pnpm install
pnpm dev
```

默认访问地址为 `http://localhost:4001`。

## MiniMax 0～3 随机并发 Demo

该脚本每轮等概率随机选择 0、1、2 或 3 路并发。默认调用国内站 `MiniMax-M2.7` 文本接口，控制台会输出每次调用的耗时、Token 数与请求 ID，可用于和 MiniMax 后台“套餐用量”对照。Key 只从环境变量读取。

```bash
read -s "MINIMAX_API_KEY?MiniMax Key: "
export MINIMAX_API_KEY
node scripts/minimax-random-concurrency.mjs
```

需要测试 Speech 2.8 时可加 `--service speech`；脚本会输出计费字符数与 `trace_id`，生成的音频不落盘。MiniMax 当前的套餐用量趋势只统计语言模型，因此 Speech 请求不会显示在该趋势图中。

```bash
node scripts/minimax-random-concurrency.mjs --service speech
```

默认运行 12 轮、轮间隔 2 秒。需要持续制造随机并发时：

```bash
node scripts/minimax-random-concurrency.mjs --forever --interval-ms 3000
```

按 `Ctrl+C` 停止；结束后可执行 `unset MINIMAX_API_KEY` 清理当前 shell 环境。完整参数可通过 `node scripts/minimax-random-concurrency.mjs --help` 查看。文本接口按套餐请求额度计量，Speech 2.8 按字符扣减日额度，请勿长时间无人值守运行。

## 校验

```bash
pnpm run lint
pnpm run verify:v3
pnpm run build
```

## 文档

- [产品文档阅读指引](./prd/README.md)
- [研发主PRD](./prd/PRD-管理和组织模块.md)
- [账号切换与企业资源系统说明](./prd/系统说明-账号切换与企业资源.md)
- [实现与联调说明](./prd/实现与联调说明.md)
- [UX 契约](./prd/UX-CONTRACT.md)
- [设计规范](./prd/DESIGN.md)

早期 V3 范围、评审、指标和页面草案统一保存在 [历史文件目录](./old/README.md)，不作为当前需求或实现依据。
