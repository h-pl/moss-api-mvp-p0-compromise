# Moss API MVP-P0 · PRD 与 Figma 交接

交付核对日期：2026-10-29；功能基线：2beca7c。Figma 当前交付文件为用户指定的「Moss API · 蓝耘月度账单设计」，文件标识 x9fxtgxEWEpIAKwyGKQz8K。

- [飞书 PRD](https://acnc6zeentra.feishu.cn/docx/S9zbdxp89oGfXYxKWkTc22QAnef)
- [线上请求明细](https://moss-api-mvp-p0-compromise.vercel.app/app/usage?range=7&tab=requests)
- [GitHub](https://github.com/h-pl/moss-api-mvp-p0-compromise)
- [Figma 目录与交互说明](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=187-5066)

## 页面目录

按确认截图排列，复用原有账单、密钥和用量页面；组件库集中于通用组件页。

- [目录与交互说明](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=184-4632)
- [全局导航 · 工作空间切换](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=184-4633)
- [接入管理 · API 密钥](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=112-860)
- [费用中心 · 用量与积分](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=112-861)
- [费用中心 · 账单](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=0-1)
- [通用组件与提示](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=184-4634)

## 常用画板

- [全局导航及账户入口](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=187-3917)
- [账户菜单](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=187-4137)
- [企业 API Keys](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=117-865)
- [个人 API Keys](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-6809)
- [创建 API Key](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-4704)
- [编辑 API Key](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-5189)
- [停用 API Key](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-5604)
- [删除 API Key](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-5665)
- [企业用量概览](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=117-2363)
- [请求明细 · 8 列](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-7626)
- [请求详情 · 12 字段](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-5946)
- [失败请求详情](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=188-3917)
- [按模型与 Key 汇总导出](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-6095)
- [请求明细导出](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-6590)
- [个人用量概览](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=121-9300)
- [账单预览与阶梯示例](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=49-524)
- [通用组件与状态](https://www.figma.com/design/x9fxtgxEWEpIAKwyGKQz8K?node-id=169-6560)

## 请求明细定稿

主表 8 列：请求时间、请求 ID、计费模型、API Key 名称、接口、请求状态、计费用量、消耗积分。用量合并原始单位，数值右对齐。请求 ID 打开详情，无复制按钮；成功绿点、失败红点，失败样例为 0 秒、0.00 积分。

详情 12 字段：请求时间（北京时间）、请求 ID、计费模型、API Key ID、API Key 名称、密钥掩码、API Key 备注、接口、请求状态、计费用量、用量单位、消耗积分。主表和详情均无折算金额。

页面最大宽度 1200px，1728px 画板内表格宽 1136px，列宽 184 / 160 / 136 / 184 / 140 / 88 / 152 / 92px。单元格左右内边距 12px，首尾外侧 8px。全部单行；ID 中间省略号两侧留空格，模型和接口末尾省略号前不留空格。

详情宽 680px，标签宽 160px，标签与值间距 20px。保留可编辑文字、Auto Layout、行组件及现有导航和按钮实例；中文使用 Noto Sans SC 对应页面 MiSans，英文和数字使用 Sora，等宽字段使用 Roboto Mono。原有组件中的 Inter 字体随组件保留。

## 核对记录

2026-10-29：已将本轮交付目标更正到上述文件，六页目录与截图一致，核对请求列表、成功与失败详情、分页靠右及并发卡片对齐。飞书交付章节同步当前文件链接。

功能验证及线上截图见 [2026-10-28 发布说明](发布说明-20261028.md)。历史交付记录保留历史版本信息；后续设计更新以上述文件为准。
