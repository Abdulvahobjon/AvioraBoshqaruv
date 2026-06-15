import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function usePayrolls(params = {}) {
  return useQuery({
    queryKey: ['payrolls', params],
    queryFn: async () => (await api.get('/payroll', { params })).data,
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (month) => (await api.post('/payroll/generate', { month })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payrolls'] }),
  });
}

export function usePayrollAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => (await api.post(`/payroll/${id}/${action}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payrolls'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

/** Buxgalter "Tasdiqlash" — tanlangan oyliklarni ommaviy to'lash. */
export function usePayManyPayrolls() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => (await api.post('/payroll/pay-many', { ids })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payrolls'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

/** KPI bonus / jarima (ma'lumot uchun) ni yangilash. */
export function useUpdatePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => (await api.patch(`/payroll/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payrolls'] }),
  });
}
