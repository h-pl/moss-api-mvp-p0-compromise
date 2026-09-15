'use client';
import { FormEvent, useState } from 'react';
import { RekaResourceDisclosure } from './reka';
import { Context, KeyRecord, Model, contextModels, timeLabel, validateKey } from './data';
import { Dialog, Empty, Icon, Notice, Pagination, Select, ToggleSwitch, Checkbox, SuccessToast, Help } from './ui';

export default function Keys({ keys, context, save, viewUsage }: { keys: KeyRecord[]; context: Context; save: (key: KeyRecord) => string | null; viewUsage: (id: string) => void }) {
  const available = contextModels(context);
  const current = keys.filter(k => !k.deletedAt);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editor, setEditor] = useState<KeyRecord | 'new' | null>(null);
  const [action, setAction] = useState<{ key: KeyRecord; type: 'toggle' | 'delete' } | null>(null);
  const [error, setError] = useState('');
  const filtered = current.filter(k => `${k.name} ${k.note} ${k.masked}`.toLowerCase().includes(query.toLowerCase().trim()) && (status === 'all' || k.enabled === (status === 'on')));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const completeAction = () => {
    if (!action) return;
    const issue = save({ ...action.key, ...(action.type === 'delete' ? { deletedAt: Date.now(), enabled: false } : { enabled: !action.key.enabled }) });
    if (issue) setError(issue); else { setAction(null); setError(''); }
  };
  return <main id="main-content" className="p-main p-keys">
    <div className="p-page-heading"><div><h1>API Key</h1><span>已创建 {current.length} / 50</span></div><button className="p-button p-primary" disabled={current.length >= 50} onClick={() => setEditor('new')}><Icon name="plus" />创建 API Key</button></div>
    <Notice>完整密钥仅在创建成功时展示一次，请及时保存。如怀疑泄露，请停用或删除该 Key，并创建新 Key。</Notice>
    {context === 'enterprise' ? <RekaResourceDisclosure title={<span className="p-resource-title"><Icon name="building" />企业授权模型 <span className="p-muted">{available.length} 个</span><Help text="同一模型的所有 Key 共享企业并发上限。Key 上限仅限制该 Key，不预留并发额度。" /></span>}><div className="p-resource-grid">{available.map(m => <div key={m.id}><span className="p-model-ellipsis" title={m.id}>{m.id}</span><strong>{m.limit}<small> 路共享并发</small></strong></div>)}</div></RekaResourceDisclosure> : null}
    <div className="p-key-filter"><input aria-label="搜索 API Key" placeholder="搜索名称、备注或密钥尾号" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /><Select aria-label="Key 状态" value={status} onValueChange={value => { setStatus(value); setPage(1); }}><option value="all">全部状态</option><option value="on">已启用</option><option value="off">已停用</option></Select>{query || status !== 'all' ? <button className="p-text-button" onClick={() => { setQuery(''); setStatus('all'); setPage(1); }}>重置</button> : null}</div>
    <div className={`p-key-table p-table-scroll ${context === 'enterprise' ? 'p-enterprise-keys' : 'p-personal-keys'}`}><table><colgroup><col className="p-col-name" /><col className="p-col-key" /><col className="p-col-models" /><col className="p-col-note" /><col className="p-col-created" /><col className="p-col-status" /><col className="p-col-actions" /></colgroup><thead><tr><th>名称</th><th>密钥</th><th>{context === 'enterprise' ? '授权模型 / 并发上限' : '授权模型'}</th><th>备注</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(k => <tr key={k.id}><td><button className="p-name-button" onClick={() => setEditor(k)}>{k.name}</button></td><td><code>{k.masked}</code></td><td><div className="p-model-lines">{Object.entries(k.policies).map(([id, limit]) => <div key={id}><span>{id}</span>{context === 'enterprise' ? <b>{limit} <small>路</small></b> : null}</div>)}</div></td><td><span className="p-note-cell" title={k.note}>{k.note || '—'}</span></td><td className="p-nowrap">{timeLabel(k.createdAt).replaceAll('-', '.')}</td><td><span className={`p-status ${k.enabled ? 'p-status-on' : ''}`}>{k.enabled ? '已启用' : '已停用'}</span></td><td><div className="p-actions"><ToggleSwitch checked={k.enabled} label={`${k.enabled ? '停用' : '启用'} ${k.name}`} onCheckedChange={() => setAction({ key: k, type: 'toggle' })} /><button className="p-icon-button" aria-label={`编辑 ${k.name}`} title="编辑" onClick={() => setEditor(k)}><Icon name="edit" /></button><button className="p-icon-button" aria-label={`查看 ${k.name} 的用量`} title={context === 'enterprise' ? '查看用量与并发' : '查看用量'} onClick={() => viewUsage(k.id)}><Icon name="chart" /></button><button className="p-icon-button" aria-label={`删除 ${k.name}`} title="删除" onClick={() => setAction({ key: k, type: 'delete' })}><Icon name="trash" /></button></div></td></tr>)}</tbody></table>{!filtered.length ? <Empty>{current.length ? '没有匹配的 API Key，请调整搜索或筛选条件。' : '尚未创建 API Key，点击右上角创建。'}</Empty> : null}</div>
    <Pagination count={filtered.length} page={currentPage} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
    {editor ? <KeyEditor existing={editor === 'new' ? undefined : editor} available={available} context={context} close={() => setEditor(null)} save={save} /> : null}
    {action ? <Dialog title={action.type === 'delete' ? '删除 API Key' : `${action.key.enabled ? '停用' : '启用'} API Key`} close={() => { setAction(null); setError(''); }} alert><div className="p-dialog-body"><p>Key：<strong>{action.key.name}</strong></p><p className="p-muted">{action.type === 'delete' ? '删除后此 Key 将永久失效，无法恢复。历史用量和账单仍保留。' : action.key.enabled ? '停用后，此 Key 的新请求将被拒绝；已经接纳的请求可正常完成。您可以随时重新启用。' : '启用后，此 Key 可以按当前模型授权与并发上限发起请求。'}</p>{error ? <p className="p-error" role="alert">{error}</p> : null}</div><footer><button className="p-button" data-autofocus onClick={() => { setAction(null); setError(''); }}>取消</button><button className={`p-button ${action.type === 'delete' ? 'p-danger' : 'p-primary'}`} onClick={completeAction}>{action.type === 'delete' ? '确认删除' : action.key.enabled ? '确认停用' : '确认启用'}</button></footer></Dialog> : null}
  </main>;
}
function KeyEditor({ existing, available, context, close, save }: { existing?: KeyRecord; available: Model[]; context: Context; close: () => void; save: (key: KeyRecord) => string | null }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [policies, setPolicies] = useState<Record<string, number>>(existing?.policies ?? Object.fromEntries(available.map(m => [m.id, m.limit])));
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const invalid = validateKey(name, note, policies, available);
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    const generated = existing ? '' : `sk-prototype-${Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('')}`;
    const record: KeyRecord = existing ? { ...existing, name: name.trim(), note: note.trim(), policies } : { id: crypto.randomUUID(), context, name: name.trim(), note: note.trim(), masked: `sk-••••••${generated.slice(-4)}`, policies, enabled: true, createdAt: Date.now() };
    const issue = save(record); setBusy(false);
    if (issue) { setError(issue); return; }
    if (existing) close(); else setSecret(generated);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(secret); setCopied(true); setError(''); } catch { setError('复制失败，请选中完整密钥后手动复制。'); } };
  if (secret) return <><SuccessToast>API Key 已创建</SuccessToast><Dialog title={<><Icon name="success" size={20} />API Key 创建成功，请保存</>} close={close} wide className="p-key-success"><div className="p-dialog-body"><div className="p-secret-row"><input aria-label="完整 API Key" className="p-secret" readOnly value={secret} onFocus={e => e.target.select()} /><button className="p-button p-primary" onClick={copy}><Icon name={copied ? 'check' : 'copy'} />{copied ? '已复制' : '复制'}</button></div><p className="p-secret-note">完整密钥仅此一次展示，关闭后无法再次查看，请妥善保存。</p>{error ? <p role="alert" className="p-error">{error}</p> : null}</div><footer><button className="p-button" onClick={close}>关闭</button></footer></Dialog></>;
  return <Dialog title={existing ? '编辑 API Key' : '创建 API Key'} close={close} wide className={context === 'personal' ? 'p-personal-key-dialog' : undefined}><form onSubmit={submit}><div className="p-dialog-body"><label className="p-field"><span><i>*</i> API Key 名称</span><div className="p-count-input"><input data-autofocus name="key-name" autoComplete="off" aria-label="API Key 名称" maxLength={50} value={name} placeholder="请输入" onChange={e => setName(e.target.value)} /><span>{name.length} /50</span></div></label>
    {context === 'enterprise' ? <fieldset className="p-model-field"><legend><i>*</i> 授权模型与并发上限</legend><p className="p-muted">仅可选择企业已授权模型。每个 Key 的上限不预留并发资源。</p><div className="p-policy-head"><span>模型</span><span>Key 并发上限</span></div>{available.map(m => { const selected = m.id in policies; const value = policies[m.id]; const bad = selected && (!Number.isInteger(value) || value < 1 || value > m.limit); return <div className={`p-policy-row ${bad ? 'p-policy-error' : ''}`} key={m.id}><label><Checkbox checked={selected} onCheckedChange={checked => { if (checked) setPolicies({ ...policies, [m.id]: m.limit }); else { const next = { ...policies }; delete next[m.id]; setPolicies(next); } }} /><span>{m.id}<small>企业上限 {m.limit} 路</small></span></label><div><input type="number" aria-label={`${m.id} 并发上限`} aria-invalid={bad} aria-describedby={bad ? `error-${m.id}` : undefined} min={1} max={m.limit} step={1} disabled={!selected} value={selected && !Number.isNaN(value) ? value : ''} onChange={e => setPolicies({ ...policies, [m.id]: e.target.value === '' ? NaN : Number(e.target.value) })} /><span>路</span>{bad ? <span className="p-sr-only" id={`error-${m.id}`}>请输入 1 至 {m.limit} 的整数</span> : null}</div></div>; })}</fieldset> : <fieldset className="p-model-field p-personal-model-field"><legend><i>*</i> 授权模型</legend><p className="p-muted">选择此 Key 可以调用的模型，至少选择一个。</p><div className="p-personal-model-grid">{available.map(m => { const selected = m.id in policies; return <label className={`p-personal-model-card ${selected ? 'is-selected' : ''}`} key={m.id}><Checkbox checked={selected} onCheckedChange={checked => setPolicies(current => { const next = { ...current }; if (checked) next[m.id] = m.limit; else delete next[m.id]; return next; })} /><span>{m.id}</span></label>; })}</div>{!Object.keys(policies).length ? <p className="p-error" role="alert">请至少选择一个授权模型。</p> : null}</fieldset>}
    <label className="p-field"><span>备注 <small className="p-muted">选填</small></span><textarea name="key-note" aria-label="备注" maxLength={200} rows={2} value={note} placeholder="例如：使用团队、项目或用途，方便后续管理" onChange={e => setNote(e.target.value)} /><small className="p-counter">{note.length} /200</small></label>
    {existing ? <p className="p-muted p-small">修改对后续新请求生效，历史用量和已经接纳的请求不受影响。</p> : null}{error ? <p role="alert" className="p-error">{error}</p> : null}</div><footer><button type="button" className="p-button" onClick={close}>取消</button><button className="p-button p-primary" type="submit" disabled={Boolean(invalid) || busy}>{existing ? '保存' : '确认'}</button></footer></form></Dialog>;
}
