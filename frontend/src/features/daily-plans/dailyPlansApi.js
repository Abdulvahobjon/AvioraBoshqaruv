import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

/** Tanlangan kun (YYYY-MM-DD) uchun joriy foydalanuvchining rejalari. */
export function useDailyPlans(date) {
  return useQuery({
    queryKey: ['daily-plans', date],
    queryFn: async () => (await api.get('/daily-plans', { params: { date } })).data,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['daily-plans'] });
}

export function useSaveDailyPlan() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = id ? await api.patch(`/daily-plans/${id}`, payload) : await api.post('/daily-plans', payload);
      return data;
    },
    onSuccess: inv,
  });
}

export function useToggleDailyPlan() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, isDone }) => (await api.patch(`/daily-plans/${id}`, { isDone })).data,
    onSuccess: inv,
  });
}

export function useDeleteDailyPlan() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/daily-plans/${id}`)).data,
    onSuccess: inv,
  });
}
