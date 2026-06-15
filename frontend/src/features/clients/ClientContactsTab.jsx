import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Phone, Mail, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { PhoneInput, formatPhone } from '@/components/ui/PhoneInput';
import { Switch } from '@/components/ui/Switch';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { apiError } from '@/lib/api/axios';
import { useSaveClientContact, useDeleteClientContact } from './clientsApi';

const EMPTY = { name: '', position: '', phone: '', email: '', isPrimary: false };

export function ClientContactsTab({ clientId, contacts = [], canManage }) {
  const [dialog, setDialog] = useState(null); // null | {…contact} | EMPTY
  const [deleting, setDeleting] = useState(null);
  const save = useSaveClientContact();
  const del = useDeleteClientContact();

  const confirmDelete = () =>
    del.mutate(
      { clientId, contactId: deleting.id },
      { onSuccess: () => { toast.success('Kontakt o\'chirildi'); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) },
    );

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialog(EMPTY)}><Plus className="h-4 w-4" /> Kontakt qo'shish</Button>
        </div>
      )}

      {contacts.length === 0 ? (
        <EmptyState title="Kontaktlar yo'q" description="Bu mijoz uchun aloqa shaxslari qo'shilmagan." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-lg border border-stroke-soft p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-1 text-icon-accent">
                    <User className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium text-text-strong">
                      {c.name}
                      {c.isPrimary && <Badge tone="info" className="gap-0.5"><Star className="h-3 w-3" /> Asosiy</Badge>}
                    </p>
                    {c.position && <p className="truncate text-xs text-text-soft">{c.position}</p>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <button className="rounded p-1.5 text-icon-sub hover:bg-bg-2" onClick={() => setDialog(c)}><Pencil className="h-4 w-4" /></button>
                    <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-text-sub hover:text-text-accent"><Phone className="h-3.5 w-3.5" /> {formatPhone(c.phone)}</a>}
                {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-text-sub hover:text-text-accent"><Mail className="h-3.5 w-3.5" /> {c.email}</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <ContactDialog
          clientId={clientId}
          contact={dialog.id ? dialog : null}
          onClose={() => setDialog(null)}
          save={save}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        message={`"${deleting?.name}" kontaktini o'chirmoqchimisiz?`}
      />
    </div>
  );
}

function ContactDialog({ clientId, contact, onClose, save }) {
  const isEdit = !!contact;
  const [f, setF] = useState(contact ? { ...EMPTY, ...contact } : EMPTY);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.name.trim()) { toast.error('Kontakt ismini kiriting'); return; }
    save.mutate(
      { clientId, contactId: contact?.id, name: f.name.trim(), position: f.position || undefined, phone: f.phone || undefined, email: f.email || undefined, isPrimary: f.isPrimary },
      { onSuccess: () => { toast.success(isEdit ? 'Kontakt yangilandi' : 'Kontakt qo\'shildi'); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={isEdit ? 'Kontaktni tahrirlash' : 'Yangi kontakt'}
      footer={<><Button variant="outline" onClick={onClose}>Bekor qilish</Button><Button onClick={submit} loading={save.isPending}>Saqlash</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Ism" required className="sm:col-span-2">
          <Input placeholder="F.I.O" value={f.name} onChange={(e) => set('name', e.target.value)} />
        </FormField>
        <FormField label="Lavozim">
          <Input placeholder="Direktor, buxgalter..." value={f.position} onChange={(e) => set('position', e.target.value)} />
        </FormField>
        <FormField label="Telefon">
          <PhoneInput value={f.phone} onChange={(v) => set('phone', v)} />
        </FormField>
        <FormField label="Email" className="sm:col-span-2">
          <Input placeholder="email@example.com" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </FormField>
        <label className="flex items-center gap-2 sm:col-span-2">
          <Switch checked={f.isPrimary} onChange={(v) => set('isPrimary', v)} />
          <span className="text-sm text-text-sub">Asosiy kontakt</span>
        </label>
      </div>
    </Dialog>
  );
}
