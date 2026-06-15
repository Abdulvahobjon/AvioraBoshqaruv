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

const invalidateFinance = (qc) => {
  qc.invalidateQueries({ queryKey: ['requests'] });
  qc.invalidateQueries({ queryKey: ['balance'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
};

/** Buxgalter "To'lov qildim" — to'lov turi + chek fayllari bilan. */
export function usePayRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentMethod, receipts }) =>
      (await api.post(`/finance/requests/${id}/pay`, { paymentMethod, receipts })).data,
    onSuccess: () => invalidateFinance(qc),
  });
}

/** Buxgalter "Rad etish" — sabab bilan. */
export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cancelReason }) =>
      (await api.post(`/finance/requests/${id}/reject`, { cancelReason })).data,
    onSuccess: () => invalidateFinance(qc),
  });
}

/** Xodim "Tasdiqlash" — to'lovni qabul qildim. */
export function useConfirmRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/finance/requests/${id}/confirm`)).data,
    onSuccess: () => invalidateFinance(qc),
  });
}

/** Chek/kvitansiya rasmini yuklash → { url }. */
export function useUploadReceipt() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/finance/upload-receipt', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ledger'] });
      qc.invalidateQueries({ queryKey: ['balance'] }); // teskari yozuv balansni o'zgartiradi
    },
  });
}
