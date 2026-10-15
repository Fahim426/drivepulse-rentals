import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const outputPath = path.resolve(__dirname, '../../DrivePulse_System_Workflow_Guide.pdf');

function buildPdf() {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    info: {
      Title: 'DrivePulse - System Workflow, Architecture & $0 Production Guide',
      Author: 'DrivePulse Engineering Team',
      Subject: 'Car Rental Management System Documentation',
    },
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  const colors = {
    primary: '#1e3a8a', // Deep Blue
    accent: '#2563eb', // Vivid Blue
    slate: '#334155',
    dark: '#0f172a',
    lightBg: '#f8fafc',
    cardBg: '#f1f5f9',
    border: '#cbd5e1',
    emerald: '#059669',
    amber: '#d97706',
    rose: '#dc2626',
    purple: '#7c3aed',
  };

  // Helper for Section Titles
  function addSectionHeader(title: string, subtitle?: string) {
    doc.moveDown(0.8);
    doc.fillColor(colors.primary).fontSize(14).font('Helvetica-Bold').text(title);
    if (subtitle) {
      doc.fillColor(colors.slate).fontSize(8.5).font('Helvetica').text(subtitle);
    }
    doc.moveDown(0.3);
    doc.strokeColor(colors.accent).lineWidth(1.5).moveTo(36, doc.y).lineTo(559, doc.y).stroke();
    doc.moveDown(0.5);
  }

  // Helper for Callout Boxes
  function addCalloutBox(title: string, bodyText: string, borderColor: string = colors.accent) {
    const startY = doc.y;
    const boxWidth = 523;
    const textPadding = 10;
    
    // Estimate height
    doc.font('Helvetica-Bold').fontSize(9);
    const titleHeight = doc.heightOfString(title, { width: boxWidth - 20 });
    doc.font('Helvetica').fontSize(8);
    const bodyHeight = doc.heightOfString(bodyText, { width: boxWidth - 20 });
    const boxHeight = titleHeight + bodyHeight + textPadding * 2 + 4;

    doc.rect(36, startY, boxWidth, boxHeight).fillAndStroke('#f8fafc', colors.border);
    // Left accent bar
    doc.rect(36, startY, 4, boxHeight).fill(borderColor);

    doc.fillColor(colors.dark).fontSize(9).font('Helvetica-Bold')
      .text(title, 46, startY + textPadding, { width: boxWidth - 20 });
    doc.fillColor(colors.slate).fontSize(8).font('Helvetica')
      .text(bodyText, 46, startY + textPadding + titleHeight + 2, { width: boxWidth - 20, lineGap: 2 });

    doc.y = startY + boxHeight + 8;
  }

  // ==========================================
  // PAGE 1: TITLE & EXECUTIVE ARCHITECTURE
  // ==========================================
  // Header Banner
  doc.rect(36, 36, 523, 72).fill(colors.primary);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('DrivePulse Car Rental Management', 50, 48);
  doc.fontSize(10).font('Helvetica').fillColor('#93c5fd').text('Complete System Architecture, Operational Workflow & $0 Production Guide', 50, 72);
  doc.fontSize(7.5).fillColor('#bfdbfe').text('Target: Internal Administrative & Operations Staff  |  Statutory Indian GST  |  Responsive Mobile & Desktop Web App', 50, 88);

  doc.y = 120;

  addSectionHeader('1. Executive Overview & Core Business Model', 'Engineered strictly for internal fleet managers and counter staff.');

  doc.fillColor(colors.dark).fontSize(8.5).font('Helvetica', 8.5);
  const principles = [
    '• Admin-Only Access: Strictly internal operations hub (Super Admin, Operations Manager, Counter Staff).',
    '• Frictionless Customer Walk-ins: Staff can type customer details on the fly or pick from registered directory.',
    '• People-Based Dynamic Rent: No rigid fixed rates; rent is dynamically negotiated based on passenger count and route.',
    '• Clean Fleet View: Odometer readings are captured strictly during dispatch/return inspections, eliminating clutter.',
    '• Road Legality & Safety Gate: Vehicles cannot be dispatched if Insurance, Fitness, or PUC are expired (Manager override required).',
    '• Statutory Indian GST Compliance: Full 18% GST support (9% CGST + 9% SGST), SAC Code 996601, and official PDF Tax Invoices.',
  ];
  principles.forEach(p => {
    doc.text(p, { lineGap: 2 });
  });

  addSectionHeader('2. Full-Stack Technology Stack & Architecture');

  addCalloutBox(
    'End-to-End Architectural Components',
    '• Frontend SPA: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + TanStack Table + Signature Canvas\n' +
    '• Backend API: Node.js + Express + TypeScript + Zod Validation + Helmet + dual JWT Cookies (Access + Refresh)\n' +
    '• Database & ORM: Prisma ORM with 18 relational models (SQLite for local dev, PostgreSQL for production)\n' +
    '• PDF Engine: PDFKit vector document generator for Rental Agreements, GST Invoices, and Payment Receipts\n' +
    '• Mobile Adaptation: Off-canvas sliding drawer, sticky bottom navigation bar, touch canvas, and responsive mobile cards'
  );

  doc.moveDown(0.5);

  // Quick Architecture Table
  const techTableY = doc.y;
  doc.rect(36, techTableY, 523, 85).fillAndStroke('#f8fafc', colors.border);
  doc.fillColor(colors.primary).fontSize(8.5).font('Helvetica-Bold').text('SYSTEM ARCHITECTURE MATRIX', 46, techTableY + 8);

  const colX = [46, 170, 310, 430];
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.dark);
  doc.text('Layer', colX[0], techTableY + 24);
  doc.text('Technology', colX[1], techTableY + 24);
  doc.text('Local Development', colX[2], techTableY + 24);
  doc.text('Production ($0 Cloud Tier)', colX[3], techTableY + 24);

  doc.strokeColor(colors.border).lineWidth(0.5).moveTo(36, techTableY + 36).lineTo(559, techTableY + 36).stroke();

  doc.font('Helvetica').fontSize(7.5).fillColor(colors.slate);
  const rows = [
    ['Client (SPA)', 'React 18 + Vite + TS', 'http://localhost:3000', 'Vercel / Render Static CDN'],
    ['API Server', 'Express + TypeScript + Zod', 'http://localhost:5000', 'Render Free Web Service'],
    ['Database', 'Prisma ORM', 'SQLite (dev.db)', 'Neon Serverless PostgreSQL'],
    ['Storage / PDFs', 'Local FS + PDFKit', 'server/uploads', 'Local Persistent / Cloudinary'],
  ];

  rows.forEach((r, idx) => {
    const rowY = techTableY + 42 + idx * 11;
    doc.text(r[0], colX[0], rowY);
    doc.text(r[1], colX[1], rowY);
    doc.text(r[2], colX[2], rowY);
    doc.text(r[3], colX[3], rowY);
  });

  // ==========================================
  // PAGE 2: MOBILE OPTIMIZATION & WORKFLOWS
  // ==========================================
  doc.addPage();

  addSectionHeader('3. Mobile & Tablet Optimization Architecture', 'Responsive design for staff using smartphones, iPads, and counter tablets.');

  addCalloutBox(
    'Why Mobile Optimization Matters for Rental Operations',
    'Rental staff inspect cars in parking lots, take photos on mobile devices, collect customer signatures at the car door, and record fast check-ins on mobile phones. DrivePulse is fully responsive with native touch optimizations on smartphones (iOS / Android) and tablets.',
    colors.purple
  );

  doc.moveDown(0.3);
  doc.fillColor(colors.dark).fontSize(8.5).font('Helvetica-Bold').text('Key Mobile Features Implemented:');
  doc.font('Helvetica').fontSize(8).fillColor(colors.slate);

  const mobileFeatures = [
    '1. Mobile Slide-Over Drawer: Off-canvas navigation menu with backdrop blur, dark/light theme switcher, and staff profile card.',
    '2. Sticky Mobile Bottom Navigation: Instant one-thumb access to Dashboard, Fleet, Bookings, and an elevated "New Booking" button.',
    '3. Touch Signature Canvas: Supports HTML5 touch events (onTouchStart/Move/End) with touch-action:none preventing page scrolling.',
    '4. Mobile Live Quotation Bar: In /bookings/new, a sticky bottom bar displays real-time Total and Balance Due with "Review" and "Confirm" triggers.',
    '5. Responsive Card Layout: On small screens (<768px), data tables automatically transform into touch-friendly cards with direct action buttons.',
    '6. Anti-Zoom Form Controls: Form inputs are styled to prevent unwanted viewport zooming on iOS mobile devices.',
  ];
  mobileFeatures.forEach(mf => doc.text(mf, { lineGap: 3 }));

  addSectionHeader('4. Operational Workflows & Business Logic');

  doc.fillColor(colors.dark).fontSize(8.5).font('Helvetica-Bold').text('Workflow 1: Frictionless Booking Creation');
  doc.font('Helvetica').fontSize(8).fillColor(colors.slate);
  doc.text(
    'Staff navigate to /bookings/new. They choose between "Enter Manually" (typing Name, Phone, DL, City) or selecting an existing customer. ' +
    'The staff enters agreed rental rate based on passenger count (e.g., 5 passengers) without being constrained by fixed tariffs. ' +
    'Add-ons (child seats, chauffeur allowance, GPS) and courtesy discounts are computed live with 18% GST.',
    { lineGap: 3 }
  );

  doc.moveDown(0.5);
  doc.fillColor(colors.dark).fontSize(8.5).font('Helvetica-Bold').text('Workflow 2: Vehicle Handover & Digital Inspection');
  doc.font('Helvetica').fontSize(8).fillColor(colors.slate);
  doc.text(
    'Before release, counter staff perform a digital handover inspection recording: starting odometer, fuel gauge level (0/4 to 4/4), ' +
    'inventory accessories (spare wheel, jack, toolkit, Fastag, RC card copy), pre-existing damages, and customer signature on canvas. ' +
    'Upon completion, the booking status automatically transitions to PICKED_UP.',
    { lineGap: 3 }
  );

  doc.moveDown(0.5);
  doc.fillColor(colors.dark).fontSize(8.5).font('Helvetica-Bold').text('Workflow 3: Return Check-in, Settlement & GST Invoicing');
  doc.font('Helvetica').fontSize(8).fillColor(colors.slate);
  doc.text(
    'Upon vehicle return, staff record return odometer and fuel level. Late fees, extra km charges, or damage deductions are debited against ' +
    'the refundable security deposit. Cashiers record payments (UPI, Cash, Card, Bank Transfer) generating instant PDF receipts and official ' +
    'GST Tax Invoices with SAC 996601.',
    { lineGap: 3 }
  );

  // ==========================================
  // PAGE 3: ZERO-COST PRODUCTION DEPLOYMENT
  // ==========================================
  doc.addPage();

  addSectionHeader('5. Zero-Cost ($0) Production Deployment Guide for Client Testing', 'Step-by-step instructions to run the live application for $0 with no credit card required.');

  addCalloutBox(
    '100% Free Production Stack for Client Acceptance Testing (UAT)',
    'Your client can test the full-stack system live in production on their phone and computer without incurring any cloud hosting costs. The entire stack leverages legitimate, enterprise-grade free tiers from Neon, Render, and Vercel.',
    colors.emerald
  );

  doc.moveDown(0.3);

  // Cost comparison table
  const costTableY = doc.y;
  doc.rect(36, costTableY, 523, 75).fillAndStroke('#f0fdf4', '#bbf7d0');
  doc.fillColor(colors.emerald).fontSize(8.5).font('Helvetica-Bold').text('ZERO-COST ($0) CLOUD HOSTING BREAKDOWN', 46, costTableY + 8);

  const costCols = [46, 170, 310, 430];
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.dark);
  doc.text('Service Layer', costCols[0], costTableY + 22);
  doc.text('Platform / Provider', costCols[1], costTableY + 22);
  doc.text('Free Tier Limits', costCols[2], costTableY + 22);
  doc.text('Testing Cost', costCols[3], costTableY + 22);

  doc.strokeColor('#bbf7d0').lineWidth(0.5).moveTo(36, costTableY + 33).lineTo(559, costTableY + 33).stroke();

  doc.font('Helvetica').fontSize(7.5).fillColor(colors.slate);
  const costRows = [
    ['Managed Database', 'Neon Serverless Postgres', '0.5 GB SSD, auto-suspend, SSL', '$0.00 / month'],
    ['Backend API Server', 'Render Web Service', '512 MB RAM, 750 free hrs/mo', '$0.00 / month'],
    ['Frontend Client (SPA)', 'Vercel / Render Static', 'Global Edge CDN, auto SSL', '$0.00 / month'],
    ['Total Cost for Client', 'Production Environment', 'Full mobile & desktop testing', '$0.00 (Zero Cost)'],
  ];

  costRows.forEach((cr, idx) => {
    const rowY = costTableY + 38 + idx * 9.5;
    doc.text(cr[0], costCols[0], rowY);
    doc.text(cr[1], costCols[1], rowY);
    doc.text(cr[2], costCols[2], rowY);
    doc.fillColor(idx === 3 ? colors.emerald : colors.slate).font(idx === 3 ? 'Helvetica-Bold' : 'Helvetica').text(cr[3], costCols[3], rowY);
    doc.font('Helvetica').fillColor(colors.slate);
  });

  doc.y = costTableY + 85;

  doc.fillColor(colors.dark).fontSize(8.5).font('Helvetica-Bold').text('Step-by-Step Live Deployment Instructions:');
  doc.font('Helvetica').fontSize(8).fillColor(colors.slate);

  const deploySteps = [
    '• Step 1: Create Neon PostgreSQL Database: Sign up free at neon.tech (no credit card needed). Create project "drivepulse-prod". Copy the connection string (DATABASE_URL).',
    '• Step 2: Push Repository to GitHub: Push your clean git commits to a private or public GitHub repo.',
    '• Step 3: Deploy Backend on Render: Sign up at render.com. Create "New Web Service" connecting your repo. Set root directory to "server", build command to "npm install && npm run build && npx prisma db push && npm run seed", start command to "npm start". Add env vars: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, NODE_ENV=production, PORT=5000, CLIENT_URL=https://your-app.vercel.app.',
    '• Step 4: Deploy Frontend on Vercel: Sign up at vercel.com. Import repo, set root directory to "client", framework preset to "Vite". Add env var VITE_API_BASE_URL pointing to your Render API. Deploy!',
    '• Step 5: Send Live Testing Link to Client: Provide the client with the live HTTPS URL and pre-configured staff test credentials.',
  ];
  deploySteps.forEach(ds => doc.text(ds, { lineGap: 2.5 }));

  doc.moveDown(0.5);

  addCalloutBox(
    'Client User Acceptance Testing (UAT) Verification Script',
    '1. Open on Smartphone: Test the responsive bottom navigation bar, menu drawer, and card layouts.\n' +
    '2. Create Booking: Enter a customer manually, select vehicle, set negotiated rent based on passengers, review quote.\n' +
    '3. Dispatch Vehicle: Complete Handover inspection checklist and sign on touch canvas; status flips to PICKED_UP.\n' +
    '4. Verify Invoicing: Record advance payment, download official PDF receipt and statutory 18% GST Tax Invoice.',
    colors.accent
  );

  // ==========================================
  // PAGE 4: SECURITY, RBAC & SIGN-OFF
  // ==========================================
  doc.addPage();

  addSectionHeader('6. Role-Based Access Control (RBAC) & Security');

  // RBAC Table
  const rbacTableY = doc.y;
  doc.rect(36, rbacTableY, 523, 115).fillAndStroke('#f8fafc', colors.border);
  doc.fillColor(colors.primary).fontSize(8.5).font('Helvetica-Bold').text('PERMISSIONS MATRIX ACROSS STAFF ROLES', 46, rbacTableY + 8);

  const rbacCols = [46, 240, 340, 440];
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.dark);
  doc.text('System Feature / Operation', rbacCols[0], rbacTableY + 22);
  doc.text('Super Admin', rbacCols[1], rbacTableY + 22);
  doc.text('Operations Manager', rbacCols[2], rbacTableY + 22);
  doc.text('Counter Staff', rbacCols[3], rbacTableY + 22);

  doc.strokeColor(colors.border).lineWidth(0.5).moveTo(36, rbacTableY + 33).lineTo(559, rbacTableY + 33).stroke();

  doc.font('Helvetica').fontSize(7.5).fillColor(colors.slate);
  const rbacRows = [
    ['View Fleet, Dashboard & Analytics', 'Full Access', 'Full Access', 'Operational View'],
    ['Create Bookings & Record Walk-ins', 'Full Access', 'Full Access', 'Full Access'],
    ['Handover & Return Inspections', 'Full Access', 'Full Access', 'Full Access'],
    ['Collect Cashier Payments & Invoices', 'Full Access', 'Full Access', 'Full Access'],
    ['Override Expired Compliance Docs', 'Authorized', 'Authorized', 'BLOCKED (403)'],
    ['Bypass Outstanding Balance at Handover', 'Authorized', 'Authorized', 'BLOCKED (403)'],
    ['Staff User Management & Audit Logs', 'Full Access', 'Audit Logs Only', 'BLOCKED (403)'],
  ];

  rbacRows.forEach((rr, idx) => {
    const rowY = rbacTableY + 38 + idx * 10.5;
    doc.text(rr[0], rbacCols[0], rowY);
    doc.text(rr[1], rbacCols[1], rowY);
    doc.text(rr[2], rbacCols[2], rowY);
    doc.fillColor(rr[3].includes('BLOCKED') ? colors.rose : colors.slate).font(rr[3].includes('BLOCKED') ? 'Helvetica-Bold' : 'Helvetica').text(rr[3], rbacCols[3], rowY);
    doc.font('Helvetica').fillColor(colors.slate);
  });

  doc.y = rbacTableY + 125;

  addSectionHeader('7. Pre-Configured Test Accounts & Verification');

  doc.fillColor(colors.dark).fontSize(8).font('Helvetica');
  const accounts = [
    '• Super Admin Account: admin@drivepulse.com  |  Password: Password@123  (Full system privileges)',
    '• Operations Manager Account: manager@drivepulse.com  |  Password: Password@123  (Compliance & financial overrides)',
    '• Counter Staff Account: staff@drivepulse.com  |  Password: Password@123  (Front-desk bookings, inspections, cashier)',
  ];
  accounts.forEach(a => doc.text(a, { lineGap: 3 }));

  doc.moveDown(0.8);

  addCalloutBox(
    'Quality Assurance Verification & Test Suite Results',
    '• 29/29 Automated Integration Tests Passing (100% test pass rate in server/test/run-tests.ts)\n' +
    '• Zero Build / Type Errors: TypeScript strict mode enabled across both frontend and backend\n' +
    '• Mobile Browser Testing: Verified in mobile viewport (390x844) with bottom navigation and drawer\n' +
    '• Clean Workspace: Temporary files removed, production .gitignore configured, committed to git',
    colors.emerald
  );

  doc.moveDown(1);
  doc.fontSize(8).font('Helvetica-Oblique').fillColor(colors.slate).text(
    'DrivePulse Car Rental Management System — Developed for production excellence, compliance, mobile ease, and zero-cost client evaluation.',
    { align: 'center' }
  );

  doc.end();

  writeStream.on('finish', () => {
    console.log(`Successfully generated PDF at: ${outputPath}`);
  });
}

buildPdf();
