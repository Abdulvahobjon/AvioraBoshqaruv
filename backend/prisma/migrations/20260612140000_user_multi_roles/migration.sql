-- Bir foydalanuvchida bir nechta rol: 'roles' — asosiy 'role'dan tashqari qo'shimcha rollar.
-- Mavjud foydalanuvchilar uchun bo'sh ([]) qoladi (ruxsat = [role] ∪ roles, ya'ni faqat asosiy rol).
ALTER TABLE "users" ADD COLUMN "roles" "Role"[] DEFAULT ARRAY[]::"Role"[];
