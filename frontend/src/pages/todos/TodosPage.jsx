import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Trash2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { api, apiError } from '@/lib/api/axios';

function useTodos() {
  return useQuery({ queryKey: ['todos'], queryFn: async () => (await api.get('/todos')).data });
}

export function TodosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useTodos();
  const [title, setTitle] = useState('');

  const inv = () => qc.invalidateQueries({ queryKey: ['todos'] });
  const add = useMutation({ mutationFn: async (t) => (await api.post('/todos', { title: t })).data, onSuccess: inv });
  const toggle = useMutation({ mutationFn: async ({ id, isDone }) => (await api.patch(`/todos/${id}`, { isDone })).data, onSuccess: inv });
  const del = useMutation({ mutationFn: async (id) => (await api.delete(`/todos/${id}`)).data, onSuccess: inv });

  const submit = () => {
    if (!title.trim()) return;
    add.mutate(title.trim(), { onSuccess: () => setTitle(''), onError: (e) => toast.error(apiError(e)) });
  };

  const todos = data || [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Eslatmalar" subtitle="Shaxsiy todo ro'yxati" />

      <Card className="mb-4 p-3">
        <div className="flex gap-2">
          <Input placeholder="Yangi eslatma..." value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <Button onClick={submit} loading={add.isPending}><Plus className="h-4 w-4" /> Qo'shish</Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : todos.length === 0 ? (
        <EmptyState title="Eslatmalar yo'q" description="Birinchi eslatmangizni qo'shing." />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {todos.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Card className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => toggle.mutate({ id: t.id, isDone: !t.isDone })}
                    className={cn('flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
                      t.isDone ? 'border-accent-strong bg-accent-strong text-text-white' : 'border-stroke-strong text-transparent hover:border-accent-sub')}
                  >
                    {t.isDone ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-0 w-0" />}
                  </button>
                  <span className={cn('flex-1 text-sm', t.isDone ? 'text-text-soft line-through' : 'text-text-strong')}>{t.title}</span>
                  <button onClick={() => del.mutate(t.id)} className="rounded p-1.5 text-icon-soft hover:bg-error-soft hover:text-error-strong">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
