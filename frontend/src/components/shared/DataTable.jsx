import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from './EmptyState';

/**
 * Reusable table with sticky header, row click, sorting hooks, and pagination.
 * columns: [{ key, header, render?(row), sortable?, className? }]
 */
export function DataTable({
  columns,
  data = [],
  loading,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  emptyTitle,
  emptyDescription,
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-stroke-sub bg-bg-1 p-4">
        <TableSkeleton rows={6} cols={columns.length} />
      </div>
    );
  }

  if (!data.length) {
    return <EmptyState fill title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stroke-sub bg-bg-1">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke-sub bg-bg-1-alt">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-text-sub whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:text-text-strong',
                    col.className,
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <ChevronsUpDown
                        className={cn('h-3.5 w-3.5', sortBy === col.key ? 'text-icon-accent' : 'text-icon-soft')}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-stroke-soft last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-bg-1-alt',
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-text-strong', col.cellClassName)}>
                    {col.render ? col.render(row, i) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stroke-sub px-4 py-3">
          <span className="text-xs text-text-sub">
            Jami: {total} ta · {page}/{totalPages} sahifa
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="rounded-md p-1.5 text-icon-sub hover:bg-bg-2 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="rounded-md p-1.5 text-icon-sub hover:bg-bg-2 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
