# MVP-P0 流程图源码

更新：2026-09-11。以下源码与研发主PRD的Mermaid代码块一致，飞书对应章节使用原生Mermaid画板。修改流程时需同步主PRD和飞书画板，并回读预览与源码验证。

| 源码 | 主PRD章节 | 技术参考 |
|---|---|---|
| [Owner配置与身份权限](./01-identity.mmd) | 7.1 | [系统说明](../系统说明-账号切换与企业资源.md) |
| [Key生命周期](./02-key-lifecycle.mmd) | 7.3 | [系统说明](../系统说明-账号切换与企业资源.md) |
| [短信邀请、登录加入与成员生命周期](./03-member-lifecycle.mmd) | 7.6 | [系统说明](../系统说明-账号切换与企业资源.md) |
| [账务查询与导出](./04-billing-flow.mmd) | 7.5 | [主PRD](../PRD-管理和组织模块.md) |

在线查看：[飞书研发PRD](https://acnc6zeentra.feishu.cn/wiki/GfJQwQLMFiabOOktdUNcaAxsnRd)。身份画板区分开通前置配置与日常访问，正常成员按当前身份进入页面，再按需从左下角用户信息卡片切换身份；无企业账号不显示切换入口。成员画板覆盖短信邀请、注册/登录、手机号匹配、服务端接受、企业身份选项、共享并发调用及移除重邀；Key与账务画板保持原已核验内容。

成员邀请图的[验证预览](./03-member-lifecycle-verified.png)由飞书导出的实际画板 SVG 渲染为 PNG，并保留[飞书导出SVG](./03-member-lifecycle-remote.svg)，用于核验图中文字与连线；可编辑源码仍为Mermaid。
