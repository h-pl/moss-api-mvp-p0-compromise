'use client';
import { Children, isValidElement, ReactNode, useEffect, useState } from 'react';
import { RekaDialog, RekaSelect, RekaSwitch, RekaCheckbox, RekaHelp } from './reka';

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z" /></>,
    flask: <><path d="M9 3h6M10 3v7L4 20h16l-6-10V3M7 15h10" /></>,
    doc: <><path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h6" /></>,
    key: <><path d="M14 3a6 6 0 0 0-5.7 8L3 16v5h5v-3h3l3-3a6 6 0 1 0 0-12Z" /><circle cx="16" cy="7" r="1" /></>,
    chart: <><path d="m3 16 6-6 4 3 8-9M16 4h5v5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    badge: <><path d="m12 2 3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1Z" /><path d="m8 12 3 3 5-6" /></>,
    user: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="3" /><path d="M6 19v-1a6 6 0 0 1 12 0v1" /></>,
    person: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></>,
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    edit: <><path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z" /></>,
    trash: <><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></>,
    wallet: <><path d="M20 8H4V4h14v4M4 8v12h16V8M20 12h-6v4h6" /></>,
    print: <><path d="M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6Z" /><path d="M17 12h1" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v13h5" /></>,
    success: <><circle cx="12" cy="12" r="11" fill="#2dce72" stroke="none" /><path d="m7 12 3 3 7-7" stroke="white" strokeWidth="2" /></>,
    infoSolid: <><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" /><path d="M12 11v6M12 7v1" stroke="white" strokeWidth="2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></>,
    building: <><path d="M4 21V3h12v18M16 9h4v12M8 7h4M8 11h4M8 15h4M2 21h20" /></>,
    language: <><path d="M3 5h12M9 2v3M5 5c1 6 5 9 9 11M13 5c-1 6-5 9-10 11M14 21l4-11 4 11M15 18h6" /></>,
    menu: <path d="M3 5h18M3 12h18M3 19h18" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.info}</svg>;
}
export function Logo() { return <span className="p-logo"><svg width="129" height="20" viewBox="0 0 129 20" aria-label="Moss API" role="img"><image href="/platform/logo-brand.svg" width="129" height="20" /></svg></span>; }
/** Actual Vue + Reka UI components; React remains the business-page host. */
export const Dialog = RekaDialog;
function optionText(node: ReactNode): string { return Children.toArray(node).map(child => isValidElement<{children?: ReactNode}>(child) ? optionText(child.props.children) : String(child)).join(''); }
export function Select({ value, onValueChange, children, className = '', 'aria-label': label }: { value: string | number; onValueChange: (value: string) => void; children: ReactNode; className?: string; 'aria-label': string }) {
  const options = Children.toArray(children).filter(isValidElement<{ value: string | number; children: ReactNode }>).map(option => ({ value: String(option.props.value), label: optionText(option.props.children) }));
  return <RekaSelect value={String(value)} onValueChange={onValueChange} options={options} className={className} label={label} />;
}
export const ToggleSwitch = RekaSwitch;
export const Checkbox = RekaCheckbox;
export function Pagination({ count, page, pageSize, setPage, setPageSize }: { count: number; page: number; pageSize: number; setPage: (n: number) => void; setPageSize: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return <div className="p-pagination"><span>共 {count.toLocaleString()} 条</span><div><Select aria-label="每页条数" value={pageSize} onValueChange={value => { setPageSize(Number(value)); setPage(1); }}>{[5, 10, 20].map(n => <option key={n} value={n}>{n} 条 / 页</option>)}</Select><button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>;
}
export function Notice({ children }: { children: ReactNode }) { return <div className="p-notice"><Icon name="info" /> <span>{children}</span></div>; }
export const Help = RekaHelp;
export function Empty({ children }: { children: ReactNode }) { return <div className="p-empty">{children}</div>; }

export function SuccessToast({ children }: { children: ReactNode }) { const [visible, setVisible] = useState(true); useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 4000); return () => window.clearTimeout(timer); }, []); return visible ? <div className="p-toast p-toast-success" role="status"><Icon name="success" size={20} />{children}</div> : null; }
