import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, UserPlus, X, ChevronDown } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PercentInput } from '@/components/ui/PercentInput';
import { RHFSelect } from '@/components/ui/RHFSelect';
import { Switch } from '@/components/ui/Switch';
import { FormField } from '@/components/ui/FormField';
import { AntDate } from '@/components/ui/AntDate';
import { cn } from '@/lib/utils/cn';
import { PROJECT_STATUS, PAYMENT_STATUS, CURRENCIES } from '@/lib/constants';
import { apiError } from '@/lib/api/axios';
import { toTiyin, fromTiyin } from '@/lib/utils/format';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useClients } from '@/features/clients/clientsApi';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { QuickReferenceDialog } from '@/features/settings/QuickReferenceDialog';
import { ParticipantPicker } from '@/features/meetings/ParticipantPicker';
import { useSaveProject, useProject } from './projectsApi';

/** Tanlangan a'zolar chip ro'yxati (Figma: "Ism | Lavozim ✕"). */
function MemberChips({ ids, getUser, onRemove }) {
  return (
    <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border border-stroke-strong bg-bg-base p-2.5">
      {ids.map((id) => {
        const u = getUser(id);
        return (
          <span key={id} className="inline-flex items-center gap-2 rounded-md bg-bg-1-alt py-1 pl-2.5 pr-1.5 text-sm text-text-strong">
            <span className="truncate">{u?.fullName || 'Xodim'} | {u?.position?.name || '—'}</span>
            <button type="button" className="text-icon-soft hover:text-error-strong" onClick={() => onRemove(id)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function ProjectFormDialog({ open, onClose, project }) {
  const isEdit = !!project;
  const { data: types } = useReference('projectType');
  const { data: users } = useUsersList();
  const { data: clients } = useClients({ limit: 100 });
  const save = useSaveProject();
  // Tahrirlashda to'liq ma'lumot (a'zolar, sinovchilar, hujjatlar) ro'yxatda bo'lmaydi — detalni alohida yuklaymiz.
  const { data: full } = useProject(open && project?.id ? project.id : undefined);

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [employees, setEmployees] = useState([]); // [{ userId, shareAmount, shareCurrency }]
  const [testers, setTesters] = useState([]); // userId massivi
  const [docs, setDocs] = useState([]); // { name, url }
  const [faolmi, setFaolmi] = useState(true); // !isFrozen
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState('23:59'); // deadline standart: kun oxiri (tahrirlanadi)
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [typeOpen, setTypeOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [testersOpen, setTestersOpen] = useState(false);

  const userOptions = users?.items || [];
  const getUser = (id) => userOptions.find((u) => u.id === id);
  // "ro'lida bor" — asosiy rol yoki qo'shimcha rollar ichida.
  const hasRole = (u, r) => u.role === r || (u.roles || []).includes(r);
  const managerOptions = userOptions.filter((u) => hasRole(u, 'manager'));
  const employeeOptions = userOptions.filter((u) => hasRole(u, 'employee'));

  useEffect(() => {
    if (!open) return;
    if (project) {
      // To'liq detal kelguncha kutamiz (a'zolar/sinovchilar/hujjatlar faqat unda bo'ladi).
      const p = full;
      if (!p) return;
      const mgr = (p.members || []).find((m) => m.roleInProject === 'manager');
      const emps = (p.members || []).filter((m) => m.roleInProject !== 'manager');
      reset({
        name: p.name, code: p.code || '', description: p.description || '',
        status: p.status || 'planning', penaltyPercent: p.penaltyPercent ?? '',
        managerId: mgr ? String(mgr.userId) : '', managerBonus: mgr ? fromTiyin(mgr.shareAmount) : '',
        price: fromTiyin(p.price), currency: p.currency || 'UZS',
        paymentStatus: p.paymentStatus || 'unpaid', clientId: p.clientId ? String(p.clientId) : '',
        typeId: p.typeId ? String(p.typeId) : '',
      });
      setEmployees(emps.map((m) => ({ userId: m.userId, shareAmount: fromTiyin(m.shareAmount), shareCurrency: m.shareCurrency || 'UZS' })));
      setTesters((p.testers || []).map((t) => t.userId));
      setDocs((p.documents || []).map((d) => ({ name: d.name, url: d.url })));
      setFaolmi(!p.isFrozen);
      if (p.deadline) {
        const d = new Date(p.deadline);
        setDate(p.deadline.slice(0, 10));
        setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } else { setDate(''); setTime('23:59'); }
    } else {
      reset({
        name: '', code: '', description: '', status: 'planning', penaltyPercent: '',
        managerId: '', managerBonus: '', price: '', currency: 'UZS', paymentStatus: 'unpaid', clientId: '', typeId: '',
      });
      setEmployees([]); setTesters([]); setDocs([]); setFaolmi(true); setDate(''); setTime('23:59');
    }
    setAdvancedOpen(false);
  }, [open, project, full, reset]);

  // Picker tanlovini birlashtirish — mavjud ulushlarni saqlab qoladi.
  const onPickEmployees = (ids) => {
    setEmployees((prev) => {
      const byId = Object.fromEntries(prev.map((e) => [e.userId, e]));
      return ids.map((id) => byId[id] || { userId: id, shareAmount: '', shareCurrency: 'UZS' });
    });
  };
  const updateShare = (userId, field, value) =>
    setEmployees((prev) => prev.map((e) => (e.userId === userId ? { ...e, [field]: value } : e)));

  const onSubmit = (values) => {
    if (!values.description?.trim()) { toast.error('Tavsifni kiriting'); return; }
    const managerId = values.managerId ? Number(values.managerId) : null;
    const members = [];
    if (managerId) members.push({ userId: managerId, roleInProject: 'manager', shareAmount: toTiyin(values.managerBonus || 0), shareCurrency: 'UZS' });
    for (const e of employees) {
      if (!e.userId || e.userId === managerId) continue; // menejer ikki marta kirmasin
      members.push({ userId: Number(e.userId), roleInProject: 'employee', shareAmount: toTiyin(e.shareAmount || 0), shareCurrency: e.shareCurrency || 'UZS' });
    }

    const deadline = date ? `${date}T${time || '23:59'}:00` : undefined;

    const payload = {
      name: values.name,
      code: values.code || undefined,
      typeId: values.typeId ? Number(values.typeId) : undefined,
      description: values.description || undefined,
      deadline,
      status: values.status,
      price: toTiyin(values.price || 0),
      currency: values.currency,
      paymentStatus: values.paymentStatus,
      penaltyPercent: values.penaltyPercent === '' || values.penaltyPercent == null ? null : Number(values.penaltyPercent),
      isFrozen: !faolmi,
      clientId: values.clientId ? Number(values.clientId) : undefined,
      members,
      testerIds: testers.map(Number),
      documents: docs.filter((d) => d.name.trim() && d.url.trim()).map((d) => ({ name: d.name.trim(), url: d.url.trim() })),
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
      onBack={onClose}
      title={isEdit ? 'Loyiha tahrirlash' : "Loyiha qo'shish"}
      subtitle={isEdit ? "Loyiha ma'lumotlarini yangilash uchun o'zgartirishlar kiriting" : "Loyiha nomi va asosiy ma'lumotlarni to'ldiring"}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {isEdit ? (
            <label className="flex items-center gap-2 text-sm font-semibold text-text-strong">
              Faolmi? <Switch checked={faolmi} onChange={setFaolmi} />
            </label>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>{isEdit ? 'Tahrirlash' : "Qo'shish"}</Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nomi" required error={errors.name && 'Nom kiriting'}>
            <Input placeholder="Nomi kiriting" {...register('name', { required: true })} error={errors.name} />
          </FormField>
          <FormField label="Holati">
            <RHFSelect control={control} name="status" placeholder="Holati tanlang">
              {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </RHFSelect>
          </FormField>

          <FormField label="Tavsifi" required className="sm:col-span-2" error={errors.description && 'Tavsifni kiriting'}>
            <Textarea placeholder="Tavsifii yozing" {...register('description', { required: true })} error={errors.description} />
          </FormField>

          <FormField label="Menejer">
            <RHFSelect control={control} name="managerId" placeholder="Menejer tanlang">
              <option value="">— Tanlang —</option>
              {managerOptions.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </RHFSelect>
          </FormField>
          <FormField label="Menejer bonusi">
            <Controller name="managerBonus" control={control} render={({ field }) => (
              <MoneyInput value={field.value} onChange={field.onChange} placeholder="Loyiha uchun: 0,0" />
            )} />
          </FormField>

          <FormField label="Titul">
            <Input placeholder="Titul kiriting" {...register('code')} />
          </FormField>
          <FormField label="Jarima foizi (%)">
            <Controller name="penaltyPercent" control={control} render={({ field }) => (
              <PercentInput value={field.value} onChange={field.onChange} />
            )} />
          </FormField>

          {/* Xodimlar — chip + picker */}
          <FormField label="Xodimlar" className="sm:col-span-2">
            {employees.length === 0 ? (
              <button type="button" onClick={() => setEmpPickerOpen(true)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-stroke-strong bg-bg-base px-3 text-sm text-text-soft transition-colors hover:bg-bg-1-alt">
                Xodim tanlang <UserPlus className="h-4 w-4 text-icon-soft" />
              </button>
            ) : (
              <div className="space-y-2">
                <MemberChips ids={employees.map((e) => e.userId)} getUser={getUser} onRemove={(id) => setEmployees((p) => p.filter((e) => e.userId !== id))} />
                <Button type="button" size="sm" variant="outline" onClick={() => setEmpPickerOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Tahrirlash
                </Button>
              </div>
            )}
          </FormField>

          {/* Sinovchilar — chip + picker */}
          <FormField label="Sinovchilar" className="sm:col-span-2">
            {testers.length === 0 ? (
              <button type="button" onClick={() => setTestersOpen(true)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-stroke-strong bg-bg-base px-3 text-sm text-text-soft transition-colors hover:bg-bg-1-alt">
                Sinovchilar tanlang <UserPlus className="h-4 w-4 text-icon-soft" />
              </button>
            ) : (
              <div className="space-y-2">
                <MemberChips ids={testers} getUser={getUser} onRemove={(id) => setTesters((p) => p.filter((x) => x !== id))} />
                <Button type="button" size="sm" variant="outline" onClick={() => setTestersOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Tahrirlash
                </Button>
              </div>
            )}
          </FormField>

          <FormField label="Muddati">
            <AntDate value={date} onChange={setDate} />
          </FormField>
          <FormField label="Vaqti">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </FormField>
        </div>

        {/* Qo'shimcha (moliyaviy) — yig'iladigan bo'lim */}
        <div className="rounded-lg border border-stroke-sub">
          <button type="button" onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-text-strong">
            Qo'shimcha (moliyaviy)
            <ChevronDown className={cn('h-4 w-4 text-icon-soft transition-transform', advancedOpen && 'rotate-180')} />
          </button>
          {advancedOpen && (
            <div className="space-y-4 border-t border-stroke-sub p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Mijoz">
                  <div className="flex gap-2">
                    <RHFSelect control={control} name="clientId" className="flex-1">
                      <option value="">— Tanlang —</option>
                      {(clients?.items || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </RHFSelect>
                    <Button type="button" variant="outline" size="icon" title="Yangi mijoz" onClick={() => setClientOpen(true)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </FormField>
                <FormField label="Loyiha turi">
                  <div className="flex gap-2">
                    <RHFSelect control={control} name="typeId" className="flex-1">
                      <option value="">— Tanlang —</option>
                      {(types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </RHFSelect>
                    <Button type="button" variant="outline" size="icon" title="Yangi tur" onClick={() => setTypeOpen(true)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </FormField>
                <FormField label="Summa">
                  <Controller name="price" control={control} render={({ field }) => (
                    <MoneyInput value={field.value} onChange={field.onChange} placeholder="0" />
                  )} />
                </FormField>
                <FormField label="Valuta">
                  <RHFSelect control={control} name="currency">
                    {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </RHFSelect>
                </FormField>
                <FormField label="To'lov holati">
                  <RHFSelect control={control} name="paymentStatus">
                    {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </RHFSelect>
                </FormField>
              </div>

              {/* Xodim ulushlari (oylik hisobi uchun) */}
              {employees.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-text-sub">Xodim ulushlari (oylik uchun)</p>
                  <div className="space-y-2">
                    {employees.map((e) => {
                      const u = getUser(e.userId);
                      return (
                        <div key={e.userId} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm text-text-strong">{u?.fullName || 'Xodim'}</span>
                          <MoneyInput className="h-9 w-36" value={e.shareAmount} onChange={(v) => updateShare(e.userId, 'shareAmount', v)} placeholder="Ulush" />
                          <select className="h-9 rounded-md border border-stroke-strong bg-bg-base px-2 text-sm" value={e.shareCurrency} onChange={(ev) => updateShare(e.userId, 'shareCurrency', ev.target.value)}>
                            <option value="UZS">so'm</option>
                            <option value="USD">$</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loyiha hujjatlari */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-text-sub">Loyiha hujjatlari</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDocs((p) => [...p, { name: '', url: '' }])}>
                    <Plus className="h-4 w-4" /> Hujjat qo'shish
                  </Button>
                </div>
                {docs.map((d, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <Input className="w-36 sm:w-44" placeholder="Nomini kiriting" value={d.name} onChange={(ev) => setDocs((p) => p.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} />
                    <Input className="flex-1" placeholder="Havolasi" value={d.url} onChange={(ev) => setDocs((p) => p.map((x, j) => (j === i ? { ...x, url: ev.target.value } : x)))} />
                    <button type="button" className="rounded-md p-2 text-error-strong hover:bg-error-soft" onClick={() => setDocs((p) => p.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>

      <QuickReferenceDialog open={typeOpen} onClose={() => setTypeOpen(false)} model="projectType" title="Yangi loyiha turi" label="Tur nomi" onCreated={(t) => setValue('typeId', String(t.id))} />
      <ClientFormDialog open={clientOpen} onClose={() => setClientOpen(false)} onCreated={(c) => setValue('clientId', String(c.id))} />
      <ParticipantPicker open={empPickerOpen} onClose={() => setEmpPickerOpen(false)} title="Xodim tanlang" users={employeeOptions} value={employees.map((e) => e.userId)} onConfirm={onPickEmployees} />
      <ParticipantPicker open={testersOpen} onClose={() => setTestersOpen(false)} title="Sinovchi tanlang" users={userOptions} value={testers} onConfirm={(ids) => setTesters(ids)} />
    </Dialog>
  );
}
