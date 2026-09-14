"use client";

import { useRef, useState } from "react";
import { notice, Member, View } from "./data";
import { credentialTabs } from "./credential-navigation";
import { mvpAvailableVoices } from "./mvp-fixtures";
import { DataTable, Icon, PageHeader, Status, Tabs } from "./ui";

export function VoiceAuthorization({ go, member }: { go: (view: View) => void; member: Member }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const allowed = mvpAvailableVoices(member);
  const filtered = allowed.filter(voice => (!normalizedQuery || `${voice.name} ${voice.id} ${voice.model} ${voice.usage}`.toLowerCase().includes(normalizedQuery)) && (source === "all" || voice.source === source));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const hasFilters = Boolean(query || source !== "all");
  const resetFilters = () => { setQuery(""); setSource("all"); setPage(1); searchRef.current?.focus(); };
  const copyVoiceId = async (voiceId: string) => {
    try { await navigator.clipboard.writeText(voiceId); notice("Voice ID 已复制"); }
    catch { notice("复制失败，请手动复制 Voice ID"); }
  };

  return <>
    <Tabs items={credentialTabs} active="voices" go={go} />
    <PageHeader title="音色授权" description="查询当前账号可用的企业音色、适用模型与授权范围。" action={<a className="btn secondary voice6-library-link" href="https://mossland.studio/voice/library" target="_blank" rel="noreferrer">前往音色库预览 ↗</a>} />
    <section className="panel voice6-records" aria-label="音色授权记录">
      <header className="credential6-section-head voice6-section-head"><div><h2>企业音色权益</h2><span>{allowed.length} 条授权</span></div></header>
      <div className="voice6-filters" role="search" aria-label="音色授权筛选">
        <label className="voice6-search"><span className="sr-only">关键词</span><div><Icon name="search" size={16} /><input ref={searchRef} value={query} aria-label="搜索音色授权" placeholder="音色名称、Voice ID 或用途" onChange={event => { setQuery(event.target.value); setPage(1); }} />{query ? <button type="button" aria-label="清空音色搜索" onClick={() => { setQuery(""); setPage(1); searchRef.current?.focus(); }}><Icon name="close" size={14} /></button> : null}</div></label>
        <label><span className="sr-only">授权来源</span><select aria-label="按授权来源筛选音色" value={source} onChange={event => { setSource(event.target.value); setPage(1); }}><option value="all">全部来源</option><option>合同权益</option><option>企业复刻</option></select></label>
        {hasFilters ? <button className="eu2-reset" type="button" onClick={resetFilters}>重置筛选</button> : null}
      </div>
      <div className="credential6-results" role="status">{hasFilters ? `找到 ${filtered.length} 条授权` : `全部 ${filtered.length} 条授权`}</div>
      <div className="voice6-table">{filtered.length ? <DataTable caption="音色授权列表" heads={["音色", "Voice ID", "适用模型", "授权范围 / 来源", "状态"]} rows={filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(voice => [
        <div className="voice6-identity" key={voice.id}><span aria-hidden="true"><Icon name="voice" size={15} /></span><span className="cell-stack voice6-name"><b>{voice.name}</b><small>{voice.usage}</small></span></div>,
        <span className="voice6-id-cell" key="id"><code className="voice6-id">{voice.id}</code><button type="button" aria-label={`复制 Voice ID ${voice.id}`} onClick={() => void copyVoiceId(voice.id)}><Icon name="copy" size={13} /></button></span>,
        <span className="voice6-model" key="model"><b>{voice.model}</b><small>TTS</small></span>,
        <span className="cell-stack" key="scope"><b>{voice.scope}</b><small>{voice.source}</small></span>,
        <Status key="entitlement">{voice.entitlement}</Status>,
      ])} /> : <div className="credential6-empty"><span><Icon name="search" size={24} /></span><h3>没有匹配的授权记录</h3><p>调整关键词或授权来源后重试。</p></div>}</div>
      <VoicePagination count={filtered.length} page={currentPage} pages={pages} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
    </section>
  </>;
}

function VoicePagination({ count, page, pages, pageSize, setPage, setPageSize }: { count: number; page: number; pages: number; pageSize: number; setPage: (page: number) => void; setPageSize: (size: number) => void }) {
  const start = count ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, count);
  return <footer className="credential6-pagination"><span>{count ? `显示 ${start}–${end}，共 ${count} 条` : "共 0 条"}</span><nav aria-label="音色授权分页"><label><span>每页</span><select aria-label="每页音色授权数" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(size => <option key={size} value={size}>{size} 条</option>)}</select></label><button className="btn secondary" type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><b>{page} / {pages}</b><button className="btn secondary" type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></nav></footer>;
}
