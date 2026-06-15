/* eslint-disable */
// ─────────────────────────────────────────────────────────
//  AVIORA BOSHQARUV — Seed
//  Test loginlar (har rol uchun) + nomenklatura + namuna ma'lumotlar
//  Parol: SEED_DEFAULT_PASSWORD (.env) yoki "Aviora2026!"
// ─────────────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Aviora2026!';

// so'm -> tiyin (eng kichik birlik)
const sum = (uzs) => BigInt(Math.round(uzs * 100));

async function main() {
  // ── Idempotentlik: DB allaqachon seed qilingan bo'lsa, qaytadan urinmaymiz ──
  // (startup buyrug'i har konteyner ishga tushganda seed'ni chaqiradi; aks holda
  //  unique constraint xatosi bilan yiqilib, backend umuman ko'tarilmaydi.)
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`ℹ️  Seed o'tkazib yuborildi — bazada allaqachon ${existingUsers} ta foydalanuvchi bor.`);
    return;
  }

  console.log('🌱 Seeding...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Idempotent reference helper: nom bo'yicha topadi, bo'lmasa yaratadi.
  const ensure = async (model, where, data) =>
    (await model.findFirst({ where })) ?? (await model.create({ data }));

  // ── Reference: regions ──
  const regionNames = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg\'ona'];
  const regions = [];
  for (let i = 0; i < regionNames.length; i++) {
    regions.push(await ensure(prisma.region, { name: regionNames[i] }, { name: regionNames[i], isApplication: i < 3 }));
  }

  // ── Reference: districts (Toshkent uchun, arizalarda ishlatiladi) ──
  const districtNames = ['Chilonzor', 'Yunusobod', 'Mirzo Ulug\'bek', 'Yakkasaroy'];
  const districts = [];
  for (const name of districtNames) {
    districts.push(await ensure(prisma.district, { name, regionId: regions[0].id }, { name, regionId: regions[0].id, isApplication: true }));
  }

  // ── Reference: positions ──
  const positionNames = ['Frontend dasturchi', 'Backend dasturchi', 'UI/UX dizayner', 'Loyiha menejeri', 'QA muhandis'];
  const positions = [];
  for (const name of positionNames) {
    positions.push(await ensure(prisma.position, { name }, { name }));
  }

  // ── Reference: project types (standart 5 ta) ──
  const typeNames = ['Landing page', 'Korporativ sayt', 'Internet-do\'kon', 'Veb-ilova', 'Admin panel'];
  const projectTypes = [];
  for (const name of typeNames) {
    projectTypes.push(await ensure(prisma.projectType, { name }, { name }));
  }

  // ── Reference: expense categories ──
  const expCatNames = ['Ijara', 'Kommunal', 'Texnika', 'Marketing', 'Boshqa'];
  const expenseCategories = [];
  for (const name of expCatNames) {
    expenseCategories.push(await ensure(prisma.expenseCategory, { name }, { name }));
  }

  // ── Currencies ──
  // Kurs fixed-point masshtabda saqlanadi: haqiqiy kurs × RATE_SCALE (10000).
  // 1 so'm → 10000, 12800 so'm → 128000000. (currencies.service.ts RATE_SCALE bilan mos.)
  // Idempotent: code unique — qayta seed'da P2002 crash-loop bo'lmasligi uchun.
  const RATE_SCALE = 10000n;
  await ensure(prisma.currencyRate, { code: 'UZS' }, { code: 'UZS', name: 'O\'zbek so\'mi', rateToUzs: 1n * RATE_SCALE });
  const usd = await ensure(prisma.currencyRate, { code: 'USD' }, { code: 'USD', name: 'AQSh dollari', rateToUzs: 12800n * RATE_SCALE });
  await ensure(prisma.currencyHistory, { currencyId: usd.id }, { currencyId: usd.id, rateToUzs: 12800n * RATE_SCALE });

  // ── Users (5 rol) ──
  const superadmin = await prisma.user.create({
    data: { fullName: 'Asadbek Superadmin', passwordHash, role: 'superadmin', positionId: positions[3].id, fixedSalary: sum(0) },
  });
  const admin = await prisma.user.create({
    data: { fullName: 'Akmal Adminov', passwordHash, role: 'admin', positionId: positions[3].id, fixedSalary: sum(15000000) },
  });
  const manager = await prisma.user.create({
    data: { fullName: 'Bekzod Menejer', passwordHash, role: 'manager', positionId: positions[3].id, fixedSalary: sum(12000000) },
  });
  const accountant = await prisma.user.create({
    data: { fullName: 'Dilnoza Buxgalter', passwordHash, role: 'accountant', positionId: positions[3].id, fixedSalary: sum(10000000) },
  });
  const auditor = await prisma.user.create({
    data: { fullName: 'Gulnora Nazoratchi', passwordHash, role: 'auditor', positionId: positions[3].id, fixedSalary: sum(11000000) },
  });
  const emp1 = await prisma.user.create({
    data: { fullName: 'Sardor Frontendchi', passwordHash, role: 'employee', positionId: positions[0].id, fixedSalary: sum(8000000) },
  });
  const emp2 = await prisma.user.create({
    data: { fullName: 'Madina Dizayner', passwordHash, role: 'employee', positionId: positions[2].id, fixedSalary: sum(7000000) },
  });
  const emp3 = await prisma.user.create({
    data: { fullName: 'Jasur Backendchi', passwordHash, role: 'employee', positionId: positions[1].id, fixedSalary: sum(9000000) },
  });

  // ── Clients ──
  const client1 = await prisma.client.create({
    data: {
      name: 'OOO "Tech Solutions"', type: 'yuridik', phone: '+998901112233', email: 'info@techsol.uz',
      address: 'Toshkent sh., Chilonzor', regionId: regions[0].id, managerId: manager.id, status: 'active',
      note: 'Doimiy mijoz',
    },
  });
  const client2 = await prisma.client.create({
    data: {
      name: 'Aziz Karimov', type: 'jismoniy', phone: '+998935556677', email: 'aziz@gmail.com',
      address: 'Samarqand sh.', regionId: regions[1].id, managerId: manager.id, status: 'active',
    },
  });
  const client3 = await prisma.client.create({
    data: {
      name: 'OOO "Savdo Market"', type: 'yuridik', phone: '+998977778899', email: 'sales@savdomarket.uz',
      address: 'Buxoro sh.', regionId: regions[2].id, managerId: manager.id, status: 'active',
    },
  });

  // ── Projects ──
  const now = new Date('2026-05-30T00:00:00Z');
  const addDays = (d) => new Date(now.getTime() + d * 86400000);

  const project1 = await prisma.project.create({
    data: {
      name: 'Tech Solutions korporativ sayti', typeId: projectTypes[1].id,
      description: 'Kompaniya uchun korporativ veb-sayt.', deadline: addDays(20),
      status: 'active', price: sum(45000000), currency: 'UZS', paymentStatus: 'unpaid',
      clientId: client1.id, progressPercent: 40, createdBy: admin.id,
      members: {
        create: [
          { userId: manager.id, roleInProject: 'manager', shareAmount: sum(5000000), shareCurrency: 'UZS' },
          { userId: emp1.id, roleInProject: 'employee', shareAmount: sum(8000000), shareCurrency: 'UZS' },
          { userId: emp2.id, roleInProject: 'employee', shareAmount: sum(6000000), shareCurrency: 'UZS' },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Savdo Market internet-do\'koni', typeId: projectTypes[2].id,
      description: 'E-commerce platforma.', deadline: addDays(-3),
      status: 'overdue', price: sum(80000000), currency: 'UZS', paymentStatus: 'unpaid',
      clientId: client3.id, progressPercent: 65, createdBy: admin.id,
      members: {
        create: [
          { userId: manager.id, roleInProject: 'manager', shareAmount: sum(8000000), shareCurrency: 'UZS' },
          { userId: emp1.id, roleInProject: 'employee', shareAmount: sum(10000000), shareCurrency: 'UZS' },
          { userId: emp3.id, roleInProject: 'employee', shareAmount: sum(12000000), shareCurrency: 'UZS' },
        ],
      },
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Aziz Landing page', typeId: projectTypes[0].id,
      description: 'Shaxsiy brending uchun landing.', deadline: addDays(40),
      status: 'completed', price: sum(12000000), currency: 'UZS', paymentStatus: 'paid',
      clientId: client2.id, progressPercent: 100, createdBy: manager.id,
      members: {
        create: [
          { userId: manager.id, roleInProject: 'manager', shareAmount: sum(2000000), shareCurrency: 'UZS', paidToBalance: true },
          { userId: emp2.id, roleInProject: 'employee', shareAmount: sum(4000000), shareCurrency: 'UZS', paidToBalance: true },
        ],
      },
    },
  });

  // ── Client payment (completed loyiha) ──
  await prisma.clientPayment.create({
    data: { clientId: client2.id, projectId: project3.id, amount: sum(12000000), currency: 'UZS', date: addDays(-10) },
  });

  // ── Tasks (Kanban namunalari — har bir status va taxminiy vaqt bilan to'liq) ──
  // uid: "<LOYIHA-KOD>-T-<NN>" ko'rinishida (app generatsiyasiga mos namuna).
  await prisma.task.createMany({
    data: [
      // project1 (active)
      { uid: 'TSK-T-0001', projectId: project1.id, title: 'Bosh sahifa dizayni', description: 'Figma maketi tayyorlash', assigneeId: emp2.id, createdBy: manager.id, status: 'done', priority: 'high', type: 'feature', positionId: positions[2].id, estimatedMinutes: 480, deadline: addDays(2), orderIndex: 0 },
      { uid: 'TSK-T-0002', projectId: project1.id, title: 'Header komponenti', description: 'Responsive header + menyu', assigneeId: emp1.id, createdBy: manager.id, status: 'in_progress', priority: 'medium', type: 'feature', positionId: positions[0].id, estimatedMinutes: 240, deadline: addDays(5), orderIndex: 0 },
      { uid: 'TSK-T-0003', projectId: project1.id, title: 'API integratsiyasi', description: 'Backend bilan ulash', assigneeId: emp1.id, createdBy: manager.id, status: 'todo', priority: 'medium', type: 'feature', positionId: positions[0].id, estimatedMinutes: 360, deadline: addDays(10), orderIndex: 1 },
      { uid: 'TSK-T-0004', projectId: project1.id, title: 'Footer va kontaktlar', assigneeId: emp2.id, createdBy: manager.id, status: 'todo', priority: 'low', type: 'feature', positionId: positions[2].id, estimatedMinutes: 120, deadline: addDays(12), orderIndex: 2 },
      { uid: 'TSK-T-0005', projectId: project1.id, title: 'SEO meta-teglar', description: 'Qayta ko\'rib chiqilsin', assigneeId: emp1.id, createdBy: manager.id, status: 'rejected', priority: 'medium', type: 'extra', positionId: positions[0].id, estimatedMinutes: 90, deadline: addDays(6), reopenedCount: 1, rejectReason: 'Meta-teglar to\'liq emas, qayta to\'ldirilsin', orderIndex: 0 },
      // project2 (overdue)
      { uid: 'SVD-T-0001', projectId: project2.id, title: 'Savatcha logikasi', assigneeId: emp3.id, createdBy: manager.id, status: 'overdue', priority: 'critical', type: 'bug', positionId: positions[1].id, estimatedMinutes: 480, deadline: addDays(-2), orderIndex: 0 },
      { uid: 'SVD-T-0002', projectId: project2.id, title: 'To\'lov shlyuzi (Payme/Click)', assigneeId: emp3.id, createdBy: manager.id, status: 'in_progress', priority: 'high', type: 'feature', positionId: positions[1].id, estimatedMinutes: 600, deadline: addDays(7), orderIndex: 1 },
      { uid: 'SVD-T-0003', projectId: project2.id, title: 'Mahsulot kartasi', assigneeId: emp1.id, createdBy: manager.id, status: 'checked', priority: 'medium', type: 'feature', positionId: positions[0].id, estimatedMinutes: 240, deadline: addDays(3), orderIndex: 0 },
      { uid: 'SVD-T-0004', projectId: project2.id, title: 'Admin panel CRUD', assigneeId: emp3.id, createdBy: manager.id, status: 'done', priority: 'high', type: 'feature', positionId: positions[1].id, estimatedMinutes: 360, deadline: addDays(1), reopenedCount: 1, orderIndex: 0 },
      { uid: 'SVD-T-0005', projectId: project2.id, title: 'Qidiruv filtri', assigneeId: emp1.id, createdBy: manager.id, status: 'todo', priority: 'low', type: 'research', positionId: positions[0].id, estimatedMinutes: 180, deadline: addDays(8), orderIndex: 1 },
      // project3 (completed)
      { uid: 'AZL-T-0001', projectId: project3.id, title: 'Landing yig\'ish', assigneeId: emp2.id, createdBy: manager.id, status: 'production', priority: 'low', type: 'feature', positionId: positions[2].id, estimatedMinutes: 300, deadline: addDays(-15), orderIndex: 0 },
      { uid: 'AZL-T-0002', projectId: project3.id, title: 'Animatsiyalar', assigneeId: emp2.id, createdBy: manager.id, status: 'production', priority: 'low', type: 'extra', positionId: positions[2].id, estimatedMinutes: 120, deadline: addDays(-16), orderIndex: 1 },
      { uid: 'AZL-T-0003', projectId: project3.id, title: 'Mobil moslashuv', assigneeId: emp1.id, createdBy: manager.id, status: 'checked', priority: 'medium', type: 'feature', positionId: positions[0].id, estimatedMinutes: 240, deadline: addDays(-14), orderIndex: 0 },
    ],
  });

  // Keyingi bo'limlarda ulash uchun vazifa id'larini olamiz.
  const rejectedTask = await prisma.task.findFirst({ where: { status: 'rejected' } });
  const checkedTask = await prisma.task.findFirst({ where: { status: 'checked' } });

  // ── Vazifa izohlari (detal oynasini boyitish uchun) ──
  if (rejectedTask) {
    await prisma.taskComment.create({ data: { taskId: rejectedTask.id, userId: manager.id, body: 'Meta-teglar to\'liq emas, qayta to\'ldirilsin.' } });
    await prisma.taskComment.create({ data: { taskId: rejectedTask.id, userId: emp1.id, body: 'Tushunarli, bugun to\'g\'irlayman.' } });
  }

  // ── Kundalik rejalar (daily plans) ──
  const today = new Date();
  const dayAt = (offset) => new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  const todayDate = dayAt(0);
  await prisma.dailyPlan.createMany({
    data: [
      { userId: emp1.id, title: 'Kod review qilish', description: 'PR larni ko\'rib chiqish', date: todayDate, time: '10:00', priority: 'high', isDone: false },
      { userId: emp1.id, title: 'Hujjatlarni yangilash', date: todayDate, time: '15:30', priority: 'medium', isDone: true },
      { userId: emp2.id, title: 'Logotip variantlari', description: '3 ta variant tayyorlash', date: todayDate, time: '11:00', priority: 'high', isDone: false },
      { userId: emp3.id, title: 'Bazani optimallashtirish', date: todayDate, time: '14:00', priority: 'medium', isDone: false },
      { userId: emp3.id, title: 'Unit testlar yozish', date: dayAt(1), time: '09:30', priority: 'low', isDone: false },
      { userId: manager.id, title: 'Mijoz bilan qo\'ng\'iroq', description: 'Savdo Market loyihasi bo\'yicha', date: dayAt(1), time: '16:00', priority: 'high', isDone: false },
    ],
  });

  // ── Sample expenses ──
  await prisma.expense.create({
    data: { categoryId: expenseCategories[0].id, amount: sum(5000000), currency: 'UZS', amountUzs: sum(5000000), note: 'Ofis ijarasi (may)', createdBy: admin.id, date: addDays(-5) },
  });
  await prisma.expense.create({
    data: { categoryId: expenseCategories[1].id, amount: sum(1200000), currency: 'UZS', amountUzs: sum(1200000), note: 'Elektr va internet', createdBy: admin.id, date: addDays(-4) },
  });
  await prisma.expense.create({
    data: { categoryId: expenseCategories[3].id, amount: sum(200), currency: 'USD', amountUzs: sum(200 * 12800), note: 'Facebook reklama', createdBy: admin.id, date: addDays(-2) },
  });

  // ── HR: Nomzodlar arizalari ──
  await prisma.application.createMany({
    data: [
      { fullName: 'Oybek Rahimov', phone: '+998901234567', telegram: '@oybekr', isStudent: true, university: 'TATU', regionId: regions[0].id, districtId: districts[0].id, positionId: positions[0].id, portfolio: 'https://github.com/oybek', extraInfo: 'React bo\'yicha 1 yillik tajriba', status: 'pending' },
      { fullName: 'Nilufar Yusupova', phone: '+998935551122', isStudent: false, regionId: regions[1].id, positionId: positions[2].id, status: 'pending' },
    ],
  });
  await prisma.application.create({
    data: { fullName: 'Sherzod Aliyev', phone: '+998977778800', isStudent: false, regionId: regions[0].id, districtId: districts[1].id, positionId: positions[1].id, status: 'accepted', conclusion: 'Kuchli nomzod, suhbatga taklif qilindi', reviewedBy: admin.id, reviewedAt: addDays(-1) },
  });

  // ── Yig'ilishlar (meetings) + qatnashish (attendance) ──
  // 1) O'tgan, yakunlangan sprint (project1) — qatnashish belgilangan.
  await prisma.meeting.create({
    data: {
      uid: 'TSK-M-0001', title: 'Haftalik sprint rejasi', projectId: project1.id,
      content: 'Sprint vazifalarini taqsimlash', duration: 60, startAt: addDays(-2),
      finishedAt: new Date(addDays(-2).getTime() + 60 * 60000), createdBy: manager.id, penaltyPercent: 5,
      attendance: {
        create: [
          { userId: manager.id, attended: true },
          { userId: emp1.id, attended: true },
          { userId: emp2.id, attended: false, absenceReason: 'Kasallik sababli' },
        ],
      },
    },
  });
  // 2) Kelgusi texnik ko'rik (project2) — hali tugamagan, Google Meet havolasi bilan.
  const meetingUpcoming = await prisma.meeting.create({
    data: {
      uid: 'SVD-M-0001', title: 'Texnik ko\'rib chiqish', projectId: project2.id,
      content: 'To\'lov shlyuzi arxitekturasi', duration: 90, startAt: addDays(3),
      meetLink: 'https://meet.google.com/abc-defg-hij', meetAccount: 'asositllm', createdBy: manager.id,
      attendance: {
        create: [
          { userId: manager.id, attended: false },
          { userId: emp1.id, attended: false },
          { userId: emp3.id, attended: false },
        ],
      },
    },
  });
  // 3) Umumiy yig'ilish (loyihasiz) — yakunlangan.
  await prisma.meeting.create({
    data: {
      uid: 'GEN-M-0001', title: 'Oylik umumiy yig\'ilish', content: 'Natijalar va rejalar',
      duration: 45, startAt: addDays(-7), finishedAt: new Date(addDays(-7).getTime() + 45 * 60000), createdBy: admin.id,
      attendance: {
        create: [
          { userId: superadmin.id, attended: true },
          { userId: admin.id, attended: true },
          { userId: manager.id, attended: true },
          { userId: accountant.id, attended: false, absenceReason: 'Bank ishi bo\'yicha tashqarida' },
          { userId: emp1.id, attended: true },
          { userId: emp2.id, attended: true },
          { userId: emp3.id, attended: true },
        ],
      },
    },
  });

  // ── Moliya: loyiha ulushlari (project3 yakunlandi → balansga kirim) ──
  // Ledger har doim UZS tiyin; project_share = kredit (balansni oshiradi).
  await prisma.ledgerEntry.create({ data: { userId: manager.id, amount: sum(2000000), type: 'project_share', direction: 'credit', note: 'Aziz Landing — loyiha ulushi' } });
  await prisma.ledgerEntry.create({ data: { userId: emp2.id, amount: sum(4000000), type: 'project_share', direction: 'credit', note: 'Aziz Landing — loyiha ulushi' } });

  // ── Moliya so'rovlari (har xil holatda) + ledger ──
  // pending — hali to'lanmagan
  await prisma.financeRequest.create({
    data: { userId: emp1.id, amount: sum(2000000), currency: 'UZS', reason: 'Oylik avans', type: 'salary', status: 'pending', card: '8600 **** **** 1234' },
  });
  // paid — buxgalter to'lagan (Pending), ledger debit yozilgan
  const reqPaid = await prisma.financeRequest.create({
    data: { userId: emp3.id, amount: sum(1500000), currency: 'UZS', reason: 'Oylik yechib olish', type: 'salary', status: 'paid', paidAt: addDays(-3), paidBy: accountant.id, paymentMethod: 'card', card: '8600 **** **** 5678' },
  });
  await prisma.ledgerEntry.create({ data: { requestId: reqPaid.id, userId: emp3.id, amount: sum(1500000), type: 'salary', direction: 'debit', note: 'To\'lov: Oylik yechib olish' } });
  // closed — xodim tasdiqlagan (balansdan ayrilgan)
  const reqClosed = await prisma.financeRequest.create({
    data: { userId: emp2.id, amount: sum(1000000), currency: 'UZS', reason: 'Shaxsiy ehtiyoj', type: 'salary', status: 'closed', paidAt: addDays(-8), confirmedAt: addDays(-7), paidBy: accountant.id, paymentMethod: 'cash', card: '8600 **** **** 9012' },
  });
  await prisma.ledgerEntry.create({ data: { requestId: reqClosed.id, userId: emp2.id, amount: sum(1000000), type: 'salary', direction: 'debit', note: 'To\'lov: Shaxsiy ehtiyoj' } });
  // company — kompaniya xarajati (balansga ta'sirsiz), loyihaga bog'langan
  const reqCompany = await prisma.financeRequest.create({
    data: { userId: admin.id, amount: sum(3000000), currency: 'UZS', reason: 'Server va domen to\'lovi', type: 'company', status: 'paid', paidAt: addDays(-4), paidBy: accountant.id, paymentMethod: 'card', projectId: project1.id },
  });
  await prisma.ledgerEntry.create({ data: { requestId: reqCompany.id, userId: admin.id, amount: sum(3000000), type: 'company', direction: 'debit', note: 'To\'lov: Server va domen' } });
  // rejected — bekor qilingan (sabab bilan)
  await prisma.financeRequest.create({
    data: { userId: emp1.id, amount: sum(500000), currency: 'UZS', reason: 'Tushlik puli', type: 'other', status: 'rejected', cancelReason: 'Byudjetda mablag‘ yetarli emas', canceledAt: addDays(-2) },
  });

  // Balanslar (yuqoridagi kredit/debetlarga mos): manager +2M, emp2 +4M-1M=3M.
  await prisma.user.update({ where: { id: manager.id }, data: { balance: sum(2000000) } });
  await prisma.user.update({ where: { id: emp2.id }, data: { balance: sum(3000000) } });

  // ── Oyliklar (payroll) — 2026-05, har xil holatda ──
  const PM = '2026-05';
  await prisma.payroll.createMany({
    data: [
      { userId: emp1.id, month: PM, fixedAmount: sum(8000000), projectShareTotal: sum(0), total: sum(8000000), status: 'closed', paidAt: addDays(-6), confirmedAt: addDays(-5) },
      { userId: emp2.id, month: PM, fixedAmount: sum(7000000), projectShareTotal: sum(4000000), total: sum(11000000), status: 'paid', paidAt: addDays(-4) },
      { userId: emp3.id, month: PM, fixedAmount: sum(9000000), projectShareTotal: sum(0), total: sum(9000000), status: 'ready' },
      { userId: manager.id, month: PM, fixedAmount: sum(12000000), projectShareTotal: sum(2000000), total: sum(14000000), status: 'draft' },
      { userId: admin.id, month: PM, fixedAmount: sum(15000000), projectShareTotal: sum(0), total: sum(15000000), status: 'draft' },
      { userId: accountant.id, month: PM, fixedAmount: sum(10000000), projectShareTotal: sum(0), total: sum(10000000), status: 'draft' },
    ],
  });

  // ── Bildirishnomalar (real task/meeting id'lariga ulangan) ──
  const notifications = [
    { userId: emp1.id, type: 'meeting_scheduled', payload: { meetingId: meetingUpcoming.id, title: meetingUpcoming.title } },
    { userId: emp3.id, type: 'meeting_scheduled', payload: { meetingId: meetingUpcoming.id, title: meetingUpcoming.title } },
  ];
  if (rejectedTask) notifications.push({ userId: emp1.id, type: 'task_rejected', isRead: false, payload: { taskId: rejectedTask.id, title: rejectedTask.title, reason: rejectedTask.rejectReason } });
  if (checkedTask) notifications.push({ userId: emp1.id, type: 'task_checked', isRead: true, payload: { taskId: checkedTask.id, title: checkedTask.title } });
  await prisma.notification.createMany({ data: notifications });

  console.log('✅ Seed tugadi.');
  console.log('\n── Test loginlar (parol: ' + PASSWORD + ') ──');
  console.log('  superadmin : Asadbek Superadmin');
  console.log('  admin      : Akmal Adminov');
  console.log('  manager    : Bekzod Menejer');
  console.log('  accountant : Dilnoza Buxgalter');
  console.log('  auditor    : Gulnora Nazoratchi');
  console.log('  employee   : Sardor Frontendchi / Madina Dizayner / Jasur Backendchi');
}

main()
  .catch((e) => {
    console.error('❌ Seed xato:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
