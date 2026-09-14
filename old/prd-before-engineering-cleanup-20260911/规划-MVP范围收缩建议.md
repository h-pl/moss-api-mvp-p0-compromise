# MVP-P0 交付范围

同步基线：2026-09-09 [研发主 PRD](./PRD-管理和组织模块.md)与[飞书研发文档](https://acnc6zeentra.feishu.cn/wiki/GfJQwQLMFiabOOktdUNcaAxsnRd)。本文细化对应章节的研发要求，截图为线上演示快照；生产数据及权限以服务端为准。

## 当前页面

| 分组 / 模块 | 页面及线上入口 | 正常企业成员权限 |
|---|---|---|
| 管理 / 接入管理 | [API密钥](https://moss-api-enterprise-console.vercel.app/?view=keys) | Owner、Admin、Developer，本人Key |
| 管理 / 费用中心 | [费用概览](https://moss-api-enterprise-console.vercel.app/?view=billing3) | Owner、Admin |
| 管理 / 费用中心 | [用量明细](https://moss-api-enterprise-console.vercel.app/?view=usage3) | Owner、Admin企业授权范围；Developer本人范围 |
| 组织 / 企业管理 | [企业与用户](https://moss-api-enterprise-console.vercel.app/?view=enterprise) | Owner、Admin |

默认进入API密钥。正常企业成员保留企业/个人切换；无企业账号只显示个人信息和C端个人页。右上角演示角色始终保留，角色名不赋予企业成员资格。个人服务在[现有 C 端](https://platform.mosi.cn/)新窗口打开。

## 交付标准

四张主列表默认5条，可选5/10/20；统一筛选重置、页码校正、弹窗确认、焦点和窄屏。企业顶栏重置演示数据位于角色选择左侧，先确认后重置。

完整字段、接口边界和AC-01–16见[主PRD](./PRD-管理和组织模块.md)，页面证据见[截图清单](./assets/20260909/README.md)，流程见[源码索引](./diagrams/README.md)。先确认页面与交互基线，再接入真实服务并完成权限、状态撤销和账务一致性验收。原型发布不等同于生产服务上线。
