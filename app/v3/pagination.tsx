"use client";

export const pageSizeOptions = [5, 10, 20] as const;
export function paginationState(count: number, page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const current = Math.max(1, Math.min(page, pages));
  return { current, pages, start: count ? (current - 1) * pageSize + 1 : 0, end: Math.min(current * pageSize, count) };
}

export function Pagination({ count, page, pageSize, setPage, setPageSize, label, className = "" }: {
  count: number; page: number; pageSize: number; setPage: (page: number) => void; setPageSize: (size: number) => void; label: string; className?: string;
}) {
  const { current, pages, start, end } = paginationState(count, page, pageSize);
  return <footer className={`mvp-pagination ${className}`}>
    <span aria-live="polite">显示 {start}–{end}，共 {count} 条</span>
    <div><label><span>每页</span><select aria-label={`每页${label}数`} value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{pageSizeOptions.map(size => <option key={size} value={size}>{size} 条</option>)}</select></label>
      <nav aria-label={`${label}分页`}><button className="btn secondary" type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>上一页</button><span>{current} / {pages}</span><button className="btn secondary" type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>下一页</button></nav>
    </div>
  </footer>;
}
