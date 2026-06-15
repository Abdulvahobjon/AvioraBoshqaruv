import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useSaveClient } from './clientsApi';

const schema = z.object({
  name: z.string().min(1, 'Nom kiriting'),
  type: z.enum(['jismoniy', 'yuridik']),
  phone: z.string().optional(),
  email: z.string().email('Email noto\'g\'ri').optional().or(z.literal('')),
  address: z.string().optional(),
  regionId: z.coerce.number().optional(),
  managerId: z.coerce.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  note: z.string().optional(),
});

export function ClientFormDialog({ open, onClose, client, onCreated }) {
  const isEdit = !!client;
  const { data: regions } = useReference('region');
  const { data: users } = useUsersList();
  const save = useSaveClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'yuridik', status: 'active' },
  });

  useEffect(() => {
    if (open) {
      reset(
        client
          ? {
              name: client.name, type: client.type, phone: client.phone || '', email: client.email || '',
              address: client.address || '', regionId: client.regionId || '', managerId: client.managerId || '',
              status: client.status, note: client.note || '',
            }
          : { type: 'yuridik', status: 'active', name: '', phone: '', email: '', address: '', note: '' },
      );
    }
  }, [open, client, reset]);

  const managers = (users?.items || []).filter((u) =>
    ['manager', 'admin', 'superadmin'].some((r) => r === u.role || (u.roles || []).includes(r)),
  );

  const onSubmit = (values) => {
    const payload = { ...values };
    if (!payload.email) delete payload.email;
    if (!payload.regionId) delete payload.regionId;
    if (!payload.managerId) delete payload.managerId;

    save.mutate(
      { id: client?.id, ...payload },
      {
        onSuccess: (saved) => { toast.success(isEdit ? 'Mijoz yangilandi' : 'Mijoz qo\'shildi'); onCreated?.(saved); onClose(); },
        onError: (e) => toast.error(apiError(e)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
      subtitle={isEdit ? "Mijoz ma'lumotlarini yangilang" : "Yangi mijoz ma'lumotlarini kiriting"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>Saqlash</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nomi" error={errors.name?.message} required className="sm:col-span-2">
          <Input placeholder="OOO yoki F.I.O" {...register('name')} error={errors.name} />
        </FormField>
        <FormField label="Turi" required>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                <option value="yuridik">Yuridik shaxs</option>
                <option value="jismoniy">Jismoniy shaxs</option>
              </Select>
            )}
          />
        </FormField>
        <FormField label="Status">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </Select>
            )}
          />
        </FormField>
        <FormField label="Telefon">
          <Controller
            name="phone"
            control={control}
            render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
          />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input placeholder="email@example.com" {...register('email')} error={errors.email} />
        </FormField>
        <FormField label="Hudud">
          <Controller
            name="regionId"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                <option value="">— Tanlang —</option>
                {(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            )}
          />
        </FormField>
        <FormField label="Mas'ul menejer">
          <Controller
            name="managerId"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                <option value="">— Tanlang —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </Select>
            )}
          />
        </FormField>
        <FormField label="Manzil" className="sm:col-span-2">
          <Input {...register('address')} />
        </FormField>
        <FormField label="Izoh" className="sm:col-span-2">
          <Textarea {...register('note')} />
        </FormField>
      </form>
    </Dialog>
  );
}
