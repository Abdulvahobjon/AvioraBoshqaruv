import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

/** Role-aware dashboard summary (all stats computed server-side). */
export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get('/dashboard')).data });
}

/** Dashboard analitikasi — vazifa/loyiha/yig'ilish dinamikasi, davr bo'yicha (1m|3m|6m|1y). */
export function useAnalytics(period = '1m') {
  return useQuery({
    queryKey: ['dashboard-analytics', period],
    queryFn: async () => (await api.get('/dashboard/analytics', { params: { period } })).data,
  });
}

export function useProjectsReport(params, enabled) {
  return useQuery({ queryKey: ['report-projects', params], enabled: !!enabled, queryFn: async () => (await api.get('/reports/projects', { params })).data });
}

/** Xarajat so'rovlari hisoboti. */
export function useExpenseRequestsReport(params, enabled) {
  return useQuery({ queryKey: ['report-expense-requests', params], enabled: !!enabled, queryFn: async () => (await api.get('/reports/expense-requests', { params })).data });
}

/** Joriy foydalanuvchi unumdorligi (KPI). */
export function useMyEfficiency() {
  return useQuery({ queryKey: ['my-efficiency'], queryFn: async () => (await api.get('/users/me/efficiency')).data });
}

export function useFinanceReport(params = {}) {
  return useQuery({ queryKey: ['report-finance', params], queryFn: async () => (await api.get('/reports/finance', { params })).data });
}

/** Hisobotlar: "Shakllantirish" bosilganda (enabled) ishlaydi. */
export function useExpensesReport(params, enabled) {
  return useQuery({ queryKey: ['report-expenses', params], enabled: !!enabled, queryFn: async () => (await api.get('/reports/expenses', { params })).data });
}

export function usePayrollReport(params, enabled) {
  return useQuery({ queryKey: ['report-payroll', params], enabled: !!enabled, queryFn: async () => (await api.get('/reports/payroll', { params })).data });
}

export function useTasksReport(params, enabled) {
  return useQuery({ queryKey: ['report-tasks', params], enabled: !!enabled, queryFn: async () => (await api.get('/reports/tasks', { params })).data });
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
