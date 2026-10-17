# 🚗 DrivePulse — AI-Powered Vehicle Rental Management System

**DrivePulse** is an enterprise-grade Vehicle Rental Fleet & Operations Management system engineered for rental businesses managing **Cars, Bikes, and Scooters**. Built with a modern, high-performance TypeScript stack, it features an **AI-Powered Fleet Copilot**, real-time operations dashboards, customer KYC management, digital inspection checklists with touch customer signatures, dynamic people-based custom tariffs, GST-compliant tax invoicing, security deposit reconciliations, and auditable analytics.

---

## 🌟 Key Features

### 1. 🤖 AI-Powered Operations Copilot & Daily Executive Briefing
- **Natural Language Fleet Copilot**:
  - Ask live operational questions via the floating AI assistant:
    - *"Which vehicles are available right now?"*
    - *"Is Creta available? How many days remaining on its rental?"*
    - *"Are any vehicle insurance or fitness documents expiring soon?"*
    - *"How much money did we collect today?"*
    - *"Who owes us money and what are the pending balances?"*
  - Provides rich markdown answers with direct 1-click **Quick Action** buttons (`[Dispatch Booking]`, `[View Vehicle]`, `[Collect Payment]`).
- **✨ Feature D: Daily Executive Morning Briefing**:
  - Top-of-dashboard intelligence card summarizing live fleet status, scheduled returns today, pending cashier receivables, and urgent compliance renewals.
- **Dual-Engine Architecture (100% Free with Zero Downtime)**:
  - Powered by **Google Gemini 1.5 Flash** (Free Tier via Google AI Studio).
  - Includes a built-in **Smart Local Operations NLP Engine** that operates 100% offline with zero external dependencies if no API key is set.

### 2. 🚗 🏍️ 🛵 Multi-Category Fleet (Cars, Bikes, Scooters)
- **Categorized Fleet Registry**: Register and manage Cars, Motorcycles, and Scooters with custom seating capacities (2-seater bikes, 5-seater sedans, 7-seater SUVs).
- **Manual Vehicle Entry**: Clean, pristine start with zero dummy vehicles; register your actual fleet manually with custom specs and compliance documents.
- **Regulatory Compliance Engine**: Automated status computation for `INSURANCE`, `FITNESS`, `PUC`, and `RC` certificates (`VALID`, `EXPIRING_SOON` within 15 days, or `EXPIRED`).
- **Maintenance & Expense Logs**: Service history, parts replaced, vendor bills, and per-vehicle operating cost tracking.

### 3. 👥 Walk-In Customers & Dynamic People-Based Pricing
- **Manual Customer Entry**: Walk-in hirers can be entered manually during booking without mandatory prior CRM registration.
- **Custom Negotiated Tariffs**: Dynamic pricing based on passenger count and customer negotiation rather than rigid catalog rates.
- **Customer CRM & KYC**: Complete customer directory with Driving Licence, Aadhaar, phone, and emergency contacts.
- **Blacklist Enforcement**: Instant blocking banners preventing rental creation for blacklisted drivers.

### 4. 📝 Booking Lifecycle, Digital Inspections & Agreements
- **Availability Engine**: Atomic date-range overlap queries (`pickupDateTime < requestedReturn && returnDateTime > requestedPickup`) preventing double booking.
- **Pickup Inspection Checklist**: Fuel level, odometer sync, damage notes, and **HTML5 Touch Canvas Customer Signature**.
- **Return Inspection Checklist**: Odometer sync, extra KM penalty calculation (₹12/km), damage deductions, and net security deposit refund.
- **Automated Agreement PDF**: Official rental contracts generated on-the-fly (`GET /api/bookings/:id/agreement-pdf`).

### 5. 💳 Cashier Payments, Receipts & GST Tax Invoicing
- **Multi-Mode Collections**: UPI / QR, Cash, Debit/Credit Card, Bank Transfer (IMPS/NEFT), and Cheque.
- **Sequential Cashier Receipts**: Format `REC-YYYY-XXXX` with atomic ledger adjustments.
- **Official GST Tax Invoice**: Compliant with **SAC 996601** (Passenger Car Rental Services), CGST (9%) + SGST (9%), customer corporate GSTIN validation, and sequential `INV-YYYY-XXXX` numbering.
- **Security Deposit Ledger**: Active tracking of held deposits, refunded amounts, and damage deductions.

### 6. 📱 Mobile First & Touch-Optimized UI
- Responsive design tailored for iOS Safari, Android Chrome, and desktop screens.
- Mobile bottom touch navigation bar, off-canvas sliding drawer, and touch signature canvas.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide React, HTML5 Canvas |
| **Backend** | Node.js, Express, TypeScript, Zod, PDFKit, Multer, bcryptjs, jsonwebtoken, cookie-parser |
| **AI Engine** | Google Gemini 1.5 Flash REST API + Built-in Local Smart Operations NLP Engine |
| **Database** | SQLite (`file:./dev.db`) for zero-setup local dev; PostgreSQL ready via Prisma ORM |
| **Testing** | Custom end-to-end integration test runner with 100% test coverage (31/31 tests passing) |

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/drivepulse-rentals.git
cd drivepulse-rentals

# Install root dependencies
npm install

# Install server and client dependencies
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Environment Configuration
Create environment files from the provided templates:
```bash
# Server configuration
cp server/.env.example server/.env
```

### 3. Initialize Database & Seed Clean State
```bash
cd server
npm run prisma:push
npm run seed
cd ..
```
*The seed script initializes the exclusive **Admin** account and leaves the fleet, customer, and booking tables 100% clean and ready for live production entry.*

### 4. Run Development Servers
From the workspace root, run both backend API and frontend concurrently:
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Administrator Credentials

| Role | Email | Password | Scope & Permissions |
|---|---|---|---|
| **Admin** | `admin@drivepulse.com` | `Password@123` | Exclusive root administrator with full access to fleet, bookings, finances, and AI |

---

## 🧪 Automated Test Suite

DrivePulse includes a comprehensive end-to-end integration test suite verifying all 8 functional layers:

```bash
cd server
npm test
```

### Test Coverage Summary:
- **Suite 1: Authentication & Session Management**: Health check, login validation, JWT tokens, account lockout, `/auth/me` (5 tests).
- **Suite 2: Role-Based Access Control (RBAC)**: Route guards, admin permissions (4 tests).
- **Suite 3: Vehicle Fleet & Compliance Engine**: Registry listing, manual vehicle registration, detail retrieval (2 tests).
- **Suite 4: Customer Management & KYC**: KYC document verification, customer creation (2 tests).
- **Suite 5: Booking Lifecycle & Financials**: Date overlap prevention, walk-in customer booking, cashier receipts (`REC-YYYY-XXXX`), GST tax invoices (`INV-YYYY-XXXX`), PDF generation (7 tests).
- **Suite 6: Executive Dashboard & Analytics**: Live fleet metrics, revenue reports, CSV export streaming (5 tests).
- **Suite 7: Business Settings & Policies**: Key-value settings persistence, tariff configuration (2 tests).
- **Suite 8: AI Fleet Copilot & Intelligence**: Live daily briefing, natural language availability query, vehicle status & remaining days, collections summary (4 tests).

**Result**: **31 / 31 Tests Passed (100% Pass Rate)**.

---

## 🌐 $0 Free-Tier Production Deployment Guide

Deploy this system online for client demonstrations with zero monthly costs:

```
┌────────────────────────────────────────────────────────────────────────┐
│               $0 LIVE PRODUCTION DEMO ARCHITECTURE                     │
├──────────────────────────────────────┬─────────────────────────────────┤
│ Frontend (React + Vite + Tailwind)   │ Vercel (Global Edge CDN, HTTPS) │
│ Backend REST API (Node + Express)    │ Render Web Service (Free Tier)  │
│ Database (PostgreSQL / SQLite)       │ Neon.tech (Serverless Postgres) │
│ Invoicing & PDF Receipts             │ In-Memory Built-in PDFKit ($0)  │
│ SSL / Custom Domain                  │ Free Automatic Let's Encrypt    │
└──────────────────────────────────────┴─────────────────────────────────┘
```

1. **Database**: Create a free project at [Neon.tech](https://neon.tech) and copy the PostgreSQL connection string.
2. **Backend**: Deploy `/server` to [Render.com](https://render.com) as a Free Web Service with `npm install && npm run build && npx prisma db push && npm run seed`.
3. **Frontend**: Deploy `/client` to [Vercel.com](https://vercel.com) with framework preset `Vite` and `VITE_API_BASE_URL` pointing to your Render URL.
4. **Single-Service Monolith Option**: Deploy repository root directly on Render with `npm run build && npm start`. Express will serve both the React web app and REST API on a single URL (`https://drivepulse.onrender.com`), eliminating CORS and cross-domain cookies!

---

*DrivePulse — Engineered for reliability, compliance, mobile excellence, and effortless client demonstrations.*
