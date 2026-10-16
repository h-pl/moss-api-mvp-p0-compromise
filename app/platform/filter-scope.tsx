export type FilterScope = { key: string; allKeys: boolean; keyCount: number };

export default function FilterScopeSummary({ scope }: { scope: FilterScope }) {
  if (scope.allKeys) return null;
  return <dl className="p-bill-scope" aria-label="API Key 筛选">
    <dt>API Key：</dt><dd title={scope.key}>
      <span className="p-bill-scope-names">{scope.key}</span>
      <span className="p-bill-scope-count">共 {scope.keyCount} 个</span>
    </dd>
  </dl>;
}
