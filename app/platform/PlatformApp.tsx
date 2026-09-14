'use client';
import { useEffect, useMemo, useState } from 'react';
import { Context, KeyRecord, Page, STORAGE_KEY, Store, contextModels, makeRequests, makeStore, parseStore, points, validateKey, dateKey } from './data';
import { RekaMenu } from './reka';
import Keys from './keys';
import Usage from './usage';
import Pricing from './pricing';
import Credits from './credits';
import Profile from './profile';
import { Dialog, Icon, Logo, Notice } from './ui';

function currentPage(fallback: Page): Page {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (window.location.pathname === '/app/usage' || view?.startsWith('usage') || view?.startsWith('billing')) return 'usage';
  if (window.location.pathname === '/app/pricing') return 'pricing';
  if (window.location.pathname === '/app/profile') return 'profile';
  return fallback;
}
export default function PlatformApp({ initialPage = 'keys' }: { initialPage?: Page }) {
  const [store, setStore] = useState<Store | null>(null);
  const [clock, setClock] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<Page>(initialPage);
  const [selectedKey, setSelectedKey] = useState('all');
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [info, setInfo] = useState<'credits' | 'contact' | 'logout' | null>(null);
  const [creditPack, setCreditPack] = useState(400);
  const [signedOut, setSignedOut] = useState(false);
  const [toast, setToast] = useState('');
  /* Browser storage hydration requires one client render after the stable server loading state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const next = raw ? parseStore(raw) : makeStore();
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStore(next);
    } catch { setLoadError('本地数据读取失败。请允许此站点使用浏览器存储后重试；现有数据不会被覆盖。'); }
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    setPage(currentPage(initialPage));
    const pop = () => { setPage(currentPage('keys')); setSelectedKey('all'); setAccountOpen(false); };
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY && event.newValue) { try { setStore(parseStore(event.newValue)); setSelectedKey('all'); } catch { setLoadError('其他窗口的数据更新无法读取，请刷新重试。'); } } };
    window.addEventListener('popstate', pop); window.addEventListener('storage', storage);
    return () => { window.clearInterval(timer); window.removeEventListener('popstate', pop); window.removeEventListener('storage', storage); };
  }, [initialPage]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { document.title = `${page === 'keys' ? 'API Key' : page === 'usage' ? '用量与积分' : page === 'pricing' ? '计费标准' : '个人信息'} — Moss API`; }, [page]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4000); return () => window.clearTimeout(timer); }, [toast]);
  const anchor = store?.anchor;
  const requests = useMemo(() => anchor ? makeRequests(anchor) : [], [anchor]);
  const context = store?.context ?? 'enterprise';
  const keys = store?.keys.filter(k => k.context === context) ?? [];
  const settledBefore = new Date(`${dateKey(clock ?? 0)}T00:00:00+08:00`).getTime();
  const total = requests.filter(r => r.context === context && r.start < settledBefore).reduce((sum, r) => sum + r.cents, 0);
  const personalBalance = 50_000 - requests.filter(r => r.context === 'personal' && r.start < settledBefore).reduce((sum, r) => sum + r.cents, 0);
  const enterpriseBalance = 1_000_000 - requests.filter(r => r.context === 'enterprise' && r.start < settledBefore).reduce((sum, r) => sum + r.cents, 0);
  const balance = context === 'enterprise' ? 1_000_000 - total : 50_000 - total;
  const persist = (next: Store) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStore(next); return null; } catch { return '保存失败，浏览器存储不可用或空间不足。请重试，当前修改尚未保存。'; } };
  const switchContext = (next: Context) => { if (!store) return; const error = persist({ ...store, context: next }); if (error) { setToast(error); return; } setAccountOpen(false); setMobileOpen(false); setSelectedKey('all'); setInfo(null); };
  const navigate = (next: Page, key = 'all') => { setPage(next); setSelectedKey(key); setMobileOpen(false); setAccountOpen(false); window.history.pushState({}, '', `/app/${next === 'keys' ? 'api-keys' : next}`); window.scrollTo({ top: 0 }); };
  const save = (key: KeyRecord) => {
    if (!store || key.context !== context) return '账户身份已变化，请关闭窗口后重试。';
    const existing = store.keys.find(k => k.id === key.id);
    if (existing?.deletedAt) return '此 Key 已删除，不能再次修改或启用。';
    if (!existing && keys.filter(k => !k.deletedAt).length >= 50) return '已达到 50 个 Key 的创建上限。';
    const error = validateKey(key.name, key.note, key.policies, contextModels(context)); if (error) return error;
    const issue = persist({ ...store, keys: existing ? store.keys.map(k => k.id === key.id ? key : k) : [key, ...store.keys] });
    if (!issue && existing) setToast(key.deletedAt ? 'API Key 已删除，历史用量仍保留' : 'API Key 已更新');
    return issue;
  };
  const external = (href: string, text: string, icon: string, arrow = false) => <a href={href} target="_blank" rel="noreferrer"><Icon name={icon} /><span>{text}</span>{arrow ? <Icon name="arrow" size={13} /> : null}</a>;
  if (signedOut) return <div className="platform-app p-signed-out"><Logo /><h1>已退出登录</h1><p>重新进入后可继续管理 API Key 与用量。</p><button className="p-button p-primary" onClick={() => setSignedOut(false)}>重新进入预览</button></div>;
  return <div className="platform-app"><a className="p-skip" href="#main-content">跳转到主要内容</a>
    <header className="p-topbar"><button className="p-icon-button p-mobile-menu" aria-label="展开导航" onClick={() => setMobileOpen(!mobileOpen)}><Icon name="menu" size={20} /></button><a href="https://platform.mosi.cn/" target="_blank" rel="noreferrer" aria-label="Moss API 控制台"><Logo /></a><div className="p-top-right"><a className="p-community" href="https://platform.mosi.cn/" target="_blank" rel="noreferrer">开发者社区</a><span className="p-language"><Icon name="language" />中文<Icon name="chevron" size={13} /></span><div className="p-top-balance"><span><Icon name="wallet" size={14} />{store ? points(balance) : '—'}</span><button onClick={() => { setCreditPack(400); setInfo('credits'); }}>充值</button></div></div></header>
    {mobileOpen ? <button className="p-mobile-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} /> : null}
    <aside className={`p-sidebar ${mobileOpen ? 'p-sidebar-open' : ''}`}><nav aria-label="控制台导航">{external('https://platform.mosi.cn/', '平台首页', 'home')}<div className="p-nav-group"><h2>开发</h2>{external('https://platform.mosi.cn/app/playground', 'Playground', 'flask')}{external('https://platform.mosi.cn/docs/getting-started/overview', 'API Docs', 'doc', true)}</div><div className="p-nav-group"><h2>配置</h2><a href="/app/api-keys" aria-current={page === 'keys' ? 'page' : undefined} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); navigate('keys'); }}><Icon name="key" /><span>API Keys</span></a></div><div className="p-nav-group"><h2>账单与用量</h2><a href="/app/usage" aria-current={page === 'usage' ? 'page' : undefined} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); navigate('usage'); }}><Icon name="chart" /><span>用量与积分</span></a><a href="/app/pricing" aria-current={page === 'pricing' ? 'page' : undefined} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); navigate('pricing'); }}><Icon name="badge" /><span>计费标准</span></a></div><div className="p-nav-group"><h2>个人中心</h2><a href="/app/profile" aria-current={page === 'profile' ? 'page' : undefined} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); navigate('profile'); }}><Icon name="user" /><span>个人信息</span></a></div></nav><div className="p-sidebar-bottom"><a href="https://mossland.studio/" target="_blank" rel="noreferrer">Mossland<Icon name="arrow" size={13} /></a><div className="p-account"><RekaMenu open={accountOpen} onOpenChange={setAccountOpen} trigger={<><span className={`p-avatar ${context === 'enterprise' ? 'p-avatar-enterprise' : ''}`}>{context === 'enterprise' ? <Icon name="building" /> : '林'}</span><span>{context === 'enterprise' ? '星河科技' : '林晓'}<small>{context === 'enterprise' ? '企业空间 · Owner' : '个人空间'}</small></span></>} items={[
      { id: 'profile', label: '个人中心', text: '个人中心', select: () => navigate('profile') },
      { id: 'contact', label: '联系客服', text: '联系客服', select: () => setInfo('contact') },
      { id: 'logout', label: '退出登录', text: '退出登录', className: 'p-account-logout', select: () => setInfo('logout') },
      { id: 'separator', type: 'separator' },
      { id: 'switch', text: context === 'enterprise' ? '切换至个人空间' : '切换至星河科技', label: context === 'enterprise' ? '切换至个人空间' : '切换至星河科技', select: () => switchContext(context === 'enterprise' ? 'personal' : 'enterprise') },
    ]} /></div></div></aside>
    {loadError ? <main id="main-content" className="p-main"><Notice>{loadError}</Notice><button className="p-button" onClick={() => window.location.reload()}>重新加载</button></main> : !store ? <main id="main-content" className="p-main"><p role="status">正在加载账户信息…</p></main> : page === 'keys' ? <Keys key={context} keys={keys} context={context} save={save} viewUsage={id => navigate('usage', id)} /> : page === 'usage' ? <Usage key={`${context}:${selectedKey}`} context={context} keys={keys} requests={requests} initialKey={selectedKey} balance={balance} getCredits={() => { setCreditPack(400); setInfo('credits'); }} /> : page === 'pricing' ? <Pricing contact={() => setInfo('contact')} context={context} getCredits={credits => { setCreditPack(credits); setInfo('credits'); }} /> : <Profile notify={setToast} />}
    {toast ? <div className="p-toast" role="status">{toast}</div> : null}
    {info === 'credits' ? <Credits initialPack={creditPack} context={context} personalBalance={personalBalance} enterpriseBalance={enterpriseBalance} close={() => setInfo(null)} contact={() => setInfo('contact')} /> : null}
    {info === 'contact' ? <Dialog title="联系客服" close={() => setInfo(null)}><div className="p-dialog-body"><p>企业授权、合同和付款问题，请联系您的客户经理或运营人员。</p><p className="p-muted">您也可以在 Moss 平台的账户菜单中打开“联系客服”，获取官方联系方式。</p></div><footer><button className="p-button" onClick={() => setInfo(null)}>关闭</button><a className="p-button p-primary" href="https://platform.mosi.cn/app/usage" target="_blank" rel="noreferrer">前往 Moss 平台<Icon name="arrow" /></a></footer></Dialog> : null}
    {info === 'logout' ? <Dialog title="退出登录" close={() => setInfo(null)} alert><div className="p-dialog-body"><p>确定退出当前账户吗？</p></div><footer><button className="p-button" data-autofocus onClick={() => setInfo(null)}>取消</button><button className="p-button p-primary" onClick={() => { setInfo(null); setSignedOut(true); }}>退出登录</button></footer></Dialog> : null}
  </div>;
}
