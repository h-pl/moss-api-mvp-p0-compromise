import { Icon, PageHeader, type IconName } from "./ui";

export const personalNav: { label: string; items: { label: string; href: string; icon: IconName }[] }[] = [
  { label: "开发", items: [{ label: "Playground", href: "https://platform.mosi.cn/app/playground", icon: "play" }, { label: "API Docs", href: "https://platform.mosi.cn/docs/getting-started/overview", icon: "docs" }] },
  { label: "配置", items: [{ label: "API Keys", href: "https://platform.mosi.cn/app/api-keys", icon: "key" }] },
  { label: "账单与用量", items: [{ label: "用量与积分", href: "https://platform.mosi.cn/app/usage", icon: "chart" }, { label: "计费标准", href: "https://platform.mosi.cn/app/pricing", icon: "wallet" }] },
  { label: "个人中心", items: [{ label: "个人信息", href: "https://platform.mosi.cn/app/profile", icon: "account" }] },
];

export function PersonalPage() {
  return <div className="personal-page" aria-label="C端个人页">
    <PageHeader title="平台首页" description="体验语音模型，管理你的个人 API 服务。"/>
    <section className="panel personal-hero"><div><span className="period-chip">Moss 开放平台</span><h2>从声音，开始创造</h2><p>体验语音合成与音频转写，将语音能力接入你的应用。</p></div><a className="btn primary" href="https://platform.mosi.cn/app/playground" target="_blank" rel="noopener noreferrer">打开 Playground <Icon name="chevron" size={14}/></a></section>
    <section className="panel personal-services" aria-label="个人服务">
      <div><h2>API Keys</h2><p>创建和管理个人 API Key。</p><a className="btn" href="https://platform.mosi.cn/app/api-keys" target="_blank" rel="noopener noreferrer">管理 API Key</a></div>
      <div><h2>用量与积分</h2><p>查看个人积分余额和调用用量。</p><a className="btn" href="https://platform.mosi.cn/app/usage" target="_blank" rel="noopener noreferrer">查看用量</a></div>
      <div><h2>个人信息</h2><p>查看并管理你的个人账号信息。</p><a className="btn" href="https://platform.mosi.cn/app/profile" target="_blank" rel="noopener noreferrer">管理个人信息</a></div>
    </section>
    <section className="panel personal-quickstart"><div><h2>开发者 Quickstart</h2><p>查看接入指南、获取 API Key，开始第一次调用。</p></div><a className="btn" href="https://platform.mosi.cn/docs/getting-started/overview" target="_blank" rel="noopener noreferrer">开始使用</a></section>
    <p className="personal-service-note">服务在 Moss 开放平台新窗口中打开，使用该平台的个人账号登录。</p>
  </div>;
}
