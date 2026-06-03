import { useRef, useState } from 'react';
import { Search, Filter, X, FileCheck2, Printer, Download, ChevronDown, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import { apiError } from '@/lib/api/axios';
import { exportReport, printReport } from './reportsApi';

/** Sarlavha yonidagi amallar: Chop etish + Yuklab olish (Excel/PDF/CSV). */
export function ReportExportActions({ type, params }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setOpen(false);
    try { await fn(); } catch (e) { toast.error(apiError(e, 'Xatolik')); } finally { setBusy(false); }
  };

  const formats = [
    { key: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
    { key: 'pdf', label: 'PDF', icon: FileText },
    { key: 'csv', label: 'CSV', icon: FileType },
  ];

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => run(() => printReport({ type, params }))} loading={busy}>
        <Printer className="h-4 w-4" /> Chop etish
      </Button>
      <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>
        <Button onClick={() => setOpen((o) => !o)} loading={busy}>
          <Download className="h-4 w-4" /> Yuklab olish <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
        {open && (
          <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg border border-stroke-sub bg-bg-base py-1 shadow-elevated">
            {formats.map((f) => (
              <button
                key={f.key}
                onClick={() => run(() => exportReport({ type, format: f.key, params }))}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-text-sub transition-colors hover:bg-bg-1-alt hover:text-text-strong"
              >
                <f.icon className="h-4 w-4" /> {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Qidiruv + Filtrlash (yashirish/ko'rsatish) + Tozalash + Shakllantirish. */
export function ReportToolbar({ search, onSearch, filtersOpen, onToggleFilters, onClear, hasFilters, onGenerate, generating }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
        <Input placeholder="Izlash" className="pl-9" value={search} onChange={(e) => onSearch(e.target.value)} />
      </div>
      <Button variant="outline" onClick={onToggleFilters}>
        <Filter className="h-4 w-4" /> Filtrlash <ChevronDown className={cn('h-4 w-4 transition-transform', filtersOpen && 'rotate-180')} />
      </Button>
      {hasFilters && (
        <button onClick={onClear} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-error-strong transition-colors hover:bg-error-soft">
          <X className="h-4 w-4" /> Tozalash
        </button>
      )}
      <Button className="ml-auto" onClick={onGenerate} loading={generating}>
        <FileCheck2 className="h-4 w-4" /> Shakllantirish
      </Button>
    </div>
  );
}
