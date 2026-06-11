import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { AUDIT_ACTION } from '@/lib/constants';
import { formatDate } from '@/lib/utils/format';
import { api } from '@/lib/api/axios';
import { AuditDetailDialog } from '@/features/audit/AuditDetailDialog';

function useAudit(params) {
  return useQuery({ queryKey: ['audit', params], queryFn: async () => (await api.get('/audit', { params })).data });
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [flagged, setFlagged] = useState('');
  const [selected, setSelected] = useState(null);
  const { data, isLoading } = useAudit({ page, limit: 25, action: action || undefined, flagged: flagged || undefined });

  const items = data?.items || [];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Qotib turuvchi yuqori qism: sarlavha + filtrlar */}
      <div className="shrink-0">
        <PageHeader title="Audit log" subtitle="Tizimdagi barcha o'zgarishlar tarixi" />

        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="w-44">
            <option value="">Barcha amallar</option>
            {Object.entries(AUDIT_ACTION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select value={flagged} onChange={(e) => { setFlagged(e.target.value); setPage(1); }} className="w-44">
            <option value="">Barchasi</option>
            <option value="true">Faqat shubhali</option>
          </Select>
        </div>
      </div>

      {/* Faqat shu qism scroll bo'ladi */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState fill title="Yozuvlar yo'q" />
      ) : (
        <div className="divide-y divide-stroke-soft">
          {items.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => setSelected(log)}
              className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-bg-1-alt"
            >
              <Avatar name={log.user?.fullName || 'Tizim'} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-strong">{log.user?.fullName || 'Tizim'}</span>
                  <Badge tone={AUDIT_ACTION[log.action]?.tone || 'neutral'}>{AUDIT_ACTION[log.action]?.label || log.action}</Badge>
                  <span className="text-sm text-text-sub">{log.entity}{log.entityId ? ` #${log.entityId}` : ''}</span>
                  {log.flagged && (
                    <Badge tone="error" className="gap-1"><ShieldAlert className="h-3 w-3" /> Shubhali</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-soft">{formatDate(log.createdAt, true)}{log.ip ? ` · ${log.ip}` : ''}</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-icon-soft" />
            </button>
          ))}
        </div>
      )}
      </div>

      {data?.totalPages > 1 && (
        <div className="mt-4 flex shrink-0 items-center justify-between">
          <span className="text-xs text-text-sub">Jami: {data.total} · {page}/{data.totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-stroke-sub p-1.5 text-icon-sub disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-stroke-sub p-1.5 text-icon-sub disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <AuditDetailDialog open={!!selected} onClose={() => setSelected(null)} log={selected} />
    </div>
  );
}
