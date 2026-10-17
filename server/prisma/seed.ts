import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding initial admin and settings...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Admin (Exclusive Administrator Account)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@drivepulse.com' },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: 'admin@drivepulse.com',
      fullName: 'Admin User',
      phone: '+91 98765 43210',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin ready: ${admin.email}`);

  // Migrate any previous SUPER_ADMIN role records to ADMIN
  await prisma.user.updateMany({
    where: { role: 'SUPER_ADMIN' },
    data: { role: 'ADMIN' },
  });

  // Reassign historical foreign key relationships to Admin
  await prisma.booking.updateMany({
    data: { createdByUserId: admin.id },
  });
  await prisma.inspectionChecklist.updateMany({
    data: { inspectedByUserId: admin.id },
  });
  await prisma.payment.updateMany({
    data: { receivedByUserId: admin.id },
  });
  await prisma.auditLog.updateMany({
    data: { userId: admin.id },
  });

  // Remove manager and staff accounts as only admin login is needed
  await prisma.user.deleteMany({
    where: { email: { in: ['manager@drivepulse.com', 'staff@drivepulse.com'] } },
  });

  // Initial business settings
  const defaultSettings = [
    { key: 'BUSINESS_NAME', value: 'DrivePulse Rentals India Pvt Ltd', category: 'BUSINESS' },
    { key: 'GSTIN', value: '29ABCDE1234F1Z5', category: 'BUSINESS' },
    { key: 'PHONE', value: '+91 80 4123 4567', category: 'BUSINESS' },
    { key: 'EMAIL', value: 'contact@drivepulse.com', category: 'BUSINESS' },
    { key: 'ADDRESS', value: 'Ground Floor, Indiranagar 100ft Road, Bangalore, Karnataka - 560038', category: 'BUSINESS' },
    { key: 'GST_RATE', value: '18', category: 'TAX' },
    { key: 'DEFAULT_KM_LIMIT', value: '250', category: 'OPERATIONS' },
    { key: 'EXTRA_KM_RATE', value: '12', category: 'OPERATIONS' },
    { key: 'LATE_FEE_PER_HOUR', value: '300', category: 'OPERATIONS' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, category: s.category },
      create: { key: s.key, value: s.value, category: s.category },
    });
  }
  console.log('✅ Default settings configured');

  // Check if vehicles exist before cleaning
  const vehicleCount = await prisma.vehicle.count();
  if (vehicleCount > 0) {
    console.log(`ℹ️ Fleet already contains ${vehicleCount} vehicle(s). Preserving existing operational records.`);
  } else {
    console.log('🧹 Purging any remnant test records...');
    await prisma.inspectionChecklist.deleteMany();
    await prisma.bookingExtra.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.customerDocument.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vehicleDocumentHistory.deleteMany();
    await prisma.vehicleDocument.deleteMany();
    await prisma.maintenanceRecord.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.auditLog.deleteMany();
    console.log('✅ Pristine state: 0 vehicles, 0 test customers, 0 test bookings, 0 test payments.');
  }

  console.log('🎉 Web application ready for live production use with manual vehicle entry!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
