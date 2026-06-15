import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { formatPhone } from '@/components/ui/PhoneInput';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CLIENT_TYPE, CLIENT_STATUS } from '@/lib/constants';
import { apiError } from '@/lib/api/axios';
import { useCan } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { useClients, useDeleteClient } from '@/features/clients/clientsApi';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';

export function ClientsPage() {
  const navigate = useNavigate();
  const can = useCan();
  const canCreate = can('clients.create');
  const canUpdate = can('clients.update');
  const canDelete = can('clients.delete');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebounce(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useClients({ page, limit: 15, search: debounced, status: status || undefined });
  const del = useDeleteClient();

  const columns = [
    {
      key: 'name', header: 'Mijoz', sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-text-strong">{r.name}</p>
          <p className="text-xs text-text-soft">{CLIENT_TYPE[r.type]}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Telefon', render: (r) => formatPhone(r.phone) || '—' },
    { key: 'region', header: 'Hudud', render: (r) => r.region?.name || '—' },
    { key: 'manager', header: "Mas'ul", render: (r) => r.manager?.fullName || '—' },
    { key: 'projects', header: 'Loyihalar', render: (r) => r._count?.projects ?? 0 },
    {
      key: 'status', header: 'Status',
      render: (r) => <Badge tone={CLIENT_STATUS[r.status]?.tone}>{CLIENT_STATUS[r.status]?.label}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canUpdate && (
            <button className="rounded p-1.5 text-icon-sub hover:bg-bg-2" onClick={() => { setEditing(r); setFormOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(r)}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const confirmDelete = () => {
    del.mutate(deleting.id, {
      onSuccess: () => { toast.success('Mijoz o\'chirildi'); setDeleting(null); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Mijozlar"
        subtitle="CRM — mijozlar bazasi"
        actions={
          canCreate && (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Yangi mijoz
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input
            placeholder="Nom, telefon yoki email bo'yicha qidirish..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select className="sm:w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Barcha statuslar</option>
          <option value="active">Faol</option>
          <option value="inactive">Nofaol</option>
        </Select>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={data?.items}
          loading={isLoading}
          onRowClick={(r) => navigate(`/clients/${r.id}`)}
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          onPageChange={setPage}
          emptyTitle="Mijozlar yo'q"
          emptyDescription="Birinchi mijozni qo'shish uchun yuqoridagi tugmani bosing."
          transparent
          fill
        />
      </div>

      <ClientFormDialog open={formOpen} onClose={() => setFormOpen(false)} client={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        message={`"${deleting?.name}" mijozini o'chirmoqchimisiz?`}
      />
    </div>
  );
}
