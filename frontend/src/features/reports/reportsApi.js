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

/** Xodim bo'yicha keng hisobot. `enabled` — "Shakllantirish" bosilganda ishlaydi. */
export function useEmployeeReport(params, enabled) {
  return useQuery({
    queryKey: ['report-employee', params],
    enabled: !!enabled,
    queryFn: async () => (await api.get('/reports/employee-report', { params })).data,
  });
}

const EXT = { pdf: 'pdf', csv: 'csv', xlsx: 'xlsx' };

/** Hisobotni fayl sifatida yuklab olish (xlsx/pdf/csv). */
export async function exportReport({ type, format, params = {} }) {
  const res = await api.get('/reports/export', { params: { type, format, ...params }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-hisobot.${EXT[format] || 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/** Chop etish — PDF ni yangi oynada ochib, print dialogini chaqiradi. */
export async function printReport({ type, params = {} }) {
  const res = await api.get('/reports/export', { params: { type, format: 'pdf', ...params }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const w = window.open(url);
  if (w) w.onload = () => { w.focus(); w.print(); };
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
