import { useState, useEffect } from 'react';
import { Trash2, ExternalLink, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { APPLICATION_STATUS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import {
  useApplications, useReviewApplication, useDeleteApplication,
} from '@/features/applications/applicationsApi';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

function StatusBadge({ status }) {
  const s = APPLICATION_STATUS[status] || { label: status, tone: 'neutral' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ApplicationsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useApplications({ status: status || undefined, search: search || undefined, page });
  const del = useDeleteApplication();
  const canDelete = ['superadmin', 'admin'].includes(role);

  const columns = [
    { key: 'fullName', header: 'F.I.O', render: (r) => <span className="font-medium text-text-strong">{r.fullName}</span> },
    { key: 'position', header: 'Yo\'nalish', render: (r) => r.position?.name || '—' },
    { key: 'region', header: 'Viloyat', render: (r) => r.region?.name || '—' },
    { key: 'phone', header: 'Telefon', render: (r) => r.phone || '—' },
    { key: 'createdAt', header: 'Sana', render: (r) => formatDate(r.createdAt) },
    { key: 'status', header: 'Holat', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => canDelete && (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Arizalar" subtitle="Nomzodlar arizalari (HR)" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input className="pl-9" placeholder="F.I.O yoki telefon..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44">
          <option value="">Barcha holatlar</option>
          {Object.entries(APPLICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items}
        loading={isLoading}
        onRowClick={(r) => setDetail(r)}
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
        emptyTitle="Arizalar yo'q"
        emptyDescription="Hozircha hech qanday ariza tushmagan."
      />

      <ApplicationDetailDialog open={!!detail} onClose={() => setDetail(null)} application={detail} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message="Bu arizani o'chirmoqchimisiz?"
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-stroke-soft py-2 last:border-0">
      <span className="text-xs text-text-sub">{label}</span>
      <span className="text-sm text-text-strong">{value || '—'}</span>
    </div>
  );
}

function ApplicationDetailDialog({ open, onClose, application }) {
  const review = useReviewApplication();
  const a = application;
  const [status, setStatus] = useState('pending');
  const [conclusion, setConclusion] = useState('');

  useEffect(() => {
    if (a) { setStatus(a.status); setConclusion(a.conclusion || ''); }
  }, [a]);

  const onReview = () => {
    if ((status === 'accepted' || status === 'rejected') && !conclusion.trim()) {
      toast.error('Xulosa kiritilishi shart');
      return;
    }
    review.mutate(
      { id: a.id, status, conclusion: conclusion || undefined },
      { onSuccess: () => { toast.success('Saqlandi'); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  if (!a) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={a.fullName}
      footer={<><Button variant="outline" onClick={onClose}>Yopish</Button><Button onClick={onReview} loading={review.isPending}>Saqlash</Button></>}
    >
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Row label="F.I.O" value={a.fullName} />
        <Row label="Tug'ilgan sana" value={a.birthDate ? formatDate(a.birthDate) : '—'} />
        <Row label="Telefon" value={a.phone} />
        <Row label="Telegram" value={a.telegram ? <a className="text-accent-strong hover:underline" href={a.telegram} target="_blank" rel="noreferrer">{a.telegram}</a> : '—'} />
        <Row label="Talaba" value={a.isStudent ? 'Ha' : 'Yo\'q'} />
        <Row label="O'qish joyi" value={a.university} />
        <Row label="Viloyat" value={a.region?.name} />
        <Row label="Tuman" value={a.district?.name} />
        <Row label="Yo'nalish" value={a.position?.name} />
        <Row label="Portfolio" value={a.portfolio ? <a className="text-accent-strong hover:underline" href={a.portfolio} target="_blank" rel="noreferrer">Havola <ExternalLink className="inline h-3 w-3" /></a> : '—'} />
        <Row
          label="Rezyume"
          value={a.resume ? <a className="inline-flex items-center gap-1 text-accent-strong hover:underline" href={API_ORIGIN + a.resume} target="_blank" rel="noreferrer"><FileText className="h-3.5 w-3.5" /> PDF</a> : '—'}
        />
        <Row label="Holat" value={<StatusBadge status={a.status} />} />
      </div>
      {a.extraInfo && <div className="mt-2 rounded-lg bg-bg-1-alt p-3 text-sm text-text-strong">{a.extraInfo}</div>}
      {a.reviewer && (
        <p className="mt-2 text-xs text-text-sub">
          Ko'rib chiqdi: {a.reviewer.fullName} · {formatDate(a.reviewedAt)}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-stroke-sub pt-4">
        <FormField label="Holatni o'zgartirish">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(APPLICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
        <FormField
          label="Xulosa"
          required={status === 'accepted' || status === 'rejected'}
          hint="Qabul qilish yoki rad etishda majburiy"
        >
          <Textarea rows={3} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
        </FormField>
      </div>
    </Dialog>
  );
}
