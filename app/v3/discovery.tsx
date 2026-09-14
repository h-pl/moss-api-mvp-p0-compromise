"use client";

import { useState } from "react";
import { can, modelData, notice, ProjectContext, projectName, Role, View } from "./data";
import { Icon, Metric, PageHeader, Sparkline, Status } from "./ui";

export function Overview({ go, role }: { go: (view: View) => void; role: Role }) {
  return (
    <>
      <PageHeader
        eyebrow="CUSTOMER CONTROL PLANE"
        title="平台首页"
        description="围绕企业已签约服务，统一管理 Owner / Member 账号、凭证、资源、用量、费用和请求级服务证据。"
        action={can(role, "playground") ? <button className="btn primary" type="button" onClick={() => go("playground")}>发起一次测试</button> : undefined}
      />
      <section className="service-contract panel">
        <div className="contract-main"><span className="eyebrow">ACTIVE SERVICE</span><h2>MOSS-TTS 1.5-flash API</h2><p>生产环境 · 按计费字符结算 · 服务期内</p></div>
        <dl><div><dt>月度服务可用性目标</dt><dd>≥ 99%</dd></div><div><dt>基础限流</dt><dd>500 RPM</dd></div><div><dt>当前账期</dt><dd>2026-08</dd></div><div><dt>服务状态</dt><dd><Status>正常</Status></dd></div></dl>
      </section>
      <section className="metric-grid">
        <Metric label="本月请求" value="1,284,108" meta="Owner + Member 汇总" />
        <Metric label="成功率" value="99.82%" meta="有效请求口径" />
        <Metric label="月度服务可用性" value="99.973%" meta="合同目标 ≥ 99%" tone="good" />
        <Metric label="计费字符" value="128.64M" meta="预计 ¥7,718.40" tone="warn" />
      </section>
      <section className="dashboard-grid">
        <article className="panel trend-card"><div className="panel-head"><div><span className="eyebrow">SERVICE SIGNAL</span><h2>近 7 日服务可用性</h2></div></div><div className="trend-value"><strong>99.973%</strong><span>8 月累计</span></div><Sparkline values={[99.99, 99.98, 100, 99.96, 99.99, 99.97, 99.973]} tone="green" /></article>
        <article className="panel action-card"><div className="panel-head"><div><span className="eyebrow">ATTENTION</span><h2>需要关注</h2></div><span>{can(role,"quota")?"2":"1"} 项</span></div>{can(role,"quota")?<button type="button" onClick={() => go("quota")}><span className="action-icon warn"><Icon name="gauge" /></span><span><b>Member RPM 水位接近上限</b><small>请 Owner 检查账号分配与当前窗口</small></span><Icon name="chevron" /></button>:null}<button type="button" onClick={() => go("usage3")}><span className="action-icon"><Icon name="chart" /></span><span><b>8 月结算数据已更新</b><small>可按 Member、Key 与模型核对</small></span><Icon name="chevron" /></button></article>
      </section>
      <section className="panel quick-links">
        {can(role,"keys")?<button type="button" onClick={() => go("keys")}><Icon name="key" /><span><b>管理 API Keys</b><small>按 Member 账号管理凭证</small></span><Icon name="chevron" /></button>:null}
        {can(role,"usage3")?<button type="button" onClick={() => go("usage3")}><Icon name="chart" /><span><b>核对用量</b><small>Member、Key 与模型</small></span><Icon name="chevron" /></button>:null}

      </section>
    </>
  );
}

export function Discovery({ view, go }: { view: View; go: (view: View) => void }) {
  if (view === "modelDetail") {
    return (
      <>
        <button className="back" type="button" onClick={() => go("models")}>← 返回模型与服务</button>
        <PageHeader title="MOSS-TTS 1.5-flash" description="低延迟流式语音合成服务；本页展示商务已签约并交付到当前 Workspace 的服务能力。" action={<button className="btn secondary" type="button" onClick={() => go("docs")}>API 文档</button>} />
        <section className="panel fact-grid"><div><span>模型 ID</span><code>moss-tts-v1.5-flash</code></div><div><span>当前版本</span><b>flash-20260626</b></div><div><span>计量单位</span><b>计费字符</b></div><div><span>可用地域</span><b>华北 1</b></div></section>
        <section className="two-col">
          <article className="panel detail-card"><span className="eyebrow">CAPABILITIES</span><h2>能力与限制</h2><dl><div><dt>输入</dt><dd>UTF-8 文本 / SSML</dd></div><div><dt>输出</dt><dd>MP3 / WAV / PCM</dd></div><div><dt>流式</dt><dd>支持</dd></div><div><dt>默认并发</dt><dd>80</dd></div></dl><button className="btn secondary" type="button" onClick={() => go("playground")}>进入 Playground</button></article>
          <article className="panel detail-card"><span className="eyebrow">DELIVERY</span><h2>已签约服务口径</h2><dl><div><dt>服务可用性</dt><dd>月度 ≥ 99%</dd></div><div><dt>计费</dt><dd>¥0.6 / 万字符</dd></div><div><dt>数据来源</dt><dd>API 网关与计量事件</dd></div><div><dt>服务期</dt><dd>至 2027-02-28</dd></div></dl></article>
        </section>
      </>
    );
  }
  if (view === "models") {
    return <><PageHeader title="模型与服务" description="发现可交付模型，查看规格、计量方式、已开通权益和服务边界。" /><section className="catalog-grid">{modelData.map((model, index) => <article className="panel model-card" key={model.name}><div><span className="product-icon">{index === 0 ? "TTS" : index === 1 ? "ASR" : "K3"}</span><Status tone={model.state === "已开通" ? "good" : "neutral"}>{model.state}</Status></div><span className="eyebrow">{model.kind}</span><h2>{model.name}</h2><p>{model.desc}</p><dl><dt>交付形态</dt><dd>{model.delivery}</dd></dl><button className="btn secondary" type="button" onClick={() => index === 0 ? go("modelDetail") : notice("已打开模型详情（Demo）")}>查看详情</button></article>)}</section></>;
  }
  if (view === "experience") {
    const cards = [["TEXT TO SPEECH", "语音合成", "输入文本，试听不同音色、语速与情感表达。", true], ["TRANSCRIBE", "语音识别", "上传演示音频，查看转写与说话人分离结果。", false], ["VOICE AGENT", "实时对话", "观察端到端时延、首包与打断链路。", false]] as const;
    return <><PageHeader title="体验中心" description="使用演示数据快速验证模型能力；生产调用请进入 Playground 并绑定项目凭证。" /><section className="catalog-grid">{cards.map(card => <article className="panel model-card" key={card[1]}><span className="eyebrow">{card[0]}</span><h2>{card[1]}</h2><p>{card[2]}</p><button className={card[3] ? "btn primary" : "btn secondary"} type="button" onClick={() => card[3] ? go("playground") : notice("已进入展厅体验（Demo）")}>开始体验</button></article>)}</section></>;
  }
  const solutions = [["CONTACT CENTER", "智能客服与播报", "TTS、ASR、Voice Agent 与调用治理组合，适合热线与通知业务。"], ["MEDIA", "视频字幕生成", "从视频提取音频并生成时间轴字幕。"], ["AUDIOBOOK", "有声书合成", "批量文本、角色音色与任务进度的交付型方案。"]];
  return <><PageHeader title="解决方案" description="以业务场景说明模型、工作流与交付服务如何组合；不进入客户生产工作台。" /><section className="catalog-grid">{solutions.map(item => <article className="panel solution-card" key={item[1]}><span className="eyebrow">{item[0]}</span><h2>{item[1]}</h2><p>{item[2]}</p><button className="text-button" type="button" onClick={() => notice("方案详情已展开（Demo）")}>查看方案 →</button></article>)}</section></>;
}

function DocsPage() {
  return (
    <>
      <PageHeader title="API Docs" description="围绕当前服务权益提供鉴权、请求参数、错误码和 SDK 示例。" />
      <section className="docs-layout">
        <aside className="panel docs-index">
          <b>语音合成 API</b>
          <button className="active" type="button" onClick={() => notice("已定位到发起合成文档")}>发起合成</button>
          <button type="button" onClick={() => notice("已切换到查询音色文档（Demo）")}>查询音色</button>
          <button type="button" onClick={() => notice("已切换到错误码文档（Demo）")}>错误码</button>
          <button type="button" onClick={() => notice("已切换到签名与鉴权文档（Demo）")}>签名与鉴权</button>
        </aside>
        <article className="panel docs-body">
          <span className="method">POST</span><code>/v1/audio/speech</code>
          <h2>发起语音合成</h2>
          <p>使用 API Key 调用。Key 的 Scope、IP 白名单和项目配额会共同决定请求是否放行。</p>
          <pre>{`curl -X POST https://api.mosi.cn/v1/audio/speech \\\n+  -H "Authorization: Bearer $MOSS_API_KEY" \\\n+  -d '{"model":"moss-tts-v1.5-flash","text":"您好"}'`}</pre>
          <h3>响应头</h3><p><code>x-request-id</code> 可用于技术支持排查，请在业务日志中保留。</p>
        </article>
      </section>
    </>
  );
}

function Playground({ go, projectContext }: { go: (view: View) => void; projectContext: ProjectContext }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [text, setText] = useState("您好，欢迎使用模思智能语音服务。");
  const [outcome, setOutcome] = useState<"success" | "429" | "504">("success");
  const run = () => { setRunning(true); setDone(false); window.setTimeout(() => { setRunning(false); setDone(true); }, 650); };
  const success = outcome === "success";
  const keyName = projectContext === "proj_yunfu_eval_01" ? "eval-tts" : "prod-tts";
  return (
    <>
      <PageHeader title="Playground" description="使用当前 Project 和 API Key 发起接近生产的演示请求，并返回 request_id。" action={<button className="text-button" type="button" onClick={() => go("experience")}>去展厅体验 →</button>} />
      <section className="playground-grid">
        <form className="panel request-form" noValidate onSubmit={event => { event.preventDefault(); run(); }}>
          <h2>请求配置</h2>
          <div className="context-strip"><span>当前调用范围</span><b>{projectName(projectContext)}</b></div>

          <label><span>API Key</span><select value={keyName} disabled><option>{keyName}</option></select></label>
          <label><span>模型</span><select defaultValue="MOSS-TTS 1.5-flash"><option>MOSS-TTS 1.5-flash</option></select></label>
          <label><span>演示结果</span><select value={outcome} onChange={event => setOutcome(event.target.value as typeof outcome)}><option value="success">200 · 成功</option><option value="429">429 · 触发项目限流</option><option value="504">504 · 上游推理超时</option></select></label>
          <label><span>输入文本</span><textarea className="resize-none" rows={8} value={text} onChange={event => setText(event.target.value)} /></label>
          <footer><button className="btn secondary" type="button" onClick={() => setText("")}>清空</button><button className="btn primary" type="submit" disabled={running || !text.trim()}>{running ? "运行中…" : "运行请求"}</button></footer>
        </form>
        <article className="panel run-result">
          <div className="panel-head"><h2>运行结果</h2><Status tone={done ? success ? "good" : outcome === "429" ? "warn" : "bad" : "neutral"}>{running ? "请求中" : done ? success ? "成功" : outcome : "等待请求"}</Status></div>
          {done ? success ? <><div className="audio-result"><Icon name="voice" size={28} /><div><b>音频已生成 · 3.8 秒</b><small>首包 238 ms · 总时延 486 ms</small></div><button type="button" className="btn secondary" onClick={() => notice("开始播放演示音频")}>播放</button></div><dl className="result-meta"><div><dt>request_id</dt><dd><code>req_01J7KX8F3Y2M</code></dd></div><div><dt>计量</dt><dd>19 计费字符</dd></div><div><dt>归属</dt><dd>{projectName(projectContext)} / {keyName}</dd></div></dl></> : <><div className="api-error"><span>{outcome}</span><div><b>{outcome === "429" ? "RATE_LIMIT_EXCEEDED" : "UPSTREAM_TIMEOUT"}</b><p>{outcome === "429" ? "项目 RPM 已耗尽，请等待下个重置周期或申请提额。" : "推理服务在 3 秒内未返回；该请求进入服务方异常聚合。"}</p></div></div><dl className="result-meta"><div><dt>request_id</dt><dd><code>{outcome === "429" ? "req_01J7KX5K4P7N" : "req_01J7KX6TBW1C"}</code></dd></div><div><dt>计量</dt><dd>{outcome === "429" ? "未产生计量" : "计量事件待责任归类"}</dd></div><div><dt>归属</dt><dd>{projectName(projectContext)} / {keyName}</dd></div></dl></> : <div className="empty-state"><Icon name="play" size={30} /><h3>结果会显示在这里</h3><p>运行后可核对身份、配额、调用链、计量与 request_id。</p></div>}
        </article>
      </section>
    </>
  );
}

export function DeveloperTools({ view, go, projectContext }: { view: View; go: (view: View) => void; projectContext: ProjectContext }) {
  return view === "docs" ? <DocsPage /> : <Playground go={go} projectContext={projectContext} />;
}
