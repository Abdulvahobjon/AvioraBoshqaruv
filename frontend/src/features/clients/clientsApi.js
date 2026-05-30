import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useClients(params) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const { data } = await api.get('/clients', { params });
      return data;
    },
  });
}

export function useClient(id) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/clients/${id}`);
      return data;
    },
  });
}

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = id
        ? await api.patch(`/clients/${id}`, payload)
        : await api.post('/clients', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/clients/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}
