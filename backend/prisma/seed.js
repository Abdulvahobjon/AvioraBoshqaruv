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
  console.log('🌱 Seeding...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Reference: regions ──
  const regionNames = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg\'ona'];
  const regions = [];
  for (const name of regionNames) {
    regions.push(await prisma.region.create({ data: { name } }));
  }

  // ── Reference: positions ──
  const positionNames = ['Frontend dasturchi', 'Backend dasturchi', 'UI/UX dizayner', 'Loyiha menejeri', 'QA muhandis'];
  const positions = [];
  for (const name of positionNames) {
    positions.push(await prisma.position.create({ data: { name } }));
  }

  // ── Reference: project types (standart 5 ta) ──
  const typeNames = ['Landing page', 'Korporativ sayt', 'Internet-do\'kon', 'Veb-ilova', 'Admin panel'];
  const projectTypes = [];
  for (const name of typeNames) {
    projectTypes.push(await prisma.projectType.create({ data: { name } }));
  }

  // ── Reference: expense categories ──
  const expCatNames = ['Ijara', 'Kommunal', 'Texnika', 'Marketing', 'Boshqa'];
  const expenseCategories = [];
  for (const name of expCatNames) {
    expenseCategories.push(await prisma.expenseCategory.create({ data: { name } }));
  }

  // ── Currencies ──
  await prisma.currencyRate.create({ data: { code: 'UZS', name: 'O\'zbek so\'mi', rateToUzs: 1 } });
  const usd = await prisma.currencyRate.create({ data: { code: 'USD', name: 'AQSh dollari', rateToUzs: 12800 } });
  await prisma.currencyHistory.create({ data: { currencyId: usd.id, rateToUzs: 12800 } });

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

  // ── Tasks (Kanban namunalari) ──
  await prisma.task.createMany({
    data: [
      { projectId: project1.id, title: 'Bosh sahifa dizayni', description: 'Figma maketi', assigneeId: emp2.id, status: 'done', priority: 'high', type: 'feature', positionId: positions[2].id, deadline: addDays(2), orderIndex: 0 },
      { projectId: project1.id, title: 'Header komponenti', assigneeId: emp1.id, status: 'in_progress', priority: 'medium', type: 'feature', positionId: positions[0].id, deadline: addDays(5), orderIndex: 0 },
      { projectId: project1.id, title: 'API integratsiyasi', assigneeId: emp1.id, status: 'todo', priority: 'medium', type: 'feature', positionId: positions[0].id, deadline: addDays(10), orderIndex: 1 },
      { projectId: project2.id, title: 'Savatcha logikasi', assigneeId: emp3.id, status: 'overdue', priority: 'critical', type: 'bug', positionId: positions[1].id, deadline: addDays(-2), orderIndex: 0 },
      { projectId: project2.id, title: 'To\'lov shlyuzi', assigneeId: emp3.id, status: 'in_progress', priority: 'high', type: 'feature', positionId: positions[1].id, deadline: addDays(7), orderIndex: 1 },
      { projectId: project2.id, title: 'Mahsulot kartasi', assigneeId: emp1.id, status: 'checked', priority: 'medium', type: 'feature', positionId: positions[0].id, deadline: addDays(3), orderIndex: 0 },
      { projectId: project3.id, title: 'Landing yig\'ish', assigneeId: emp2.id, status: 'production', priority: 'low', type: 'feature', positionId: positions[2].id, deadline: addDays(-15), orderIndex: 0 },
    ],
  });

  // ── Todos ──
  await prisma.todo.createMany({
    data: [
      { userId: emp1.id, title: 'Kod review qilish', isDone: false },
      { userId: emp1.id, title: 'Hujjatlarni yangilash', isDone: true },
    ],
  });

  // ── Sample expense ──
  await prisma.expense.create({
    data: { categoryId: expenseCategories[0].id, amount: sum(5000000), currency: 'UZS', amountUzs: sum(5000000), note: 'Ofis ijarasi (may)', createdBy: admin.id, date: addDays(-5) },
  });

  console.log('✅ Seed tugadi.');
  console.log('\n── Test loginlar (parol: ' + PASSWORD + ') ──');
  console.log('  superadmin : Asadbek Superadmin');
  console.log('  admin      : Akmal Adminov');
  console.log('  manager    : Bekzod Menejer');
  console.log('  accountant : Dilnoza Buxgalter');
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
