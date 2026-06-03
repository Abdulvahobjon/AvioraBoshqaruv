import { cn } from '@/lib/utils/cn';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';

/**
 * Guruhlangan sarlavhali keng hisobot jadvali.
 * columns: leaf {key, header, render?(row,i), align?, mono?} yoki group {group, children:[leaf...]}.
 * Avtomatik № ustuni qo'shiladi.
 */
export function ReportTable({ columns, rows = [], loading, emptyTitle = "Ma'lumot yo'q", emptyDescription }) {
  const leaves = columns.flatMap((c) => (c.group ? c.children : [c]));
  const hasGroups = columns.some((c) => c.group);
  const colCount = leaves.length + 1;

  if (loading) {
    return (
      <div className="rounded-lg border border-stroke-sub bg-bg-1 p-4">
        <TableSkeleton rows={8} cols={Math.min(colCount, 10)} />
      </div>
    );
  }
  if (!rows.length) {
    return <EmptyState fill title={emptyTitle} description={emptyDescription} />;
  }

  const alignCls = (a) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className="h-full overflow-auto rounded-lg border border-stroke-sub">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-accent-strong text-text-white">
            <th rowSpan={hasGroups ? 2 : 1} className="whitespace-nowrap border-b border-white/15 px-3 py-2.5 text-left font-semibold">№</th>
            {columns.map((c, i) =>
              c.group ? (
                <th key={`g${i}`} colSpan={c.children.length} className="whitespace-nowrap border-b border-l border-white/15 px-3 py-2 text-center font-semibold">
                  {c.group}
                </th>
              ) : (
                <th key={c.key} rowSpan={hasGroups ? 2 : 1} className={cn('whitespace-nowrap border-b border-l border-white/15 px-3 py-2.5 font-semibold', alignCls(c.align))}>
                  {c.header}
                </th>
              ),
            )}
          </tr>
          {hasGroups && (
            <tr className="bg-accent-sub text-text-white">
              {columns.filter((c) => c.group).flatMap((c) =>
                c.children.map((ch) => (
                  <th key={ch.key} className={cn('whitespace-nowrap border-b border-l border-white/15 px-3 py-2 font-medium', alignCls(ch.align))}>
                    {ch.header}
                  </th>
                )),
              )}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id ?? ri} className="border-b border-stroke-soft transition-colors last:border-0 hover:bg-bg-1-alt">
              <td className="whitespace-nowrap px-3 py-2.5 text-text-soft">{ri + 1}</td>
              {leaves.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap border-l border-stroke-soft px-3 py-2.5 text-text-strong',
                    alignCls(c.align),
                    c.mono && 'tabular-nums',
                  )}
                >
                  {c.render ? c.render(row, ri) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
