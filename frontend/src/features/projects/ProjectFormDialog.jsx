import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AntDate } from '@/components/ui/AntDate';
import { Avatar } from '@/components/ui/Avatar';
import { apiError } from '@/lib/api/axios';
import { toTiyin, fromTiyin } from '@/lib/utils/format';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useClients } from '@/features/clients/clientsApi';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { QuickReferenceDialog } from '@/features/settings/QuickReferenceDialog';
import { ParticipantPicker } from '@/features/meetings/ParticipantPicker';
import { useSaveProject } from './projectsApi';

export function ProjectFormDialog({ open, onClose, project }) {
  const isEdit = !!project;
  const { data: types } = useReference('projectType');
  const { data: users } = useUsersList();
  const { data: clients } = useClients({ limit: 100 });
  const save = useSaveProject();

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [members, setMembers] = useState([]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const userOptions = users?.items || [];
  const getUser = (id) => userOptions.find((u) => u.id === id);

  useEffect(() => {
    if (!open) return;
    if (project) {
      reset({
        name: project.name, code: project.code || '', typeId: project.typeId || '', description: project.description || '',
        deadline: project.deadline ? project.deadline.slice(0, 10) : '', status: project.status,
        price: fromTiyin(project.price), currency: project.currency, paymentStatus: project.paymentStatus,
        clientId: project.clientId || '',
      });
      setMembers((project.members || []).map((m) => ({
        userId: m.userId, roleInProject: m.roleInProject,
        shareAmount: fromTiyin(m.shareAmount), shareCurrency: m.shareCurrency,
      })));
    } else {
      reset({ name: '', code: '', typeId: '', description: '', deadline: '', status: 'planning', price: '', currency: 'UZS', paymentStatus: 'unpaid', clientId: '' });
      setMembers([]);
    }
  }, [open, project, reset]);

  const updateMember = (userId, field, value) =>
    setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, [field]: value } : m)));

  // Merge picker selection into members, preserving existing role/share
  const onPickMembers = (ids) => {
    setMembers((prev) => {
      const byId = Object.fromEntries(prev.map((m) => [m.userId, m]));
      return ids.map((id) => byId[id] || { userId: id, roleInProject: 'employee', shareAmount: '', shareCurrency: 'UZS' });
    });
  };

  const onSubmit = (values) => {
    const validMembers = members
      .filter((m) => m.userId)
      .map((m) => ({
        userId: Number(m.userId),
        roleInProject: m.roleInProject,
        shareAmount: toTiyin(m.shareAmount || 0),
        shareCurrency: m.shareCurrency,
      }));

    const payload = {
      name: values.name,
      code: values.code || undefined,
      typeId: values.typeId ? Number(values.typeId) : undefined,
      description: values.description || undefined,
      deadline: values.deadline || undefined,
      status: values.status,
      price: toTiyin(values.price || 0),
      currency: values.currency,
      paymentStatus: values.paymentStatus,
      clientId: values.clientId ? Number(values.clientId) : undefined,
      members: validMembers,
    };

    save.mutate(
      { id: project?.id, ...payload },
      {
        onSuccess: () => { toast.success(isEdit ? 'Loyiha yangilandi' : 'Loyiha yaratildi'); onClose(); },
        onError: (e) => toast.error(apiError(e)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Loyihani tahrirlash' : 'Yangi loyiha'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>Saqlash</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Loyiha nomi" required error={errors.name && 'Nom kiriting'}>
            <Input {...register('name', { required: true })} error={errors.name} />
          </FormField>
          <FormField label="Kod (UID prefiksi)" hint="Masalan DSR — yig'ilish kodlari uchun">
            <Input placeholder="DSR" {...register('code')} />
          </FormField>

          {/* Type with inline add */}
          <FormField label="Turi">
            <div className="flex gap-2">
              <Select {...register('typeId')} className="flex-1">
                <option value="">— Tanlang —</option>
                {(types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Button type="button" variant="outline" size="icon" title="Yangi tur qo'shish" onClick={() => setTypeOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormField>

          {/* Client with inline add */}
          <FormField label="Mijoz">
            <div className="flex gap-2">
              <Select {...register('clientId')} className="flex-1">
                <option value="">— Tanlang —</option>
                {(clients?.items || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button type="button" variant="outline" size="icon" title="Yangi mijoz qo'shish" onClick={() => setClientOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormField>

          <FormField label="Summa (Price)" required error={errors.price && 'Summa kiriting'}>
            <Input type="number" min="0" step="any" placeholder="0" {...register('price', { required: true })} error={errors.price} />
          </FormField>
          <FormField label="Valuta">
            <Select {...register('currency')}>
              <option value="UZS">so'm (UZS)</option>
              <option value="USD">dollar (USD)</option>
            </Select>
          </FormField>
          <FormField label="Deadline">
            <Controller name="deadline" control={control} render={({ field }) => <AntDate value={field.value} onChange={field.onChange} />} />
          </FormField>
          <FormField label="Status">
            <Select {...register('status')}>
              <option value="planning">Rejalashtirilgan</option>
              <option value="active">Faol</option>
              <option value="overdue">Kechikkan</option>
              <option value="completed">Yakunlangan</option>
              <option value="cancelled">Bekor qilingan</option>
            </Select>
          </FormField>
          <FormField label="To'lov holati">
            <Select {...register('paymentStatus')}>
              <option value="unpaid">To'lanmagan</option>
              <option value="paid">To'langan</option>
            </Select>
          </FormField>
          <FormField label="Tavsif" className="sm:col-span-2">
            <Textarea {...register('description')} />
          </FormField>
        </div>

        {/* Team + shares — improved */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-text-sub">Jamoa va ulushlar</label>
            <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              <UserPlus className="h-4 w-4" /> A'zo qo'shish
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stroke-strong p-5 text-center">
              <p className="text-sm text-text-soft">Jamoa a'zolari yo'q. "A'zo qo'shish" orqali tanlang.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const u = getUser(m.userId);
                return (
                  <div key={m.userId} className="flex flex-wrap items-center gap-2 rounded-lg border border-stroke-soft p-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar name={u?.fullName} src={u?.avatar} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-strong">{u?.fullName || 'Xodim'}</p>
                        <p className="truncate text-xs text-text-soft">{u?.position?.name || '—'}</p>
                      </div>
                    </div>
                    <Select className="h-9 w-28" value={m.roleInProject} onChange={(e) => updateMember(m.userId, 'roleInProject', e.target.value)}>
                      <option value="manager">Menejer</option>
                      <option value="employee">Xodim</option>
                    </Select>
                    <Input className="h-9 w-28" type="number" min="0" placeholder="Ulush" value={m.shareAmount} onChange={(e) => updateMember(m.userId, 'shareAmount', e.target.value)} />
                    <Select className="h-9 w-20" value={m.shareCurrency} onChange={(e) => updateMember(m.userId, 'shareCurrency', e.target.value)}>
                      <option value="UZS">so'm</option>
                      <option value="USD">$</option>
                    </Select>
                    <button type="button" className="rounded-md p-2 text-error-strong hover:bg-error-soft" onClick={() => setMembers((prev) => prev.filter((x) => x.userId !== m.userId))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>

      {/* Inline add: project type */}
      <QuickReferenceDialog
        open={typeOpen}
        onClose={() => setTypeOpen(false)}
        model="projectType"
        title="Yangi loyiha turi"
        label="Tur nomi"
        onCreated={(t) => setValue('typeId', String(t.id))}
      />

      {/* Inline add: client */}
      <ClientFormDialog
        open={clientOpen}
        onClose={() => setClientOpen(false)}
        onCreated={(c) => setValue('clientId', String(c.id))}
      />

      {/* Member picker */}
      <ParticipantPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        users={userOptions}
        value={members.map((m) => m.userId)}
        onConfirm={onPickMembers}
      />
    </Dialog>
  );
}
