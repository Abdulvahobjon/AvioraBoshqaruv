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

  /** Loyiha budjeti burn-down (byudjet vs sarflangan). */
  @Get('project-budget')
  projectBudget(@Query('projectId') projectId: string) {
    return this.reports.projectBudget(Number(projectId));
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
    if (['payroll', 'expenses', 'employees', 'employee-report'].includes(type) && !FINANCE_ONLY_ROLES.includes(user.role)) {
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
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(title);
      ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
      ws.getRow(1).font = { bold: true };
      rows.forEach((r) => ws.addRow(r));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
      await wb.xlsx.write(res);
      res.end();
      return;
    }

    // PDF
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).text(title, { align: 'center' }).moveDown();
    const colWidth = (770 - 72) / columns.length;
    doc.fontSize(9);
    // header
    let x = 36;
    doc.font('Helvetica-Bold');
    columns.forEach((c) => { doc.text(c.header, x, doc.y, { width: colWidth, continued: false }); x += colWidth; });
    doc.moveDown(0.5).font('Helvetica');
    // rows
    rows.forEach((r) => {
      const startY = doc.y;
      let cx = 36;
      columns.forEach((c) => {
        doc.text(String(r[c.key] ?? ''), cx, startY, { width: colWidth });
        cx += colWidth;
      });
      doc.moveDown(0.3);
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
      return {
        title: 'Ish haqi hisoboti',
        columns: [
          { header: 'F.I.O', key: 'fullName', width: 28 },
          { header: 'Lavozim', key: 'position', width: 20 },
          { header: 'Oy', key: 'month', width: 12 },
          { header: 'Oylik (UZS)', key: 'fixedFmt', width: 18 },
          { header: 'Ulushlar (UZS)', key: 'shareFmt', width: 18 },
          { header: 'Jami (UZS)', key: 'totalFmt', width: 18 },
          { header: 'Holat', key: 'status', width: 12 },
        ],
        rows: rows.map((r) => ({ ...r, fixedFmt: fmt(r.fixedAmount), shareFmt: fmt(r.projectShareTotal), totalFmt: fmt(r.total) })),
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
    const { rows } = await this.reports.projects(q);
    return {
      title: 'Loyihalar hisoboti',
      columns: [
        { header: 'Loyiha', key: 'name', width: 30 },
        { header: 'Mijoz', key: 'client', width: 24 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Summa', key: 'priceFmt', width: 20 },
        { header: 'Ulushlar', key: 'sharesFmt', width: 20 },
        { header: 'Xarajatlar', key: 'expensesFmt', width: 20 },
        { header: 'Foyda', key: 'profitFmt', width: 20 },
      ],
      rows: rows.map((r) => ({ ...r, priceFmt: fmt(r.price), sharesFmt: fmt(r.shares), expensesFmt: fmt(r.expenses), profitFmt: fmt(r.profit) })),
    };
  }
}
