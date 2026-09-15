# Moss API MVP-P0 · PRD 与 Figma 交接

交付核对日期：2026-09-15；当前代码快照：bfc7f47。首版标签保留为历史参考，不作为本轮最新快照。

- [飞书 PRD](https://acnc6zeentra.feishu.cn/docx/S9zbdxp89oGfXYxKWkTc22QAnef)
- [新版 Figma](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=44-2)
- [线上参考](https://moss-api-mvp-p0-compromise.vercel.app/app/api-keys)
- [GitHub｜公开代码仓库](https://github.com/h-pl/moss-api-mvp-p0-compromise)

PRD 按最终有效功能描述本轮研发调整、字段、数据口径、接口职责与验收。设计稿包含企业、个人分区的产品状态，沿用“模块 / 子页面 / 状态”的命名方式，并提供目录、独立的全局导航工作空间切换页和通用组件页。

中文设计字体为经确认的 Noto Sans SC，上线仍使用 MiSans；英文和数字使用 Sora。采用可编辑图层、16 个颜色变量、6 个文字样式、共用导航、主按钮和个人模型授权卡片。

主要模块内原型路径已连接；打印 PDF、CSV 下载、支付提交及完整动态交互以线上原型为准。一次性密钥画板中的值仅为设计示例。

## 主要页面入口

完整状态以 Figma 各页面目录为准，以下为常用直达入口。

### 全局导航 · 工作空间切换

- [全局导航 / 工作空间切换 / 双向流程](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=129-41)
- 双向切换流程单独一页；菜单、账户入口和侧栏组件保留在通用组件中。

### 接入管理 · API 密钥

- [接入管理 / API 密钥 / 个人·创建](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=17-2)
- [接入管理 / API 密钥 / 个人·默认](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=17-272)
- [接入管理 / API 密钥 / 企业·创建](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=17-539)
- [接入管理 / API 密钥 / 企业·默认](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=17-1030)
- [接入管理 / API 密钥 / 企业·编辑](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=30-20)
- [接入管理 / API 密钥 / 企业·资源展开](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=30-528)
- [接入管理 / API 密钥 / 企业·停用确认](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=39-2)
- [接入管理 / API 密钥 / 企业·启用确认](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=39-467)
- [接入管理 / API 密钥 / 企业·删除确认](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=39-932)
- [接入管理 / API 密钥 / 个人·未选择模型](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=39-2020)
- [接入管理 / API 密钥 / 个人·创建已填写](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=43-130)
- [接入管理 / API 密钥 / 个人·一次性密钥](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=43-399)

### 费用中心 · 用量与积分

- [个人角色分区：概览、请求、详情、账单及两种导出](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=80-1104)

- [费用中心 / 用量与积分 / 账单预览](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=19-2)
- [费用中心 / 用量与积分 / 企业·用量概览](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=19-694)
- [费用中心 / 用量与积分 / 导出明细·按模型与Key](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=24-2)
- [费用中心 / 用量与积分 / 导出明细·逐请求](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=24-744)
- [费用中心 / 用量与积分 / 企业·请求明细](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=24-1272)
- [费用中心 / 用量与积分 / 请求详情](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=39-1397)
- [费用中心 / 用量与积分 / 个人·用量概览](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=41-94)

### 费用中心 · 计费标准

- [费用中心 / 计费标准 / 企业·默认](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=28-2)
- [费用中心 / 积分获取 / 企业·个人充值](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=28-328)
- [费用中心 / 积分获取 / 企业支付](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=30-1036)
- [费用中心 / 计费标准 / 个人·默认](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=41-671)
- [费用中心 / 积分获取 / 个人·充值](https://www.figma.com/design/uKJHefil0SBm8xMnc37NnE?node-id=51-185)

## 本轮交付核对

- 当前代码快照：[bfc7f47](https://github.com/h-pl/moss-api-mvp-p0-compromise/commit/bfc7f478676ac0e34397d78bb2100fdca09a0a89)，Vercel 提交状态成功。
- 在该快照重新运行 `scripts/verify-platform.mjs`，40 项业务检查通过。
- PRD 补正：分页默认值、URL 恢复语义、CSV 精确列名 / 顺序和 ASR 秒 / 小时换算、多费率账单、个人 / 企业入账归属、请求详情末行分隔线、工作空间目录及版本入口。
- 固定参考金额：消耗积分 × 0.05 元 / 积分，不再次乘模型折扣，不作为实付成本或结算依据。
- 已更新企业用量、请求明细 / 详情、个人充值及企业支付的线上截图；原有流程图、工作空间截图与手工标注保留。
- 当前交付为研发需求与交互参考。真实接口、收款配置、配置传播时延、导出阈值和目标浏览器 PDF 验收按 PRD 的联调清单确认。

最终回读：飞书修订 91；详细记录见 [交付核对](交付核对-20260915.md)。
