import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

/** Reference list (region | position | projectType | expenseCategory). */
export function useReference(model) {
  return useQuery({
    queryKey: ['ref', model],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get(`/settings/${model}`);
      return data;
    },
  });
}

export function useSaveReference(model) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }) =>
      (id ? await api.patch(`/settings/${model}/${id}`, { name }) : await api.post(`/settings/${model}`, { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ref', model] }),
  });
}

export function useDeleteReference(model) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/settings/${model}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ref', model] }),
  });
}

// ── Currencies ──
export function useCurrencies() {
  return useQuery({ queryKey: ['currencies'], queryFn: async () => (await api.get('/currencies')).data });
}

export function useUpdateRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, rateToUzs }) => (await api.patch(`/currencies/${code}`, { rateToUzs })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }),
  });
}
