import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { AUDIT_ACTION } from '@/lib/constants';
import { formatDate } from '@/lib/utils/format';
import { api } from '@/lib/api/axios';

function useAudit(params) {
  return useQuery({ queryKey: ['audit', params], queryFn: async () => (await api.get('/audit', { params })).data });
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [flagged, setFlagged] = useState('');
  const { data, isLoading } = useAudit({ page, limit: 25, action: action || undefined, flagged: flagged || undefined });

  const items = data?.items || [];

  return (
    <div>
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

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="Yozuvlar yo'q" />
      ) : (
        <Card className="divide-y divide-stroke-soft">
          {items.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-4">
              <Avatar name={log.user?.fullName || 'Tizim'} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-strong">{log.user?.fullName || 'Tizim'}</span>
                  <Badge tone={AUDIT_ACTION[log.action]?.tone || 'neutral'}>{AUDIT_ACTION[log.action]?.label || log.action}</Badge>
                  <span className="text-sm text-text-sub">{log.entity}{log.entityId ? ` #${log.entityId}` : ''}</span>
                  {log.flagged && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error-soft px-2 py-0.5 text-xs text-error-strong">
                      <ShieldAlert className="h-3 w-3" /> Shubhali
                    </span>
                  )}
                </div>
                {(log.oldValue || log.newValue) && (
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-soft">
                    {log.oldValue && <span>Eski: <code className="text-text-sub">{JSON.stringify(log.oldValue)}</code></span>}
                    {log.newValue && <span>Yangi: <code className="text-text-sub">{JSON.stringify(log.newValue)}</code></span>}
                  </div>
                )}
                <p className="mt-1 text-xs text-text-soft">{formatDate(log.createdAt, true)}{log.ip ? ` · ${log.ip}` : ''}</p>
              </div>
            </div>
          ))}
        </Card>
      )}

      {data?.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-text-sub">Jami: {data.total} · {page}/{data.totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-stroke-sub p-1.5 text-icon-sub disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-stroke-sub p-1.5 text-icon-sub disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
