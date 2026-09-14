# MVP-P0 页面范围

2026-09-10当前定稿：共享并发版本统一为企业与用户，唯一入口 `?view=enterprise`；旧enterprise2兼容跳转。Owner默认继承，成员上限选填，四页共用演示状态。规则、实现与本轮验证见[共享并发定稿记录](./企业共享并发定稿-20260910.md)。此前日期的过程记录仅供追溯，不作为当前需求。

更新日期：2026-09-09。此决策覆盖此前 MVP 2.0 和各单页定稿记录中的页面范围，不改变保留页面的业务口径。

| 一级分组 | 模块 | 页面 | 正式地址 |
|---|---|---|---|
| 管理 | 接入管理 | API 密钥 | [API 密钥](https://moss-api-enterprise-console.vercel.app/?view=keys) |
| 管理 | 费用中心 | 费用概览 | [费用概览](https://moss-api-enterprise-console.vercel.app/?view=billing3) |
| 管理 | 费用中心 | 用量明细 | [用量明细](https://moss-api-enterprise-console.vercel.app/?view=usage3) |
| 组织 | 企业管理 | 企业与用户 | [企业与用户](https://moss-api-enterprise-console.vercel.app/?view=enterprise) |

「凭证与授权」更名为「接入管理」；「API 凭证」更名为「API 密钥」，同步页签、页面标题、表格名称和浏览器标题。默认页面为 API 密钥。

具有正常企业成员关系的 Owner、Admin 可访问四页；Developer 可访问 API 密钥和本人用量明细，侧栏费用中心直接进入用量明细。

## 实现边界

保留四页既有表单、详情弹层、费用打印和导出、模型授权与并发配置、成员生命周期、Key 创建及启停。用户中心与演示角色/数据重置保留为辅助控件。保留 `moss-api-mvp-demo-v1` 数据兼容。

原型仍使用演示数据；本次包含原型部署，不包含生产接口接入。

## 验证入口

- `pnpm run verify:mvp`：四页范围、三角色权限、旧地址回退及既有业务回归。
- `pnpm run verify:v3`：保留页面实现约束与历史资料检查。
- `pnpm run lint`、`pnpm exec tsc --noEmit`、`pnpm run build:vercel`。
- 浏览器已检查默认页、四页导航、正式路由及 Developer 角色切换。

本轮结果：33 项 MVP 测试、8 项用量测试、28 项实现检查通过；Next.js 生产构建与 TypeScript 检查通过。ESLint 无错误，历史 management.tsx 保留 8 条既有警告。

## 身份与个人C端

仅正常企业成员有左下角企业/个人切换。没有企业账号时只显示个人信息及C端个人页，不提供身份切换。当前演示Admin（王开发）是正常企业成员，具有企业四页访问权限及Developer配置权限；企业访问资格按实际成员关系判断。右上角演示角色切换始终保留，角色和身份在刷新后恢复。

个人首页参考 https://platform.mosi.cn/，保留平台首页、开发、配置、账单与用量、个人中心导航。服务入口在新窗口打开现有C端并使用其真实个人登录；原型不读取或伪造C端账户数据。企业四页收缩不删除个人端导航。

四张主列表默认5条，选项5/10/20。完整核对见 [UI与交互核对](./MVP-P0-UI与交互核对.md)。
