import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';

/**
 * Guruhlangan sarlavhali keng hisobot jadvali.
 * columns: leaf {key, header, render?(row,i), align?, mono?} yoki group {group, children:[leaf...]}.
 * Avtomatik № ustuni qo'shiladi.
 *
 * Ustunni "qotirish" (muzlatish): har bir top-level ustun sarlavhasidagi 📌 tugma bosilsa,
 * o'sha ustun chap chetga yopishib qoladi — gorizontal (x) scroll bo'lganda ham ekrandan chiqmaydi.
 */
export function ReportTable({ columns, rows = [], loading, emptyTitle = "Ma'lumot yo'q", emptyDescription }) {
  const leaves = columns.flatMap((c) => (c.group ? c.children : [c]));
  const hasGroups = columns.some((c) => c.group);
  const colCount = leaves.length + 1;

  // Qotirilgan (muzlatilgan) ustun kalitlari — faqat top-level (guruh bo'lmagan) ustunlar qotiriladi.
  const [pinned, setPinned] = useState(() => new Set());
  const headerRefs = useRef({}); // key -> <th>
  const indexRef = useRef(null);
  const [offsets, setOffsets] = useState({ index: 0 }); // key -> left px

  const measure = () => {
    const iw = indexRef.current?.offsetWidth || 0;
    const off = { index: 0 };
    let acc = iw;
    for (const l of leaves) {
      if (pinned.has(l.key)) {
        off[l.key] = acc;
        acc += headerRefs.current[l.key]?.offsetWidth || 0;
      }
    }
    setOffsets(off);
  };

  useLayoutEffect(() => { measure(); /* eslint-disable-next-line */ }, [pinned, rows, columns]);
  useEffect(() => {
    const h = () => measure();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
    // eslint-disable-next-line
  }, [pinned, columns]);

  const togglePin = (key) =>
    setPinned((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

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
  const isPinned = (key) => pinned.has(key);

  return (
    <div className="h-full overflow-auto rounded-lg border border-stroke-sub">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-accent-strong text-text-white">
            <th
              ref={indexRef}
              rowSpan={hasGroups ? 2 : 1}
              className="sticky left-0 z-30 whitespace-nowrap border-b border-white/15 bg-accent-strong px-3 py-2.5 text-left font-semibold"
            >
              №
            </th>
            {columns.map((c, i) =>
              c.group ? (
                <th key={`g${i}`} colSpan={c.children.length} className="whitespace-nowrap border-b border-l border-white/15 px-3 py-2 text-center font-semibold">
                  {c.group}
                </th>
              ) : (
                <th
                  key={c.key}
                  ref={(el) => (headerRefs.current[c.key] = el)}
                  rowSpan={hasGroups ? 2 : 1}
                  style={isPinned(c.key) ? { left: offsets[c.key] ?? 0 } : undefined}
                  className={cn(
                    'whitespace-nowrap border-b border-l border-white/15 px-3 py-2.5 font-semibold',
                    alignCls(c.align),
                    isPinned(c.key) && 'sticky z-30 bg-accent-strong',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => togglePin(c.key)}
                      title={isPinned(c.key) ? 'Qotirishni bekor qilish' : 'Ustunni qotirish (muzlatish)'}
                      className={cn(
                        'shrink-0 rounded p-0.5 transition-colors hover:bg-white/20',
                        isPinned(c.key) ? 'text-text-white' : 'text-white/45',
                      )}
                    >
                      <Pin className={cn('h-3.5 w-3.5', isPinned(c.key) && 'fill-current')} />
                    </button>
                    {c.header}
                  </span>
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
            <tr key={row.id ?? ri} className="group/row border-b border-stroke-soft transition-colors last:border-0 hover:bg-bg-1-alt">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-bg-base px-3 py-2.5 text-text-soft group-hover/row:bg-bg-1-alt">{ri + 1}</td>
              {leaves.map((c) => (
                <td
                  key={c.key}
                  style={isPinned(c.key) ? { left: offsets[c.key] ?? 0 } : undefined}
                  className={cn(
                    'whitespace-nowrap border-l border-stroke-soft px-3 py-2.5 text-text-strong',
                    alignCls(c.align),
                    c.mono && 'tabular-nums',
                    isPinned(c.key) && 'sticky z-10 bg-bg-base group-hover/row:bg-bg-1-alt',
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
