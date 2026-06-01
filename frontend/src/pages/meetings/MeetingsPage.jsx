import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, X, UserPlus, Eye, CheckCircle2, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useProjects } from '@/features/projects/projectsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useMeetings, useCreateMeeting, useDeleteMeeting } from '@/features/meetings/meetingsApi';
import { ParticipantPicker } from '@/features/meetings/ParticipantPicker';
import { MeetingDetailDialog } from '@/features/meetings/MeetingDetailDialog';
import { AttendanceDialog } from '@/features/meetings/AttendanceDialog';

export function MeetingsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = ['superadmin', 'admin', 'manager'].includes(user?.role);
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  const { data: meetings, isLoading } = useMeetings();
  const del = useDeleteMeeting();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [attendanceId, setAttendanceId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canManage = (m) => m.createdBy === user?.id || isAdmin;

  const columns = [
    { key: 'idx', header: '№', className: 'w-12', render: (_r, i) => i + 1 },
    { key: 'uid', header: 'UID', render: (r) => <span className="font-mono text-xs text-text-sub">{r.uid || '—'}</span> },
    { key: 'title', header: 'Nomi', render: (r) => <span className="font-medium text-text-strong">{r.title}</span> },
    { key: 'creator', header: 'Tashkilotchi', render: (r) => r.creator?.fullName || '—' },
    { key: 'project', header: 'Loyiha', render: (r) => r.project?.name || 'Umumiy' },
    { key: 'startAt', header: 'Boshlanish vaqti', render: (r) => formatDate(r.startAt, true) },
    { key: 'duration', header: 'Davomiyligi', render: (r) => (r.duration ? `${r.duration} daqiqa` : '—') },
    {
      key: 'finished', header: 'Tugatildimi?', className: 'text-center',
      render: (r) => (
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${r.finishedAt ? 'bg-accent-strong text-text-white' : 'bg-error-strong text-text-white'}`}>
          {r.finishedAt ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </span>
      ),
    },
    {
      key: 'actions', header: '', className: 'w-12',
      render: (r) => {
        const items = [{ label: "Ko'rish", icon: Eye, onClick: () => setDetailId(r.id) }];
        if (canManage(r) && !r.finishedAt) items.push({ label: 'Yakunlash', icon: CheckCircle2, tone: 'success', onClick: () => setAttendanceId(r.id) });
        if (canManage(r)) items.push({ label: "O'chirish", icon: Trash2, tone: 'danger', onClick: () => setDeleting(r) });
        return <div onClick={(e) => e.stopPropagation()}><DropdownMenu items={items} /></div>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Yig'ilishlar"
        subtitle="Uchrashuvlar, davomat va yakunlash"
        actions={canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Yig'ilish qo'shish</Button>}
      />

      <DataTable
        columns={columns}
        data={meetings}
        loading={isLoading}
        onRowClick={(r) => setDetailId(r.id)}
        emptyTitle="Yig'ilishlar yo'q"
        emptyDescription={canCreate ? "Yangi yig'ilish tashkil eting." : "Sizni yig'ilishlarga taklif qilishadi."}
      />

      <MeetingDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {detailId && (
        <MeetingDetailDialog
          meetingId={detailId}
          open={!!detailId}
          onClose={() => setDetailId(null)}
          onFinish={(id) => { setDetailId(null); setAttendanceId(id); }}
        />
      )}
      {attendanceId && <AttendanceDialog meetingId={attendanceId} open={!!attendanceId} onClose={() => setAttendanceId(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message={`"${deleting?.title}" yig'ilishini o'chirmoqchimisiz?`}
      />
    </div>
  );
}

function MeetingDialog({ open, onClose }) {
  const { data: projectList } = useProjects({ limit: 100 });
  const { data: userList } = useUsersList();
  const create = useCreateMeeting();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [participants, setParticipants] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const users = userList?.items || [];
  const selectedUsers = users.filter((u) => participants.includes(u.id));

  useEffect(() => { if (open) { reset({ title: '', projectId: '', link: '', content: '', duration: 30, startAt: '' }); setParticipants([]); } }, [open, reset]);

  const onSubmit = (v) => {
    if (!v.startAt) { toast.error('Boshlanish vaqtini kiriting'); return; }
    create.mutate(
      {
        title: v.title,
        projectId: v.projectId ? Number(v.projectId) : undefined,
        link: v.link || undefined,
        content: v.content || undefined,
        duration: v.duration ? Number(v.duration) : undefined,
        startAt: v.startAt,
        participantIds: participants,
      },
      { onSuccess: () => { toast.success('Yig\'ilish yaratildi'); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yig'ilish ma'lumotlari"
      size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Yopish</Button><Button onClick={handleSubmit(onSubmit)} loading={create.isPending}>Qo'shish</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Nomi" required error={errors.title && 'Nom kiriting'}>
          <Input placeholder="Yig'ilish nomi" {...register('title', { required: true })} error={errors.title} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Loyiha">
            <Select {...register('projectId')}>
              <option value="">Umumiy</option>
              {(projectList?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Boshlanish sanasi va vaqti" required>
            <Input type="datetime-local" {...register('startAt')} />
          </FormField>
          <FormField label="Havolasi">
            <Input placeholder="URL manzil kiriting" {...register('link')} />
          </FormField>
          <FormField label="Davomiyligi (daqiqa)">
            <Input type="number" min="0" {...register('duration')} />
          </FormField>
          <FormField label="Tavsifi" className="sm:col-span-2">
            <Textarea {...register('content')} />
          </FormField>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-sub">Yig'ilish qatnashchilari</p>
          <div className="rounded-lg border border-dashed border-stroke-strong p-4">
            {selectedUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-text-soft">Quyidagi tugma orqali qidiring va tanlang</p>
                <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Qatnashchilarni qo'shing
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-2 rounded-full bg-bg-elevation-2 py-1 pl-1 pr-2.5 text-sm">
                      <Avatar name={u.fullName} src={u.avatar} size="sm" />
                      <span className="text-text-strong">{u.fullName}</span>
                      <button type="button" onClick={() => setParticipants((p) => p.filter((x) => x !== u.id))} className="text-icon-soft hover:text-error-strong">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Tahrirlash ({selectedUsers.length})
                </Button>
              </div>
            )}
          </div>
        </div>
      </form>

      <ParticipantPicker open={pickerOpen} onClose={() => setPickerOpen(false)} users={users} value={participants} onConfirm={setParticipants} />
    </Dialog>
  );
}
