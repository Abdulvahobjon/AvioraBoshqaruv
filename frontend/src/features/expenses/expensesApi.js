import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useExpenses(params = {}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => (await api.get('/expenses', { params })).data,
  });
}

export function useSaveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) =>
      (id ? await api.patch(`/expenses/${id}`, payload) : await api.post('/expenses', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/expenses/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
