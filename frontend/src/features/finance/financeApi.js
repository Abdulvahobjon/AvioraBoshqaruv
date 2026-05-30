import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useBalance() {
  return useQuery({ queryKey: ['balance'], queryFn: async () => (await api.get('/finance/balance')).data });
}

export function useRequests(params = {}) {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: async () => (await api.get('/finance/requests', { params })).data,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/finance/requests', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

export function useRequestAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => (await api.post(`/finance/requests/${id}/${action}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

export function useLedger(params = {}) {
  return useQuery({
    queryKey: ['ledger', params],
    queryFn: async () => (await api.get('/finance/ledger', { params })).data,
  });
}

export function useReverseLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }) => (await api.post(`/finance/ledger/${id}/reverse`, { note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger'] }),
  });
}
