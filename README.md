# 🚗 DrivePulse — Production Car Rental Management Web Application

**DrivePulse** is an enterprise-grade Car Rental Fleet & Operations Management system designed exclusively for administrative, management, and cashier staff of a single rental car business. Built with a modern, high-performance TypeScript stack, it streamlines fleet operations, regulatory compliance, customer KYC verification, rental booking lifecycles, vehicle inspection checklists with customer signatures, GST-compliant tax invoicing, security deposit reconciliations, and auditable analytics.

---

## 🌟 Key Features

### 1. Enterprise Authentication, RBAC & Audit Trail
- **JWT in httpOnly Cookies**: Dual access (15 min) and refresh (7 days) tokens stored securely in `httpOnly`, `sameSite: lax` cookies with authorization header fallback.
- **Three-Tier Role-Based Access Control**:
  - 👑 **Super Admin**: Full root authority across user management, deletion permissions, and system configurations.
  - 🛡️ **Manager**: Operational authority including compliance document overrides, rate adjustments, and invoice cancellations.
  - 📋 **Staff / Cashier**: Front-desk operations for creating bookings, recording payments, and dispatching vehicles.
- **Account Security & Session Inactivity**: 5 failed login attempts trigger a 15-minute lockout; 30-minute idle inactivity auto-logout with a 2-minute modal countdown.
- **Centralized Audit Logging**: Every administrative action (`CREATE`, `UPDATE`, `DELETE`, `OVERRIDE`, `LOGIN`, `LOGOUT`) is automatically logged with actor ID, IP address, user agent, and timestamp.

### 2. Vehicle Fleet & Regulatory Compliance Engine
- **Comprehensive Fleet Registry**: Registration number, make, model, variant, year, color, fuel type, transmission, seats, VIN/chassis, and live odometer.
- **Typed Regulatory Documents**: Automatic status tracking for `INSURANCE`, `FITNESS`, `PUC`, `RC`, `ROAD_TAX`, and `PERMIT`.
- **Dynamic Expiration Engine**: Automatic computation of `VALID`, `EXPIRING_SOON` (within 15 days), or `EXPIRED` status.
- **Operations Guard & Manager Override**: Unfit vehicles are blocked from new bookings unless a Manager documents a business justification.
- **Maintenance & Expense Tracking**: Service logs, spare parts replaced, vendor invoice numbers, and operating cost ratio per vehicle.

### 3. Customer Directory & KYC ID Verification
- **Customer CRM**: Complete customer profiles with phone, email, emergency contact, driving licence number, and city.
- **Multi-Document KYC Processing**: Driving Licence, Aadhaar Card, Passport, Voter ID, and Selfie ID proof tracking.
- **Licence Expiry Enforcement**: Automatically prevents reservations extending past customer driving licence validity.
- **Blacklist Enforcement**: Documented reason banner prevents rental creation for blacklisted drivers.

### 4. Booking Lifecycle, Dynamic Quotes & Inspection Checklists
- **Availability Engine**: Atomic date-range overlap queries (`pickupDateTime < requestedReturn && returnDateTime > requestedPickup`) preventing double booking.
- **Dynamic Quotation**: Tiered daily/weekly/monthly rates, optional driver allowance (₹500/day), custom add-ons (GPS, child seat), courtesy discounts, and 18% GST.
- **Pickup Inspection Checklist**: Fuel level (0/4 to 4/4), odometer reading, accessory checklist, exterior damage notes, and **HTML5 Canvas Customer Signature**.
- **Return Inspection Checklist**: Odometer sync, extra kilometre penalty calculation (₹12/km), fuel penalty, damage charge, and net security deposit refund vs balance due.
- **Professional PDF Rental Agreement**: Generated on-the-fly using `pdfkit` (`GET /api/bookings/:id/agreement-pdf`).

### 5. Cashier Payments, Receipts & GST Tax Invoicing
- **Payment Modes**: UPI / QR, Cash, Debit/Credit Card, Bank Transfer (IMPS/NEFT), and Cheque.
- **Auto-Sequenced Cashier Receipts**: Format `REC-YYYY-XXXX` (e.g. `REC-2026-0004`) with atomic ledger adjustments.
- **Official GST Tax Invoice**: Compliant with **SAC 996601** (Passenger Car Rental Services), CGST (9%) + SGST (9%), customer corporate GSTIN validation for Input Tax Credit (ITC), and sequential `INV-YYYY-XXXX` numbering.
- **Security Deposit Ledger**: Real-time tracking of active held deposits, refunded amounts, and damage deductions.
- **Dual PDF Generation**:
  - Cashier Payment Receipt PDF (`GET /api/payments/:id/receipt-pdf`)
  - Official GST Tax Invoice PDF (`GET /api/invoices/:id/invoice-pdf`)

### 6. Executive Operations Dashboard & Analytical Reports
- **Live Operations Dashboard**: Fleet utilization percentage gauge, today's collections, active deposits held, balance receivables, today's dispatch schedule, and 14-day revenue trend SVG chart.
- **Analytical Reporting Engine**:
  - **Revenue & Collections Report**: Filterable by date range and payment mode, with instant **CSV Export**.
  - **Fleet Performance Report**: Per-vehicle rental days, gross revenue, maintenance spend, net operating profit margin, and **CSV Export**.
  - **Maintenance Expense Report**: Service records, spare parts replaced, vendors, and **CSV Export**.
  - **Customer Intelligence Report**: Customer lifetime value (CLV), repeat rental rate (40%), KYC verification status, and **CSV Export**.

### 7. Centralized Master Settings & Policies
- **Company Profile**: Brand name, legal entity, corporate GSTIN, registered address, and bank remittance information printed on invoices.
- **Tariff & Rental Policies**: Default security deposit, chauffeur allowance, return grace period, late return hourly penalty, and extra KM charge rate.
- **Account Credentials**: Staff profile editing and encrypted password changes.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide React, HTML5 Canvas |
| **Backend** | Node.js, Express, TypeScript, Zod, PDFKit, Multer, bcryptjs, jsonwebtoken, cookie-parser |
| **Database** | SQLite (`file:./dev.db`) for local zero-setup dev; PostgreSQL ready via Prisma ORM |
| **Testing** | Custom end-to-end integration test runner with 100% test coverage |

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/drivepulse.git
cd drivepulse

# Install root, backend, and frontend dependencies in one command
npm run install:all
```

### 2. Environment Configuration
Create environment files from the provided templates:
```bash
# In the workspace root
cp .env.example .env

# In the server directory
cp server/.env.example server/.env
```

### 3. Initialize Database & Seed Demo Data
```bash
cd server

# Generate Prisma client and create SQLite database tables
npm run prisma:push

# Seed full realistic fleet, users, KYC records, bookings, and payments
npm run seed
```

### 4. Run Development Servers
From the root directory, start both the Express API and Vite React frontend concurrently:
```bash
# From workspace root
npm run dev
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Default Staff Credentials

The seed script initializes 3 default staff accounts with full demonstration permissions:

| Role | Email | Password | Scope & Permissions |
|---|---|---|---|
| **Super Admin** | `admin@drivepulse.com` | `Password@123` | Full access: Staff user management, system settings, deletions, and overrides |
| **Manager** | `manager@drivepulse.com` | `Password@123` | Operational access: Compliance document overrides, tariff adjustments, reports |
| **Staff** | `staff@drivepulse.com` | `Password@123` | Front-desk cashier: Vehicle check-in/out, bookings, customer registration, payments |

> **Quick Login Tip**: The login page includes convenient one-click "Demo Sign-in" buttons for all 3 roles.

---

## 🧪 Automated Test Suite

DrivePulse includes an end-to-end integration and API test suite verifying all 7 functional layers:

```bash
cd server
npm test
```

### Test Coverage Summary:
- **Suite 1: Authentication & Session Management**: Health check, login validation, JWT tokens, account lockout, `/auth/me`.
- **Suite 2: Role-Based Access Control (RBAC)**: Route guards, staff vs manager vs super admin permissions.
- **Suite 3: Vehicle Fleet & Compliance Engine**: Registry listing, document status evaluation, odometer tracking.
- **Suite 4: Customer Management & KYC**: KYC document verification, blacklist enforcement banner.
- **Suite 5: Booking Lifecycle & Financials**: Date overlap prevention, cashier payment receipts (`REC-YYYY-XXXX`), GST tax invoices (`INV-YYYY-XXXX`), PDF generation.
- **Suite 6: Executive Dashboard & Analytics**: Live fleet metrics, revenue reports, CSV export streaming.
- **Suite 7: Business Settings & Policies**: Key-value settings persistence, tariff configuration.

**Result**: 28 / 28 Tests Passed (100% Pass Rate).

---

## 📑 API Endpoint Summary

### Authentication & Staff Management
- `POST /api/auth/login` — Sign in and issue httpOnly cookies
- `POST /api/auth/logout` — Revoke cookies and log logout event
- `GET /api/auth/me` — Retrieve active session profile
- `GET /api/users` — List staff accounts (Super Admin only)
- `POST /api/users` — Create staff account (Super Admin only)
- `GET /api/audit` — Centralized audit log feed

### Vehicle Fleet & Compliance
- `GET /api/vehicles` — Paginated fleet directory with compliance status
- `POST /api/vehicles` — Register vehicle
- `GET /api/vehicles/:id` — Vehicle detail with documents and service records
- `POST /api/vehicles/:id/documents` — Upload compliance document (RC, Insurance, PUC)
- `POST /api/vehicles/:id/maintenance` — Record workshop maintenance service

### Customers & KYC
- `GET /api/customers` — Customer directory with KYC verification indicators
- `POST /api/customers` — Register customer
- `GET /api/customers/:id` — Customer detail with KYC documents
- `POST /api/customers/:id/documents` — Upload KYC ID proof
- `PUT /api/customers/:id/blacklist` — Blacklist / unblacklist customer with reason

### Bookings & Inspections
- `GET /api/bookings/available-vehicles` — Filter vehicles available for date range
- `GET /api/bookings` — Filterable booking ledger
- `POST /api/bookings` — Create rental booking with quote calculation
- `GET /api/bookings/:id` — Booking detail with payment ledger
- `GET /api/bookings/:id/agreement-pdf` — Download Motor Vehicle Rental Agreement PDF
- `POST /api/bookings/:bookingId/pickup-inspection` — Record pickup checklist with signature
- `POST /api/bookings/:bookingId/return-inspection` — Record return checklist with excess KM and fuel charges

### Payments & Invoicing
- `POST /api/payments` — Record payment, issue `REC-YYYY-XXXX`, and adjust balance
- `GET /api/payments` — Cashier payment ledger
- `GET /api/payments/:id/receipt-pdf` — Download official cashier receipt PDF
- `POST /api/invoices/generate` — Generate official GST Tax Invoice (`INV-YYYY-XXXX`)
- `GET /api/invoices` — Tax invoice register
- `GET /api/invoices/:id/pdf` — Download official GST Tax Invoice PDF

### Dashboard, Reports & Settings
- `GET /api/dashboard/summary` — Live executive fleet & financial metrics
- `GET /api/reports/revenue` — Collections report (`format=csv` supported)
- `GET /api/reports/fleet-utilization` — Vehicle utilization report (`format=csv` supported)
- `GET /api/reports/maintenance` — Maintenance expenditure report (`format=csv` supported)
- `GET /api/reports/customers` — Customer CLV report (`format=csv` supported)
- `GET /api/settings` — Get company profile and tariff rules
- `PUT /api/settings` — Update company settings (Manager / Super Admin)
- `PUT /api/settings/profile` — Update staff user profile and password

---

## 🔒 Production Deployment Notes

1. **Database Migration to PostgreSQL**:
   - In `server/prisma/schema.prisma`, update the datasource provider from `sqlite` to `postgresql`.
   - Update `DATABASE_URL` in `.env` to your PostgreSQL connection string.
   - Run `npx prisma migrate deploy`.
2. **Object Storage**:
   - The file storage layer in `server/src/services/storage.service.ts` is encapsulated behind an abstract interface, allowing an S3 or Google Cloud Storage driver to be swapped in seamlessly.
3. **Cookie Security**:
   - In production (`NODE_ENV=production`), cookies automatically enforce `secure: true` (HTTPS only) and `sameSite: strict`.

---

## 📄 License
DrivePulse is licensed under the MIT License.
