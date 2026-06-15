import { Controller, ForbiddenException, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

const fmt = (v: number) => new Intl.NumberFormat('uz-UZ').format(v) + " so'm";

// Maosh va xarajatlar moliyaviy maxfiy — manager ko'ra olmaydi (frontend bilan mos).
// Auditor (Nazoratchi) read-only nazorat sifatida moliyani ko'ra oladi.
const FINANCE_ONLY_ROLES = ['superadmin', 'admin', 'accountant', 'auditor'];

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@Roles('superadmin', 'admin', 'manager', 'accountant', 'auditor')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('projects')
  projects(@Query() q: any) {
    return this.reports.projects(q);
  }

  @Get('expense-requests')
  @Roles('superadmin', 'admin', 'accountant', 'auditor')
  expenseRequests(@Query() q: any) {
    return this.reports.expenseRequests(q);
  }

  @Get('finance')
  @Roles('superadmin', 'admin', 'accountant', 'auditor')
  finance(@Query() q: any) {
    return this.reports.finance(q);
  }

  @Get('expenses')
  @Roles('superadmin', 'admin', 'accountant', 'auditor')
  expenses(@Query() q: any) {
    return this.reports.expenses(q);
  }

  @Get('payroll')
  @Roles('superadmin', 'admin', 'accountant', 'auditor')
  payroll(@Query() q: any) {
    return this.reports.payroll(q);
  }

  @Get('tasks')
  tasksReport(@Query() q: any) {
    return this.reports.tasksReport(q);
  }

  @Get('tasks-detail')
  tasksDetail(@Query() q: any) {
    return this.reports.tasksDetail(q);
  }

  @Get('employees')
  @Roles('superadmin', 'admin', 'accountant', 'auditor')
  employees() {
    return this.reports.employees();
  }

  @Get('employee-report')
  @Roles('superadmin', 'admin', 'accountant', 'auditor')
  employeeReport(@Query() q: any) {
    return this.reports.employeeReport(q);
  }

  /** Export: type=projects|employees|employee-report, format=xlsx|pdf|csv */
  @Get('export')
  async export(@Query() q: any, @Res() res: Response, @CurrentUser() user: AuthUser) {
    const type = q.type || 'projects';
    // Maosh/balans/xarajat eksporti faqat moliyaviy rollarga (to'g'ridan-to'g'ri endpointlar bilan bir xil).
    if (['payroll', 'expenses', 'employees', 'employee-report', 'expense-requests', 'ledger'].includes(type) && !FINANCE_ONLY_ROLES.includes(user.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    const format = ['pdf', 'csv'].includes(q.format) ? q.format : 'xlsx';

    const { columns, rows, title } = await this.buildDataset(type, q);

    if (format === 'csv') {
      const esc = (v: any) => {
        const s = String(v ?? '');
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = columns.map((c) => esc(c.header)).join(';');
      const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(';')).join('\n');
      const csv = '﻿' + header + '\n' + body; // BOM → Excel UTF-8
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      res.end(csv);
      return;
    }

    if (format === 'xlsx') {
      // Rang palitrasi (brend accent + neytral)
      const ACCENT = 'FF4F46E5', ZEBRA = 'FFF8FAFC', HEAD_TXT = 'FFFFFFFF', TITLE_TXT = 'FF1E293B', LINE = 'FFE2E8F0';
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Aviora Boshqaruv';
      wb.created = new Date();
      const ws = wb.addWorksheet(title, {
        views: [{ state: 'frozen', ySplit: 2 }], // sarlavha + ustun qatorlari muzlatiladi
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });
      ws.columns = columns.map((c) => ({ key: c.key, width: c.width || 18 }));
      const lastCol = columns.length;

      // 1-qator: sarlavha (butun kenglik bo'ylab birlashtirilgan)
      ws.mergeCells(1, 1, 1, lastCol);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = title;
      titleCell.font = { bold: true, size: 14, color: { argb: TITLE_TXT } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      ws.getRow(1).height = 28;

      // 2-qator: ustun sarlavhalari (accent fon, oq qalin matn)
      const headerRow = ws.getRow(2);
      columns.forEach((c, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = c.header;
        cell.font = { bold: true, size: 11, color: { argb: HEAD_TXT } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      headerRow.height = 24;

      // Ma'lumot qatorlari: zebra + yengil pastki chiziq
      rows.forEach((r, idx) => {
        const row = ws.addRow(r);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle' };
          cell.border = { bottom: { style: 'hair', color: { argb: LINE } } };
          if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
      await wb.xlsx.write(res);
      res.end();
      return;
    }

    // PDF — sarlavha bandi, rangli header, zebra qatorlar, sahifa bo'linishi
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    doc.pipe(res);

    const left = 36;
    const right = doc.page.width - 36;
    const tableW = right - left;
    const totalW = columns.reduce((a, c) => a + (c.width || 18), 0);
    const colW = columns.map((c) => (tableW * (c.width || 18)) / totalW);
    const bottom = doc.page.height - 36;

    // Sarlavha bandi (accent fon)
    doc.rect(left, 36, tableW, 30).fill('#4F46E5');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(title, left + 12, 45, { width: tableW - 24, lineBreak: false });
    let y = 80;

    const drawHeader = () => {
      doc.rect(left, y, tableW, 20).fill('#EEF2FF');
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(8);
      let x = left;
      columns.forEach((c, i) => { doc.text(c.header, x + 4, y + 6, { width: colW[i] - 8, height: 11, ellipsis: true }); x += colW[i]; });
      y += 20;
      doc.font('Helvetica').fillColor('#0F172A');
    };
    drawHeader();

    const rowH = 16;
    rows.forEach((r, idx) => {
      if (y + rowH > bottom) { doc.addPage(); y = 36; drawHeader(); }
      if (idx % 2 === 1) { doc.rect(left, y, tableW, rowH).fill('#F8FAFC'); }
      doc.fillColor('#0F172A').font('Helvetica').fontSize(8);
      let x = left;
      columns.forEach((c, i) => { doc.text(String(r[c.key] ?? ''), x + 4, y + 4, { width: colW[i] - 8, height: 11, ellipsis: true }); x += colW[i]; });
      doc.moveTo(left, y + rowH).lineTo(right, y + rowH).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      y += rowH;
    });
    doc.end();
  }

  private async buildDataset(type: string, q: any) {
    if (type === 'employee-report') {
      const { rows } = await this.reports.employeeReport(q);
      return {
        title: 'Xodimlar bo\'yicha hisobot',
        columns: [
          { header: 'Ism Sharifi', key: 'fullName', width: 26 },
          { header: 'Lavozim', key: 'position', width: 18 },
          { header: 'Viloyat', key: 'region', width: 16 },
          { header: 'Tuman', key: 'district', width: 16 },
          { header: 'Telefon', key: 'phone', width: 16 },
          { header: 'Oylik maoshi (UZS)', key: 'fixedSalary', width: 18 },
          { header: 'Balans (UZS)', key: 'balance', width: 16 },
          { header: 'Loyihalar', key: 'projectsCount', width: 11 },
          { header: 'Vazifalar: Jami', key: 'tasksTotal', width: 13 },
          { header: 'Qilish kerak', key: 't_todo', width: 12 },
          { header: 'Jarayonda', key: 't_in_progress', width: 11 },
          { header: 'Muddati o\'tgan', key: 't_overdue', width: 13 },
          { header: 'Bajarilgan', key: 't_done', width: 11 },
          { header: 'Ishga tushirilgan', key: 't_production', width: 15 },
          { header: 'Tekshirilgan', key: 't_checked', width: 12 },
          { header: 'Rad etilgan', key: 't_rejected', width: 11 },
          { header: 'Yig\'ilishlar: Jami', key: 'meetingsTotal', width: 15 },
          { header: 'Qatnashgan', key: 'meetingsAttended', width: 12 },
          { header: 'Qatnashmagan (sababli)', key: 'meetingsExcused', width: 20 },
          { header: 'Qatnashmagan (sababsiz)', key: 'meetingsUnexcused', width: 21 },
          { header: 'So\'rovlar soni', key: 'requestsCount', width: 13 },
          { header: 'So\'rovlar summasi (UZS)', key: 'requestsTotal', width: 20 },
          { header: 'Ish haqi (UZS)', key: 'payrollTotal', width: 16 },
        ],
        rows: rows.map((r) => ({
          ...r,
          t_todo: r.tasks.todo, t_in_progress: r.tasks.in_progress, t_overdue: r.tasks.overdue,
          t_done: r.tasks.done, t_production: r.tasks.production, t_checked: r.tasks.checked, t_rejected: r.tasks.rejected,
        })),
      };
    }
    if (type === 'employees') {
      const data = await this.reports.employees();
      return {
        title: 'Xodimlar hisoboti',
        columns: [
          { header: 'F.I.O', key: 'fullName', width: 28 },
          { header: 'Rol', key: 'role', width: 14 },
          { header: 'Vazifalar', key: 'tasks', width: 12 },
          { header: 'Balans', key: 'balanceFmt', width: 22 },
          { header: 'Jami daromad', key: 'earnedFmt', width: 22 },
        ],
        rows: data.map((d) => ({ ...d, balanceFmt: fmt(d.balance), earnedFmt: fmt(d.earned) })),
      };
    }
    if (type === 'expenses') {
      const { rows } = await this.reports.expenses(q);
      return {
        title: 'Xarajatlar hisoboti',
        columns: [
          { header: 'Sana', key: 'dateFmt', width: 16 },
          { header: 'Kategoriya', key: 'category', width: 22 },
          { header: 'Summa', key: 'amountFmt', width: 18 },
          { header: 'Valyuta', key: 'currency', width: 10 },
          { header: 'UZS ekvivalent', key: 'amountUzsFmt', width: 20 },
          { header: 'Izoh', key: 'note', width: 30 },
        ],
        rows: rows.map((r) => ({
          ...r,
          dateFmt: new Date(r.date).toLocaleDateString('uz-UZ'),
          amountFmt: new Intl.NumberFormat('uz-UZ').format(r.amount),
          amountUzsFmt: fmt(r.amountUzs),
        })),
      };
    }
    if (type === 'payroll') {
      const { rows } = await this.reports.payroll(q);
      const dt = (d: any) => (d ? new Date(d).toLocaleDateString('uz-UZ') : '—');
      const STATUS_UZ: Record<string, string> = { draft: 'Hisoblangan', ready: "To'lovga tayyor", paid: "To'langan", closed: 'Tasdiqlangan' };
      return {
        title: 'Ish haqi hisoboti',
        columns: [
          { header: 'Ism Sharifi', key: 'fullName', width: 26 },
          { header: 'Oy', key: 'month', width: 12 },
          { header: 'Oylik maosh (UZS)', key: 'fixedFmt', width: 18 },
          { header: 'KPI bonus (UZS)', key: 'kpiFmt', width: 16 },
          { header: 'Jarima miqdori (UZS)', key: 'penaltyFmt', width: 18 },
          { header: 'Jami miqdori (UZS)', key: 'totalFmt', width: 18 },
          { header: 'Holati', key: 'statusUz', width: 14 },
          { header: 'Hisoblangan vaqti', key: 'createdFmt', width: 16 },
          { header: 'Tasdiqlangan vaqti', key: 'confirmedFmt', width: 16 },
          { header: 'Hisobchi', key: 'accountant', width: 22 },
        ],
        rows: rows.map((r) => ({
          ...r,
          fixedFmt: fmt(r.fixedAmount),
          kpiFmt: fmt(r.kpiBonus),
          penaltyFmt: r.penalty > 0 ? `-${fmt(r.penalty)}` : fmt(0),
          totalFmt: fmt(r.total),
          statusUz: STATUS_UZ[r.status] || r.status,
          createdFmt: dt(r.createdAt),
          confirmedFmt: dt(r.confirmedAt),
        })),
      };
    }
    if (type === 'tasks') {
      const { byAssignee } = await this.reports.tasksReport(q);
      return {
        title: 'Vazifalar hisoboti (xodim kesimida)',
        columns: [
          { header: 'Xodim', key: 'fullName', width: 28 },
          { header: 'Jami', key: 'total', width: 10 },
          { header: 'Qilish kerak', key: 'todo', width: 12 },
          { header: 'Jarayonda', key: 'in_progress', width: 11 },
          { header: 'Muddati o\'tgan', key: 'overdue', width: 13 },
          { header: 'Bajarilgan', key: 'done', width: 11 },
          { header: 'Tekshirilgan', key: 'checked', width: 12 },
          { header: 'Ishga tushirilgan', key: 'production', width: 15 },
          { header: 'Rad etilgan', key: 'rejected', width: 11 },
        ],
        rows: byAssignee,
      };
    }
    if (type === 'tasks-detail') {
      const { rows } = await this.reports.tasksDetail(q);
      const dt = (d: any) => (d ? new Date(d).toLocaleDateString('uz-UZ') : '—');
      const PRIO: Record<string, string> = { low: 'Past', medium: "O'rta", high: 'Yuqori', critical: 'Kritik' };
      const STAT: Record<string, string> = { todo: 'Qilish kerak', in_progress: 'Jarayonda', overdue: "Muddati o'tgan", done: 'Bajarilgan', checked: 'Tekshirilgan', production: 'Ishga tushirilgan', rejected: 'Rad etilgan' };
      const TYP: Record<string, string> = { bug: 'Xatolik', extra: "Qo'shimcha", research: 'Tadqiqot', feature: 'Yangi funksiya' };
      return {
        title: "Vazifalar bo'yicha hisobot",
        columns: [
          { header: 'Titul', key: 'uid', width: 12 },
          { header: 'Loyiha nomi', key: 'projectName', width: 22 },
          { header: 'Vazifa nomi', key: 'title', width: 24 },
          { header: 'Topshiruvchi', key: 'assignee', width: 20 },
          { header: 'Muallif', key: 'author', width: 20 },
          { header: 'Darajasi', key: 'prioUz', width: 12 },
          { header: 'Holati', key: 'statUz', width: 16 },
          { header: 'Turi', key: 'typeUz', width: 16 },
          { header: 'Vazifa narxi (UZS)', key: 'priceFmt', width: 18 },
          { header: 'Jarima foizi (%)', key: 'penaltyPercent', width: 14 },
          { header: 'Muddati', key: 'deadlineFmt', width: 16 },
          { header: 'Yaratilgan vaqti', key: 'createdFmt', width: 16 },
          { header: 'Sprint raqami', key: 'sprint', width: 12 },
          { header: 'Kim uchun', key: 'position', width: 16 },
          { header: 'Qaytishlar soni', key: 'reopenedCount', width: 14 },
          { header: 'Bekor qilish sababi', key: 'rejectReason', width: 28 },
        ],
        rows: rows.map((r) => ({
          ...r,
          prioUz: PRIO[r.priority] || r.priority,
          statUz: STAT[r.status] || r.status,
          typeUz: TYP[r.type] || r.type,
          priceFmt: fmt(r.price),
          deadlineFmt: dt(r.deadline),
          createdFmt: dt(r.createdAt),
        })),
      };
    }
    if (type === 'ledger') {
      const { rows } = await this.reports.ledger(q);
      const TYPE: Record<string, string> = { salary: 'Oylik', company: 'Kompaniya', other: 'Boshqa', project_share: 'Loyiha ulushi', withdrawal: 'Yechib olish', reversal: 'Teskari yozuv' };
      return {
        title: 'Moliya tarixi',
        columns: [
          { header: 'Ism Sharifi', key: 'fullName', width: 26 },
          { header: 'Xarajat', key: 'category', width: 20 },
          { header: 'Turi', key: 'typeLabel', width: 16 },
          { header: "Yo'nalish", key: 'dirLabel', width: 12 },
          { header: 'Miqdor (UZS)', key: 'amountFmt', width: 18 },
          { header: 'Sana', key: 'dateFmt', width: 18 },
          { header: 'Izoh', key: 'note', width: 30 },
        ],
        rows: rows.map((r) => ({
          ...r,
          typeLabel: TYPE[r.type] || r.type,
          dirLabel: r.direction === 'credit' ? 'Kirim' : 'Chiqim',
          amountFmt: new Intl.NumberFormat('uz-UZ').format(r.amount),
          dateFmt: new Date(r.createdAt).toLocaleString('uz-UZ'),
        })),
      };
    }
    if (type === 'expense-requests') {
      const { rows } = await this.reports.expenseRequests(q);
      const TYPE: Record<string, string> = { salary: 'Mablag\' chiqarish', company: 'Kompaniya xarajatlari', other: 'Boshqa xarajatlar' };
      const STAT: Record<string, string> = { pending: 'To\'lanmagan', paid: 'To\'langan', closed: 'Tasdiqlangan', rejected: 'Bekor qilingan' };
      const PAY: Record<string, string> = { card: 'Karta orqali', cash: 'Naqd pul' };
      const dt = (d: any) => (d ? new Date(d).toLocaleString('uz-UZ') : '—');
      return {
        title: 'Xarajat so\'rovlari hisoboti',
        columns: [
          { header: 'Ism Sharifi', key: 'fullName', width: 24 },
          { header: 'Loyiha', key: 'project', width: 22 },
          { header: 'Xarajat turi', key: 'typeLabel', width: 20 },
          { header: 'Toifa', key: 'category', width: 18 },
          { header: 'Miqdori (UZS)', key: 'amountFmt', width: 18 },
          { header: 'To\'lov turi', key: 'payLabel', width: 14 },
          { header: 'Holati', key: 'statLabel', width: 14 },
          { header: 'So\'rov sababi', key: 'reason', width: 28 },
          { header: 'So\'ralgan vaqti', key: 'createdFmt', width: 18 },
          { header: 'To\'langan vaqti', key: 'paidFmt', width: 18 },
          { header: 'Tasdiqlangan vaqti', key: 'confFmt', width: 18 },
          { header: 'Hisobchi', key: 'accountant', width: 22 },
          { header: 'Bekor qilingan vaqt', key: 'cancelFmt', width: 18 },
          { header: 'Bekor qilish sababi', key: 'cancelReason', width: 28 },
        ],
        rows: rows.map((r) => ({
          ...r,
          typeLabel: TYPE[r.type] || r.type,
          payLabel: r.paymentMethod ? PAY[r.paymentMethod] || r.paymentMethod : '—',
          statLabel: STAT[r.status] || r.status,
          amountFmt: fmt(r.amount),
          createdFmt: dt(r.createdAt), paidFmt: dt(r.paidAt), confFmt: dt(r.confirmedAt), cancelFmt: dt(r.canceledAt),
        })),
      };
    }
    const { rows } = await this.reports.projects(q);
    const PSTAT: Record<string, string> = { planning: 'Rejalashtirilgan', active: 'Faol', overdue: 'Muddati o\'tgan', completed: 'Yakunlangan', cancelled: 'Bekor qilingan' };
    return {
      title: 'Loyihalar hisoboti',
      columns: [
        { header: 'Titul', key: 'code', width: 10 },
        { header: 'Nomi', key: 'name', width: 26 },
        { header: 'Tavsifi', key: 'description', width: 28 },
        { header: 'Muddati', key: 'deadlineFmt', width: 16 },
        { header: 'Holati', key: 'statLabel', width: 14 },
        { header: 'Boshqaruvchi bonusi', key: 'bonusFmt', width: 18 },
        { header: 'Muallif', key: 'author', width: 22 },
        { header: 'Boshqaruvchi', key: 'managers', width: 24 },
        { header: 'Xodimlar', key: 'employees', width: 28 },
        { header: 'Sinovchilar', key: 'testers', width: 24 },
        { header: 'Vazifalar (jami)', key: 'tasksTotal', width: 14 },
        { header: 'Bajarilgan', key: 'tDone', width: 12 },
        { header: 'Rad etilgan', key: 'tRejected', width: 12 },
      ],
      rows: rows.map((r) => ({
        ...r,
        deadlineFmt: r.deadline ? new Date(r.deadline).toLocaleString('uz-UZ') : '—',
        statLabel: PSTAT[r.status] || r.status,
        bonusFmt: fmt(r.managerBonus),
        tDone: r.tasks.done, tRejected: r.tasks.rejected,
      })),
    };
  }
}
