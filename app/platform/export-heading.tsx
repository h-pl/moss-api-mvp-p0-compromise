import { ReactNode } from 'react';

export default function ExportHeading({ account, from, to, scope, description }: { account: string; from: string; to: string; scope: string; description?: ReactNode }) {
  return <><div className="p-export-meta"><strong>{account}</strong><span>{from} 至 {to} · 北京时间</span><span>{scope}</span></div>{description ? <p className="p-export-description">{description}</p> : null}</>;
}
