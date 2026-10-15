import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding initial users...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@drivepulse.com' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: 'admin@drivepulse.com',
      fullName: 'Rajesh Sharma',
      phone: '+91 98765 43210',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Super Admin created: ${admin.email}`);

  // 2. Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@drivepulse.com' },
    update: {
      passwordHash,
      role: 'MANAGER',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: 'manager@drivepulse.com',
      fullName: 'Vikram Malhotra',
      phone: '+91 98765 43211',
      passwordHash,
      role: 'MANAGER',
      isActive: true,
    },
  });
  console.log(`✅ Manager created: ${manager.email}`);

  // 3. Staff
  const staff = await prisma.user.upsert({
    where: { email: 'staff@drivepulse.com' },
    update: {
      passwordHash,
      role: 'STAFF',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: 'staff@drivepulse.com',
      fullName: 'Pooja Verma',
      phone: '+91 98765 43212',
      passwordHash,
      role: 'STAFF',
      isActive: true,
    },
  });
  console.log(`✅ Staff created: ${staff.email}`);

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
  console.log('✅ Default settings seeded');

  // Seed 10 realistic vehicles with compliance documents
  console.log('🚗 Seeding 10 fleet vehicles with compliance documents...');

  const now = new Date();
  const daysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const vehiclesData = [
    {
      registrationNumber: 'KA01MF2024',
      make: 'Hyundai',
      model: 'Creta',
      variant: 'SX (O)',
      year: 2023,
      color: 'Polar White',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      chassisNumber: 'MALC181CLPM102938',
      engineNumber: 'G4FLPM839201',
      odometer: 18450,
      dailyRate: 3200,
      weeklyRate: 19500,
      monthlyRate: 68000,
      securityDeposit: 6000,
      kmLimitPerDay: 250,
      extraKmCharge: 14,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'HDFC-ERGO-992102', issue: daysFromNow(-180), exp: daysFromNow(185), provider: 'HDFC ERGO', idv: 1450000, prem: 28500 },
        { type: 'FITNESS', num: 'FIT-KA01-2023-88', issue: daysFromNow(-365), exp: daysFromNow(365) },
        { type: 'PUC', num: 'PUC-KA-889912', issue: daysFromNow(-60), exp: daysFromNow(120) },
        { type: 'RC', num: 'RC-KA01MF2024', issue: daysFromNow(-365), exp: daysFromNow(1500) },
      ],
      maintenance: [
        { type: 'Routine 15K Service', cost: 5800, vendor: 'Advaith Hyundai Indiranagar', odo: 15100, nextOdo: 25000, nextDate: daysFromNow(180) },
      ],
      expenses: [
        { cat: 'Fuel', amount: 3500, date: daysFromNow(-10), notes: 'Full tank Petrol' },
      ],
    },
    {
      registrationNumber: 'KA03NH7788',
      make: 'Mahindra',
      model: 'Thar',
      variant: 'LX 4x4 Hard Top',
      year: 2023,
      color: 'Napoli Black',
      fuelType: 'Diesel',
      transmission: 'Manual',
      seats: 4,
      chassisNumber: 'MA1TA2W60P2A99120',
      engineNumber: 'D20D4P998210',
      odometer: 24300,
      dailyRate: 4000,
      weeklyRate: 24000,
      monthlyRate: 85000,
      securityDeposit: 8000,
      kmLimitPerDay: 250,
      extraKmCharge: 18,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'ICICI-LOMB-778891', issue: daysFromNow(-355), exp: daysFromNow(10), provider: 'ICICI Lombard', idv: 1600000, prem: 34000 }, // Expiring soon in 10 days
        { type: 'FITNESS', num: 'FIT-KA03-2023-11', issue: daysFromNow(-365), exp: daysFromNow(365) },
        { type: 'PUC', num: 'PUC-KA-771122', issue: daysFromNow(-120), exp: daysFromNow(60) },
        { type: 'RC', num: 'RC-KA03NH7788', issue: daysFromNow(-365), exp: daysFromNow(1460) },
      ],
      maintenance: [],
      expenses: [{ cat: 'Repairs', amount: 2200, date: daysFromNow(-15), notes: 'Tyre puncture & balancing' }],
    },
    {
      registrationNumber: 'KA05MN1234',
      make: 'Maruti Suzuki',
      model: 'Swift',
      variant: 'ZXi Plus',
      year: 2022,
      color: 'Lucent Orange',
      fuelType: 'Petrol',
      transmission: 'Manual',
      seats: 5,
      chassisNumber: 'MBHEZC11SNA109283',
      engineNumber: 'K12MN820192',
      odometer: 38200,
      dailyRate: 2000,
      weeklyRate: 12500,
      monthlyRate: 44000,
      securityDeposit: 4000,
      kmLimitPerDay: 250,
      extraKmCharge: 10,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1590362891988-f778047030e2?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'TATA-AIG-123490', issue: daysFromNow(-200), exp: daysFromNow(165), provider: 'Tata AIG', idv: 720000, prem: 16500 },
        { type: 'FITNESS', num: 'FIT-KA05-2022-44', issue: daysFromNow(-500), exp: daysFromNow(230) },
        { type: 'PUC', num: 'PUC-KA-112233', issue: daysFromNow(-200), exp: daysFromNow(-5) }, // EXPIRED 5 days ago! (Blocked)
        { type: 'RC', num: 'RC-KA05MN1234', issue: daysFromNow(-730), exp: daysFromNow(1100) },
      ],
      maintenance: [],
      expenses: [],
    },
    {
      registrationNumber: 'KA51AB9999',
      make: 'Toyota',
      model: 'Innova Crysta',
      variant: '2.4 ZX 7-Str',
      year: 2021,
      color: 'Silver Metallic',
      fuelType: 'Diesel',
      transmission: 'Automatic',
      seats: 7,
      chassisNumber: 'MBJ11BB30M1029841',
      engineNumber: '2GD8392019',
      odometer: 64100,
      dailyRate: 4800,
      weeklyRate: 29000,
      monthlyRate: 98000,
      securityDeposit: 10000,
      kmLimitPerDay: 300,
      extraKmCharge: 20,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'BAJAJ-ALLZ-999911', issue: daysFromNow(-150), exp: daysFromNow(215), provider: 'Bajaj Allianz', idv: 2100000, prem: 42000 },
        { type: 'FITNESS', num: 'FIT-KA51-2021-99', issue: daysFromNow(-730), exp: daysFromNow(-12) }, // EXPIRED 12 days ago! (Blocked)
        { type: 'PUC', num: 'PUC-KA-999900', issue: daysFromNow(-30), exp: daysFromNow(150) },
        { type: 'PERMIT', num: 'PERMIT-COMM-KA-99', issue: daysFromNow(-180), exp: daysFromNow(185) },
      ],
      maintenance: [{ type: 'Major 60K Service & Brake Pads', cost: 14500, vendor: 'Nandi Toyota Electronic City', odo: 60200, nextOdo: 70000 }],
      expenses: [{ cat: 'Fuel', amount: 5500, date: daysFromNow(-5), notes: 'Diesel 60L' }],
    },
    {
      registrationNumber: 'KA04EV4545',
      make: 'Tata',
      model: 'Nexon EV',
      variant: 'Max Empowered',
      year: 2023,
      color: 'Pristine White',
      fuelType: 'Electric',
      transmission: 'Automatic',
      seats: 5,
      chassisNumber: 'MAT623098PLA12093',
      engineNumber: 'EVEM454501',
      odometer: 14200,
      dailyRate: 3500,
      weeklyRate: 21000,
      monthlyRate: 72000,
      securityDeposit: 6000,
      kmLimitPerDay: 200,
      extraKmCharge: 15,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'CHOLA-MS-454500', issue: daysFromNow(-120), exp: daysFromNow(245), provider: 'Cholamandalam MS', idv: 1750000, prem: 29000 },
        { type: 'FITNESS', num: 'FIT-KA04-2023-45', issue: daysFromNow(-365), exp: daysFromNow(365) },
        { type: 'PUC', num: 'PUC-EXEMPT-EV-01', issue: daysFromNow(-365), exp: daysFromNow(1000) },
      ],
      maintenance: [],
      expenses: [{ cat: 'Misc', amount: 850, date: daysFromNow(-2), notes: 'Fast Charging KEB Station' }],
    },
    {
      registrationNumber: 'KA02KL5678',
      make: 'Kia',
      model: 'Seltos',
      variant: 'GTX Plus 1.5 Turbo',
      year: 2023,
      color: 'Gravity Grey',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      chassisNumber: 'MZBDC812LPA192039',
      engineNumber: 'G4TNA192039',
      odometer: 21000,
      dailyRate: 3400,
      weeklyRate: 20500,
      monthlyRate: 70000,
      securityDeposit: 6000,
      kmLimitPerDay: 250,
      extraKmCharge: 14,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'SBI-GEN-567812', issue: daysFromNow(-361), exp: daysFromNow(4), provider: 'SBI General Insurance', idv: 1820000, prem: 31000 }, // Expiring soon in 4 days!
        { type: 'FITNESS', num: 'FIT-KA02-2023-56', issue: daysFromNow(-365), exp: daysFromNow(365) },
        { type: 'PUC', num: 'PUC-KA-567890', issue: daysFromNow(-90), exp: daysFromNow(90) },
      ],
      maintenance: [],
      expenses: [],
    },
    {
      registrationNumber: 'KA01CNG789',
      make: 'Maruti Suzuki',
      model: 'Ertiga',
      variant: 'VXi CNG',
      year: 2022,
      color: 'Silky Silver',
      fuelType: 'CNG',
      transmission: 'Manual',
      seats: 7,
      chassisNumber: 'MA3ERE41SNA192837',
      engineNumber: 'K15CNG192039',
      odometer: 48900,
      dailyRate: 2600,
      weeklyRate: 16000,
      monthlyRate: 56000,
      securityDeposit: 5000,
      kmLimitPerDay: 250,
      extraKmCharge: 12,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'DIGIT-INS-789012', issue: daysFromNow(-100), exp: daysFromNow(265), provider: 'Go Digit', idv: 980000, prem: 19500 },
        { type: 'FITNESS', num: 'FIT-KA01-2022-78', issue: daysFromNow(-700), exp: daysFromNow(30) },
        { type: 'PUC', num: 'PUC-KA-789012', issue: daysFromNow(-45), exp: daysFromNow(135) },
      ],
      maintenance: [{ type: 'CNG Cylinder Hydro Test & Service', cost: 4200, vendor: 'Kalyani Motors', odo: 45000 }],
      expenses: [{ cat: 'Fuel', amount: 1800, date: daysFromNow(-8), notes: 'CNG gas fill' }],
    },
    {
      registrationNumber: 'KA05HC3344',
      make: 'Honda',
      model: 'City',
      variant: 'ZX CVT',
      year: 2022,
      color: 'Golden Brown',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      chassisNumber: 'MAKGN267PPA102938',
      engineNumber: 'L15ZB1928301',
      odometer: 31200,
      dailyRate: 3000,
      weeklyRate: 18000,
      monthlyRate: 62000,
      securityDeposit: 6000,
      kmLimitPerDay: 250,
      extraKmCharge: 13,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1590362891988-f778047030e2?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'RELIANCE-GEN-3344', issue: daysFromNow(-140), exp: daysFromNow(225), provider: 'Reliance General', idv: 1250000, prem: 24000 },
        { type: 'FITNESS', num: 'FIT-KA05-2022-33', issue: daysFromNow(-600), exp: daysFromNow(130) },
        { type: 'PUC', num: 'PUC-KA-334411', issue: daysFromNow(-50), exp: daysFromNow(130) },
        { type: 'ROAD_TAX', num: 'TAX-KA05-2022-HC', issue: daysFromNow(-345), exp: daysFromNow(20) }, // Expiring soon in 20 days
      ],
      maintenance: [],
      expenses: [],
    },
    {
      registrationNumber: 'KA03VW8811',
      make: 'Volkswagen',
      model: 'Taigun',
      variant: 'GT Plus 1.5 TSI DSG',
      year: 2023,
      color: 'Wild Cherry Red',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      chassisNumber: 'WVWZZZ2KZP1029381',
      engineNumber: 'DADA829102',
      odometer: 16500,
      dailyRate: 3600,
      weeklyRate: 22000,
      monthlyRate: 75000,
      securityDeposit: 7000,
      kmLimitPerDay: 250,
      extraKmCharge: 16,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'HDFC-ERGO-881100', issue: daysFromNow(-90), exp: daysFromNow(275), provider: 'HDFC ERGO', idv: 1950000, prem: 36000 },
        { type: 'FITNESS', num: 'FIT-KA03-2023-88', issue: daysFromNow(-365), exp: daysFromNow(365) },
        { type: 'PUC', num: 'PUC-KA-881122', issue: daysFromNow(-30), exp: daysFromNow(150) },
      ],
      maintenance: [],
      expenses: [],
    },
    {
      registrationNumber: 'KA04SC9000',
      make: 'Mahindra',
      model: 'Scorpio-N',
      variant: 'Z8L 4x4 AT',
      year: 2023,
      color: 'Dazzling Silver',
      fuelType: 'Diesel',
      transmission: 'Automatic',
      seats: 7,
      chassisNumber: 'MA1TA2Z80P2A10294',
      engineNumber: 'D22D4P192830',
      odometer: 29500,
      dailyRate: 4500,
      weeklyRate: 27000,
      monthlyRate: 92000,
      securityDeposit: 9000,
      kmLimitPerDay: 250,
      extraKmCharge: 18,
      status: 'AVAILABLE',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
      ]),
      docs: [
        { type: 'INSURANCE', num: 'ICICI-LOMB-900011', issue: daysFromNow(-380), exp: daysFromNow(-15), provider: 'ICICI Lombard', idv: 2400000, prem: 46000 }, // EXPIRED 15 days ago! (Blocked)
        { type: 'FITNESS', num: 'FIT-KA04-2023-90', issue: daysFromNow(-365), exp: daysFromNow(365) },
        { type: 'PUC', num: 'PUC-KA-900011', issue: daysFromNow(-40), exp: daysFromNow(140) },
      ],
      maintenance: [{ type: 'Synthetic Oil & Filter Service', cost: 8200, vendor: 'Sireesh Auto Marathahalli', odo: 25000 }],
      expenses: [{ cat: 'Tolls', amount: 950, date: daysFromNow(-12), notes: 'Fastag Bangalore-Mysore Expressway' }],
    },
  ];

  for (const v of vehiclesData) {
    const createdVehicle = await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: {
        make: v.make,
        model: v.model,
        variant: v.variant,
        year: v.year,
        color: v.color,
        fuelType: v.fuelType,
        transmission: v.transmission,
        seats: v.seats,
        chassisNumber: v.chassisNumber,
        engineNumber: v.engineNumber,
        odometer: v.odometer,
        dailyRate: v.dailyRate,
        weeklyRate: v.weeklyRate,
        monthlyRate: v.monthlyRate,
        securityDeposit: v.securityDeposit,
        kmLimitPerDay: v.kmLimitPerDay,
        extraKmCharge: v.extraKmCharge,
        status: v.status,
        photos: v.photos,
      },
      create: {
        registrationNumber: v.registrationNumber,
        make: v.make,
        model: v.model,
        variant: v.variant,
        year: v.year,
        color: v.color,
        fuelType: v.fuelType,
        transmission: v.transmission,
        seats: v.seats,
        chassisNumber: v.chassisNumber,
        engineNumber: v.engineNumber,
        odometer: v.odometer,
        dailyRate: v.dailyRate,
        weeklyRate: v.weeklyRate,
        monthlyRate: v.monthlyRate,
        securityDeposit: v.securityDeposit,
        kmLimitPerDay: v.kmLimitPerDay,
        extraKmCharge: v.extraKmCharge,
        status: v.status,
        photos: v.photos,
      },
    });

    // Seed docs
    for (const d of v.docs) {
      const status = d.exp < now ? 'EXPIRED' : d.exp <= daysFromNow(30) ? 'EXPIRING_SOON' : 'VALID';
      
      const existingDoc = await prisma.vehicleDocument.findFirst({
        where: { vehicleId: createdVehicle.id, type: d.type },
      });

      if (!existingDoc) {
        await prisma.vehicleDocument.create({
          data: {
            vehicleId: createdVehicle.id,
            type: d.type,
            documentNumber: d.num,
            issueDate: d.issue,
            expiryDate: d.exp,
            status,
            insuranceProvider: (d as any).provider,
            idv: (d as any).idv,
            premium: (d as any).prem,
            policyNumber: (d as any).num,
          },
        });
      }
    }

    // Seed maintenance
    for (const m of v.maintenance) {
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: createdVehicle.id,
          type: m.type,
          cost: m.cost,
          vendor: m.vendor,
          odometer: m.odo,
          serviceDate: daysFromNow(-30),
          nextServiceDueKm: m.nextOdo,
          nextServiceDueDate: m.nextDate,
        },
      });
    }

    // Seed expenses
    for (const e of v.expenses) {
      await prisma.expense.create({
        data: {
          vehicleId: createdVehicle.id,
          category: e.cat,
          amount: e.amount,
          date: e.date,
          notes: e.notes,
        },
      });
    }
  }

  console.log('✅ 10 Fleet Vehicles & Compliance Documents seeded successfully!');

  // Seed 8 realistic customers with KYC ID proofs & licence statuses
  console.log('👥 Seeding 8 customers with KYC proofs and licence statuses...');

  const customersData = [
    {
      fullName: 'Ananya Iyer',
      phone: '+91 98450 11223',
      alternatePhone: '+91 80 2525 1100',
      email: 'ananya.iyer@gmail.com',
      address: 'Flat 402, Prestige Palms, Whitefield, Bangalore - 560066',
      dob: new Date('1992-06-14'),
      occupation: 'Senior Product Manager',
      emergencyContactName: 'Sundar Iyer',
      emergencyContactPhone: '+91 98450 11224',
      emergencyContactRelation: 'Father',
      rating: 5,
      notes: 'Excellent driving record, returns vehicles clean and on time.',
      isBlacklisted: false,
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0320180012345', exp: daysFromNow(1200), verified: true },
        { type: 'AADHAAR', num: 'XXXX-XXXX-4512', verified: true },
        { type: 'SELFIE', num: 'SELFIE-ANANYA-01', verified: true },
      ],
    },
    {
      fullName: 'Karthik Reddy',
      phone: '+91 98860 22334',
      email: 'karthik.reddy@techcorp.com',
      address: 'Villa 18, Palm Meadows, Airport Road, Bangalore - 560037',
      dob: new Date('1988-11-23'),
      occupation: 'Tech Entrepreneur',
      emergencyContactName: 'Priya Reddy',
      emergencyContactPhone: '+91 98860 22335',
      emergencyContactRelation: 'Spouse',
      rating: 5,
      notes: 'Frequent weekend SUV renter, opt-in for comprehensive insurance.',
      isBlacklisted: false,
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0420190056789', exp: daysFromNow(1800), verified: true },
        { type: 'PASSPORT', num: 'Z8920192', verified: true },
      ],
    },
    {
      fullName: 'Meera Nambiar',
      phone: '+91 98440 33445',
      email: 'meera.nambiar@gmail.com',
      address: 'House 88, 14th Main, HSR Layout Sector 4, Bangalore - 560102',
      dob: new Date('1995-03-12'),
      occupation: 'Architect',
      emergencyContactName: 'Gopal Nambiar',
      emergencyContactPhone: '+91 98440 33446',
      emergencyContactRelation: 'Brother',
      rating: 4,
      notes: 'Customer notified that driving licence expires in 15 days; renewal in process.',
      isBlacklisted: false,
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0120200099887', exp: daysFromNow(15), verified: true }, // Expiring soon in 15 days!
        { type: 'AADHAAR', num: 'XXXX-XXXX-8921', verified: true },
      ],
    },
    {
      fullName: 'Rohan Dasgupta',
      phone: '+91 97310 44556',
      email: 'rohan.dasgupta@fintech.co',
      address: 'Tower 3 Flat 12B, Salarpuria Greenage, Hosur Road, Bangalore - 560068',
      dob: new Date('1990-08-30'),
      occupation: 'Investment Banker',
      emergencyContactName: 'Sharmila Dasgupta',
      emergencyContactPhone: '+91 97310 44557',
      emergencyContactRelation: 'Mother',
      rating: 3,
      notes: 'Driving licence expired 20 days ago. Requires updated licence copy before next rental pickup.',
      isBlacklisted: false,
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0520150044556', exp: daysFromNow(-20), verified: false }, // EXPIRED 20 days ago!
        { type: 'AADHAAR', num: 'XXXX-XXXX-1190', verified: true },
      ],
    },
    {
      fullName: 'Sameer Khan',
      phone: '+91 99000 55667',
      email: 'sameer.khan99@yahoo.com',
      address: 'Flat 101, Richmond Towers, Richmond Road, Bangalore - 560025',
      dob: new Date('1993-12-05'),
      occupation: 'Trader',
      emergencyContactName: 'Farhan Khan',
      emergencyContactPhone: '+91 99000 55668',
      emergencyContactRelation: 'Cousin',
      rating: 1,
      notes: 'BLACKLISTED: Unauthorized vehicle subletting and reckless speeding fine evasion on NICE Road.',
      isBlacklisted: true,
      blacklistReason: 'Unauthorized vehicle subletting & reckless speeding fine evasion',
      blacklistedAt: daysFromNow(-45),
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0220210088112', exp: daysFromNow(2000), verified: true },
        { type: 'AADHAAR', num: 'XXXX-XXXX-3344', verified: true },
      ],
    },
    {
      fullName: 'Divya Hegde',
      phone: '+91 98800 66778',
      email: 'divya.hegde@healthcorp.in',
      address: 'Plot 45, Judicial Layout, GKVK Post, Bangalore - 560065',
      dob: new Date('1987-04-18'),
      occupation: 'Surgeon',
      emergencyContactName: 'Mahesh Hegde',
      emergencyContactPhone: '+91 98800 66779',
      emergencyContactRelation: 'Spouse',
      rating: 5,
      notes: 'Premium customer, always opts for luxury automatic transmission.',
      isBlacklisted: false,
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0120170077889', exp: daysFromNow(950), verified: true },
        { type: 'PASSPORT', num: 'M4592019', verified: true },
      ],
    },
    {
      fullName: 'Arjun Nair',
      phone: '+91 94480 77889',
      email: 'arjun.nair@mediahouse.org',
      address: 'Flat G-2, Brigade Gateway, Malleshwaram, Bangalore - 560055',
      dob: new Date('1994-09-25'),
      occupation: 'Documentary Filmmaker',
      emergencyContactName: 'Radha Nair',
      emergencyContactPhone: '+91 94480 77890',
      emergencyContactRelation: 'Mother',
      rating: 4,
      notes: 'Rents SUVs for outstation western ghats shoots, reliable returns.',
      isBlacklisted: false,
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0420220033221', exp: daysFromNow(2200), verified: true },
        { type: 'VOTER_ID', num: 'ABC1920391', verified: true },
      ],
    },
    {
      fullName: 'Siddharth Bose',
      phone: '+91 99800 88990',
      email: 'siddharth.bose@lawfirm.in',
      address: 'Bungalow 7, Rest House Crescent, MG Road, Bangalore - 560001',
      dob: new Date('1983-01-15'),
      occupation: 'Advocate',
      emergencyContactName: 'Aarti Bose',
      emergencyContactPhone: '+91 99800 88991',
      emergencyContactRelation: 'Spouse',
      rating: 5,
      notes: 'Long-term monthly corporate rental customer.',
      isBlacklisted: false,
      docs: [
        { type: 'DRIVING_LICENCE', num: 'KA0320160011447', exp: daysFromNow(600), verified: true },
        { type: 'AADHAAR', num: 'XXXX-XXXX-7721', verified: true },
      ],
    },
  ];

  for (const c of customersData) {
    const createdCustomer = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {
        fullName: c.fullName,
        alternatePhone: c.alternatePhone,
        email: c.email,
        address: c.address,
        dob: c.dob,
        occupation: c.occupation,
        emergencyContactName: c.emergencyContactName,
        emergencyContactPhone: c.emergencyContactPhone,
        emergencyContactRelation: c.emergencyContactRelation,
        rating: c.rating,
        notes: c.notes,
        isBlacklisted: c.isBlacklisted,
        blacklistReason: c.blacklistReason,
        blacklistedAt: c.blacklistedAt,
      },
      create: {
        fullName: c.fullName,
        phone: c.phone,
        alternatePhone: c.alternatePhone,
        email: c.email,
        address: c.address,
        dob: c.dob,
        occupation: c.occupation,
        emergencyContactName: c.emergencyContactName,
        emergencyContactPhone: c.emergencyContactPhone,
        emergencyContactRelation: c.emergencyContactRelation,
        rating: c.rating,
        notes: c.notes,
        isBlacklisted: c.isBlacklisted,
        blacklistReason: c.blacklistReason,
        blacklistedAt: c.blacklistedAt,
      },
    });

    for (const d of c.docs) {
      const existingDoc = await prisma.customerDocument.findFirst({
        where: { customerId: createdCustomer.id, docType: d.type },
      });

      if (!existingDoc) {
        await prisma.customerDocument.create({
          data: {
            customerId: createdCustomer.id,
            docType: d.type,
            documentNumber: d.num,
            expiryDate: (d as any).exp || null,
            filePath: `/uploads/customers/${d.type.toLowerCase()}_sample.pdf`,
            isVerified: d.verified,
          },
        });
      }
    }
  }

    console.log('✅ 8 Customers & KYC ID Proofs seeded successfully!');

    // ==========================================
    // 5. Seed Bookings & Inspection Checklists
    // ==========================================
    console.log('🌱 Seeding initial bookings & inspection checklists...');

    const ananya = await prisma.customer.findFirst({ where: { phone: '+91 98450 11223' } });
    const karthik = await prisma.customer.findFirst({ where: { phone: '+91 98860 22334' } });
    const divya = await prisma.customer.findFirst({ where: { phone: '+91 98800 66778' } });
    const arjun = await prisma.customer.findFirst({ where: { phone: '+91 94480 77889' } });
    const meera = await prisma.customer.findFirst({ where: { phone: '+91 98440 33445' } });

    const creta = await prisma.vehicle.findUnique({ where: { registrationNumber: 'KA01MF2024' } });
    const seltos = await prisma.vehicle.findUnique({ where: { registrationNumber: 'KA02KL5678' } });
    const swift = await prisma.vehicle.findUnique({ where: { registrationNumber: 'KA05MN1234' } });
    const thar = await prisma.vehicle.findUnique({ where: { registrationNumber: 'KA03NH7788' } });
    const innova = await prisma.vehicle.findUnique({ where: { registrationNumber: 'KA51AB9999' } });

    if (ananya && creta) {
      const now = new Date();
      const pickupDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const returnDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const rentalDays = 4;
      const baseRental = rentalDays * creta.dailyRate;
      const subtotal = baseRental;
      const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      const bk1 = await prisma.booking.upsert({
        where: { bookingNumber: 'BK-2026-0001' },
        update: {},
        create: {
          bookingNumber: 'BK-2026-0001',
          customerId: ananya.id,
          vehicleId: creta.id,
          createdByUserId: staff.id,
          pickupDateTime: pickupDate,
          returnDateTime: returnDate,
          pickupLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          returnLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          rateType: 'DAILY',
          baseRate: creta.dailyRate,
          rentalDays,
          withDriver: false,
          taxPercentage: 18,
          taxAmount,
          totalAmount,
          securityDeposit: creta.securityDeposit,
          advancePaid: totalAmount,
          balanceDue: 0,
          status: 'PICKED_UP',
        },
      });

      // Update Creta vehicle status to RENTED
      await prisma.vehicle.update({
        where: { id: creta.id },
        data: { status: 'RENTED' },
      });

      // Add pickup inspection checklist
      const existingChecklist = await prisma.inspectionChecklist.findFirst({
        where: { bookingId: bk1.id, type: 'PICKUP' },
      });

      if (!existingChecklist) {
        await prisma.inspectionChecklist.create({
          data: {
            bookingId: bk1.id,
            type: 'PICKUP',
            odometer: creta.odometer,
            fuelLevel: '4/4',
            damageNotes: 'Minor hairline scratch on left rear bumper recorded and acknowledged.',
            photos: JSON.stringify(['/uploads/inspections/creta_front.jpg', '/uploads/inspections/creta_scratch.jpg']),
            accessoriesHandedOver: JSON.stringify(['Spare Wheel', 'Jack & Toolkit', 'RC Smartcard Copy', 'Fastag', 'First Aid Kit']),
            customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            inspectedByUserId: staff.id,
            inspectedAt: pickupDate,
          },
        });
      }
    }

    if (karthik && seltos) {
      const now = new Date();
      const pickupDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const returnDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
      const rentalDays = 5;
      const baseRental = rentalDays * seltos.dailyRate;
      const driverAllowance = rentalDays * 500;
      const subtotal = baseRental + driverAllowance;
      const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const totalAmount = subtotal + taxAmount;
      const advancePaid = 5000;

      const bk2 = await prisma.booking.upsert({
        where: { bookingNumber: 'BK-2026-0002' },
        update: {},
        create: {
          bookingNumber: 'BK-2026-0002',
          customerId: karthik.id,
          vehicleId: seltos.id,
          createdByUserId: manager.id,
          pickupDateTime: pickupDate,
          returnDateTime: returnDate,
          pickupLocation: 'Kempegowda International Airport (BLR), Terminal 2',
          returnLocation: 'DrivePulse Koramangala Hub, Bengaluru',
          rateType: 'DAILY',
          baseRate: seltos.dailyRate,
          rentalDays,
          withDriver: true,
          driverAllowancePerDay: 500,
          taxPercentage: 18,
          taxAmount,
          totalAmount,
          securityDeposit: seltos.securityDeposit,
          advancePaid,
          balanceDue: totalAmount - advancePaid,
          status: 'CONFIRMED',
          extras: {
            create: [
              { name: 'Baby Safety Child Seat', dailyPrice: 250, quantity: 1, totalAmount: 1250 },
            ],
          },
        },
      });

      // Record Advance Payment
      const existingPay = await prisma.payment.findFirst({ where: { bookingId: bk2.id } });
      if (!existingPay) {
        await prisma.payment.create({
          data: {
            receiptNumber: 'REC-2026-0001',
            bookingId: bk2.id,
            amount: advancePaid,
            mode: 'UPI',
            type: 'ADVANCE',
            transactionReference: 'UPI/428901239841/HDFC',
            receivedByUserId: manager.id,
            notes: 'Advance booking confirmation deposit',
          },
        });
      }
    }

    if (divya && swift) {
      const now = new Date();
      const pickupDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const returnDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const rentalDays = 3;
      const baseRental = rentalDays * swift.dailyRate;
      const subtotal = baseRental;
      const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      const bk3 = await prisma.booking.upsert({
        where: { bookingNumber: 'BK-2026-0003' },
        update: {},
        create: {
          bookingNumber: 'BK-2026-0003',
          customerId: divya.id,
          vehicleId: swift.id,
          createdByUserId: staff.id,
          pickupDateTime: pickupDate,
          returnDateTime: returnDate,
          actualReturnDateTime: returnDate,
          pickupLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          returnLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          rateType: 'DAILY',
          baseRate: swift.dailyRate,
          rentalDays,
          withDriver: false,
          taxPercentage: 18,
          taxAmount,
          totalAmount: totalAmount + 1200, // Extra KM & fuel penalty included in final
          securityDeposit: swift.securityDeposit,
          advancePaid: totalAmount,
          balanceDue: 0,
          status: 'RETURNED',
        },
      });

      const existingChecklists = await prisma.inspectionChecklist.findMany({ where: { bookingId: bk3.id } });
      if (existingChecklists.length === 0) {
        // Pickup checklist
        await prisma.inspectionChecklist.create({
          data: {
            bookingId: bk3.id,
            type: 'PICKUP',
            odometer: 14000,
            fuelLevel: '4/4',
            damageNotes: 'Vehicle handed over in clean condition.',
            accessoriesHandedOver: JSON.stringify(['Spare Wheel', 'Jack & Toolkit', 'Fastag']),
            customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            inspectedByUserId: staff.id,
            inspectedAt: pickupDate,
          },
        });

        // Return checklist with settlement
        await prisma.inspectionChecklist.create({
          data: {
            bookingId: bk3.id,
            type: 'RETURN',
            odometer: 14800,
            fuelLevel: '3/4',
            damageNotes: 'Returned on time. Fuel shortfall of 1/4 tank deducted from security deposit.',
            extraKm: 50,
            extraKmCharge: 600,
            fuelCharge: 600,
            depositAdjustment: 1200,
            customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            inspectedByUserId: staff.id,
            inspectedAt: returnDate,
          },
        });
      }
    }

    if (arjun && thar) {
      const now = new Date();
      const pickupDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
      const returnDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const rentalDays = 3;
      const baseRental = rentalDays * thar.dailyRate;
      const subtotal = baseRental;
      const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      await prisma.booking.upsert({
        where: { bookingNumber: 'BK-2026-0004' },
        update: {},
        create: {
          bookingNumber: 'BK-2026-0004',
          customerId: arjun.id,
          vehicleId: thar.id,
          createdByUserId: staff.id,
          pickupDateTime: pickupDate,
          returnDateTime: returnDate,
          pickupLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          returnLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          rateType: 'DAILY',
          baseRate: thar.dailyRate,
          rentalDays,
          withDriver: false,
          taxPercentage: 18,
          taxAmount,
          totalAmount,
          securityDeposit: thar.securityDeposit,
          advancePaid: 0,
          balanceDue: totalAmount,
          status: 'QUOTE',
        },
      });
    }

    if (meera && innova) {
      const now = new Date();
      const pickupDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const returnDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      await prisma.booking.upsert({
        where: { bookingNumber: 'BK-2026-0005' },
        update: {},
        create: {
          bookingNumber: 'BK-2026-0005',
          customerId: meera.id,
          vehicleId: innova.id,
          createdByUserId: manager.id,
          pickupDateTime: pickupDate,
          returnDateTime: returnDate,
          pickupLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          returnLocation: 'DrivePulse Indiranagar Hub, Bengaluru',
          rateType: 'DAILY',
          baseRate: innova.dailyRate,
          rentalDays: 3,
          withDriver: false,
          taxPercentage: 18,
          taxAmount: Math.round(3 * innova.dailyRate * 0.18 * 100) / 100,
          totalAmount: Math.round(3 * innova.dailyRate * 1.18 * 100) / 100,
          securityDeposit: innova.securityDeposit,
          advancePaid: 0,
          balanceDue: 0,
          status: 'CANCELLED',
          cancellationReason: 'Customer travel cancelled due to medical emergency.',
          cancellationFee: 500,
        },
      });
    }

    console.log('✅ Sample Bookings, Checklists and Payments seeded successfully!');
    console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
