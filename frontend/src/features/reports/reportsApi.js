import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

/** Role-aware dashboard summary (all stats computed server-side). */
export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get('/dashboard')).data });
}

export function useProjectsReport(params = {}) {
  return useQuery({ queryKey: ['report-projects', params], queryFn: async () => (await api.get('/reports/projects', { params })).data });
}

export function useFinanceReport(params = {}) {
  return useQuery({ queryKey: ['report-finance', params], queryFn: async () => (await api.get('/reports/finance', { params })).data });
}

export function useEmployeesReport() {
  return useQuery({ queryKey: ['report-employees'], queryFn: async () => (await api.get('/reports/employees')).data });
}

/** Download an export file (xlsx/pdf) via authenticated request → blob → save. */
export async function downloadReport({ type, format, from, to }) {
  const res = await api.get('/reports/export', {
    params: { type, format, from, to },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-hisobot.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
