# Moss API · platform 企业端原型

基于现有 [Moss Platform](https://platform.mosi.cn/app/api-keys) 的页面布局、字体、品牌标识与组件样式，迁入 Owner 管理 Key、模型授权、共享并发及用量导出能力。

本轮唯一有效方案见 [Platform 企业端 PRD](prd/platform/PRD-platform企业端.md)。旧版邀请、成员、席位、Admin/Developer 和子租户体系退出当前产品入口，旧源码仅保留作历史参考。

## 本地预览

```sh
pnpm dev:platform
```

端口固定为 **4002**。独立使用 `.next-platform` 编译目录及 webpack，避免复制过来的历史 Turbopack 缓存错误。若本机 pnpm 自动版本下载不可用，可直接运行：

```sh
node node_modules/next/dist/bin/next dev --webpack -p 4002 --hostname 127.0.0.1
```

- [API Keys](http://127.0.0.1:4002/app/api-keys)
- [用量与积分](http://127.0.0.1:4002/app/usage)
- [计费标准](http://127.0.0.1:4002/app/pricing)
- 侧栏底部账户菜单：个人／星河科技企业空间切换。

平台首页、Playground、API Docs 不复刻，保留原站链接；计费标准为本地企业模型折扣页，个人资料管理链接到原平台。运营后台复用，本次只展示运营已配置的企业授权结果。

## 当前行为

- Owner 创建 Key：名称、授权模型、各模型并发上限、备注；模型和单项上限受企业授权约束。
- 同模型的所有 Key 共享企业并发池，Key 上限不预留资源，上限之和允许超过企业上限。
- 完整 Key 仅创建成功时展示及复制，关闭后不可回看。编辑、停用、恢复、删除具有实际本地状态变化，删除不清除历史归因。
- 用量筛选：时间范围 → 模型 → Key；请求明细及积分遵循日期范围，并发固定近 24 小时。
- 账单按模型汇总；用量明细按模型 → Key 汇总；支持逐请求 CSV。筛选、汇总、图表、分页及导出共用计量数据。
- 企业并发峰值按请求区间重叠计算，不累加各 Key 的独立历史峰值。

- 每模型独立企业折扣；请求保存结算费率快照，详情与逐请求导出可追溯计费版本。
- 原站充值双页签、积分包与对公信息布局；企业支付不显示个人充值的商务定制区。
- 使用真正的 Reka UI（Vue 岛 + React 内容插槽）处理弹窗、下拉、页签、开关、复选框、菜单与跨月日期范围，样式取自 platform。

## 数据与交付边界

这是可运行的前端原型，数据服务由 `app/platform/data.ts` 和独立浏览器存储 `moss-platform-owner-v1` 模拟；没有接通真实登录、运营后台、网关限流和计费服务。生成的 Key 带 `sk-prototype-` 前缀，不能用于真实调用，完整值不持久化。个人与企业数据隔离；旧 v2/v3 演示成员数据不转换成新版成员。

未推送或部署到 platform.mosi.cn，不修改真实账号 Key。4001 是另一个目录中的既有服务，本次未停止该服务。

## 检查

```sh
node --experimental-strip-types scripts/verify-platform.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js app/platform app/page.tsx app/layout.tsx app/app scripts/verify-platform.mjs
node node_modules/next/dist/bin/next build --webpack
```

[实现与验收说明](prd/platform/实现与验收.md) · [设计依据](prd/platform/DESIGN.md) · [旧版 README](old/README-before-platform-20260914.md)
