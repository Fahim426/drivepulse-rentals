# DrivePulse Car Rental Management System
## Complete System Architecture, Operational Workflow & Technical Guide

---

## 1. Executive Summary & System Overview

**DrivePulse** is a production-grade, full-stack Vehicle Rental Management web application engineered specifically for the **business administrator** of a rental business. It manages the entire lifecycle of rental operations—from multi-category vehicle onboarding and compliance tracking to customer onboarding, negotiated booking dispatch, digital vehicle inspections, payments, GST invoicing, and executive analytics.

### Key Business Model & Operational Principles:
1. **Admin-Only Architecture**: Designed specifically for client operations with a unified **Administrator (`ADMIN`)** model. All modules, fleet controls, compliance overrides, and financial settings are fully managed by the Admin without multi-role friction.
2. **Dynamic / Negotiated Rental Pricing**: Vehicles do not enforce rigid, fixed daily tariffs. Instead, tariffs are negotiated manually with customers based on **passenger count**, route, and duration.
3. **Frictionless Customer Walk-ins**: Counter staff can book rentals immediately by manually typing customer details on the fly or selecting pre-registered customers from the directory.
4. **Zero Odometer Clutter**: Odometer readings are captured only during physical dispatch and return inspections, eliminating maintenance clutter from general fleet overview views.
5. **Strict Road Legality & Safety Compliance**: Vehicles cannot be assigned to bookings if mandatory compliance documents (**Insurance**, **Fitness**, or **PUC**) are expired, unless explicitly overridden with documented justification by an authorized Manager.
6. **Statutory Indian GST Compliance**: Native support for **18% GST** (split into 9% CGST and 9% SGST), HSN/SAC code **996601** (Rental services of passenger vehicles), and official downloadable PDF tax invoices and receipts.

---

## 2. Technology Stack & System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT (SPA)                           │
│  React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + TanStack  │
│                   Port: http://localhost:3000                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON API (JWT via httpOnly)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API SERVER                              │
│       Node.js + Express + TypeScript + Zod Validation + Helmet         │
│                   Port: http://localhost:5000/api                       │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
     ┌───────────────────┐┌──────────────────┐┌───────────────────┐
     │    PRISMA ORM     ││ STORAGE ENGINE   ││  PDF ENGINE       │
     │ SQLite (local dev)││ Local /uploads   ││ PDFKit            │
     │ Postgres (prod)   ││ S3-ready adapt.  ││ Invoices/Receipts │
     └───────────────────┘└──────────────────┘└───────────────────┘
```

### Technology Breakdown:
* **Frontend**:
  * **Framework**: React 18 with Vite build tool and strict TypeScript.
  * **Styling**: Tailwind CSS with custom glassmorphism design system and full light/dark mode support.
  * **Routing**: React Router v6 with authenticated route guards and role-based redirect protection.
  * **State & Forms**: Context API (`AuthContext`), React Hook Form, and Zod client validation.
  * **UI Components**: Toast notifications, interactive modals, responsive data tables, and dynamic quotation cards.
* **Backend**:
  * **Runtime & Framework**: Node.js with Express and TypeScript.
  * **Security**: Helmet headers, CORS credentials whitelist, express-rate-limit, bcrypt password hashing.
  * **Authentication**: Dual JWT tokens (short-lived access tokens and refresh tokens) stored in secure `httpOnly` cookies.
  * **Validation**: Centralized Zod request body, query, and parameter middleware.
  * **File Storage**: Modular storage abstraction defaulting to local `/uploads` directory with clean S3 swappability.
  * **Document Generation**: PDFKit vector engine generating official rental agreements, GST tax invoices, and payment receipts.
* **Database & Persistence**:
  * **ORM**: Prisma ORM with 18 relational models.
  * **Engines**: SQLite for instant zero-dependency local development; 1-click switch to PostgreSQL for enterprise production.

---

## 3. End-to-End Operational Workflows

### Flow 1: Staff Authentication & Session Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff / Admin
    participant UI as DrivePulse Client
    participant API as Express Auth API
    participant DB as Prisma Database

    Staff->>UI: Enter email & password
    UI->>API: POST /api/auth/login { email, password }
    API->>DB: Query User by email
    DB-->>API: User record (bcrypt hash, role)
    API->>API: Compare password hash
    alt Credentials Valid
        API->>API: Generate Access Token (15m) & Refresh Token (7d)
        API->>UI: HTTP 200 + Set httpOnly Cookies
        UI->>UI: Store user profile in AuthContext
        UI-->>Staff: Redirect to Dashboard
    else Invalid Password
        API-->>UI: HTTP 401 Unauthorized
        UI-->>Staff: Display error banner
    end
```

#### Roles & Permissions Architecture:
The system operates on an **Admin-Centric model** where the business administrator (`ADMIN`) has universal, complete access across all capabilities:

| Capability / Feature | Admin (`ADMIN`) |
| :--- | :---: |
| View Dashboard & Fleet Summary | **Full Access** |
| Create & Dispatch Bookings | **Full Access** |
| Record Inspections & Signatures | **Full Access** |
| Collect Advance & Balance Payments | **Full Access** |
| Enter Customers Manually | **Full Access** |
| Authorize Compliance Document Override | **Full Access** |
| Bypass Outstanding Balance at Handover | **Full Access** |
| Add / Edit / Deactivate Fleet Vehicles | **Full Access** |
| Upload & Renew Vehicle Compliance Docs | **Full Access** |
| Blacklist / Unblacklist Customers | **Full Access** |
| System Settings & Tariff Rules | **Full Access** |
| Security Audit Trail Logs (`/audit`) | **Full Access** |

---

### Flow 2: Vehicle Fleet & Compliance Document Verification
Every vehicle in DrivePulse undergoes continuous compliance monitoring across mandatory legal certificates:
* **INSURANCE** (Comprehensive / Zero-Depreciation / Third-Party)
* **FITNESS** (Commercial Vehicle Fitness Certificate)
* **PUC** (Pollution Under Control Certificate)
* **RC** (Registration Certificate)
* **ROAD TAX** & **PERMIT**

#### Compliance Gating Logic:
```mermaid
flowchart TD
    Start([Booking Creation Initiated]) --> FetchCandidate[Fetch Available Vehicles for Dates]
    FetchCandidate --> CheckDocs{Mandatory Docs Valid?\nInsurance, Fitness, PUC}
    CheckDocs -- All Valid --> AllowBooking[Vehicle Available for Booking]
    CheckDocs -- One or More Expired --> FlagBlocked[Mark as Compliance Blocked]
    FlagBlocked --> RequireOverride[Require Admin Override Checkbox\n+ Documented Override Justification]
    RequireOverride --> OverrideProvided{Reason >= 5 chars?}
    OverrideProvided -- Yes --> LogAudit[Log Security Audit Trail\nProceed with Booking]
    OverrideProvided -- No --> BlockAdmin[Validation Error: Reason Required]
```

---

### Flow 3: Customer Walk-in & Manual Booking Dispatch
When a customer arrives at the counter or calls over the phone:

```mermaid
sequenceDiagram
    autonumber
    actor CounterStaff as Counter Staff
    participant BookingUI as CreateBookingPage
    participant API as Booking Controller
    participant DB as Prisma Database

    CounterStaff->>BookingUI: Toggle "Enter Manually"
    CounterStaff->>BookingUI: Input Full Name, Phone, DL (Optional), City
    CounterStaff->>BookingUI: Select Pickup & Return Window
    BookingUI->>API: GET /api/bookings/available-vehicles?dates...
    API->>DB: Query non-overlapping & compliant vehicles
    DB-->>BookingUI: Return available vehicles with seat capacity
    CounterStaff->>BookingUI: Select vehicle (e.g. 7 Seater Innova)
    CounterStaff->>BookingUI: Enter Agreed Rental Amount (e.g. ₹6,500 based on 6 people)
    BookingUI->>BookingUI: Live Quotation displays Total Rental (₹6,500, GST already included in tariff)
    CounterStaff->>BookingUI: Enter Initial Advance Collected (e.g. ₹2,000)
    CounterStaff->>BookingUI: Click "Confirm & Schedule Booking"
    BookingUI->>API: POST /api/bookings (Manual Customer + Rent)
    alt New Customer
        API->>DB: Auto-create Customer in directory
    else Existing Phone Match
        API->>DB: Link existing Customer ID
    end
    API->>DB: Create Booking (BK-YYYY-XXXX) + Payment Receipt (REC-YYYY-XXXX)
    DB-->>API: Booking Confirmed
    API-->>BookingUI: Return Booking details
    BookingUI-->>CounterStaff: Redirect to Booking Detail View
```

---

### Flow 4: Vehicle Pickup & Digital Handover Inspection
```mermaid
sequenceDiagram
    autonumber
    actor Staff as Counter / Yard Staff
    actor Customer as Hirer
    participant UI as PickupInspectionModal
    participant API as Inspection API
    participant DB as Database
    participant PDF as PDF Service

    Staff->>UI: Click "Perform Pickup Inspection"
    Staff->>UI: Enter current physical odometer & fuel level (0/4 to 4/4)
    Staff->>UI: Note existing exterior scratches/dents & upload photos
    Staff->>UI: Verify handed-over accessories (Spare wheel, Fastag, Tool kit)
    Customer->>UI: Sign on digital touchscreen canvas
    Staff->>UI: Submit Inspection
    UI->>API: POST /api/bookings/:id/pickup-inspection
    API->>DB: Store InspectionChecklist (type: PICKUP)
    API->>DB: Update Booking status -> PICKED_UP
    API->>DB: Update Vehicle status -> RENTED
    API-->>UI: Handover Complete
    UI->>PDF: Generate signed Rental Agreement PDF
    PDF-->>Customer: Official Signed Rental Agreement
```

---

### Flow 5: Vehicle Return, Damage Settlement & Deposit Refund
```mermaid
sequenceDiagram
    autonumber
    actor Staff as Yard Staff
    participant UI as ReturnInspectionModal
    participant API as Inspection API
    participant DB as Database

    Staff->>UI: Open "Perform Return Inspection"
    Staff->>UI: Enter return odometer & return fuel level
    alt Return Odometer < Pickup Odometer
        UI-->>Staff: Validation Error: Cannot be lower than pickup
    end
    Staff->>UI: Inspect for new damages (enter damage charge if any)
    Staff->>UI: Calculate fuel deficiency charge (if fuel returned lower)
    Staff->>UI: Assess late return penalty fee (if applicable)
    Staff->>UI: Customer signs return acknowledgment
    Staff->>UI: Submit Return Inspection
    UI->>API: POST /api/bookings/:id/return-inspection
    API->>DB: Store InspectionChecklist (type: RETURN)
    API->>DB: Update Booking status -> RETURNED
    API->>DB: Update Vehicle status -> AVAILABLE
    API->>DB: Sync Vehicle odometer with return reading
    API->>UI: Return finalized. Security deposit refund calculated.
```

---

### Flow 6: Billing, Invoicing & Financial Settlement
Every rupee through the system is auditable and tracked under formal financial structures:
1. **Advance Deposit**: Immediately generates an official payment receipt with a unique identifier (`REC-YYYY-XXXX`).
2. **Balance Collection**: Recorded via UPI, Cash, Card, or Bank Transfer at vehicle handover or return.
3. **Statutory GST Tax Invoice**:
   * Issued under SAC Code **996601** (Rental services of passenger vehicles).
   * Automatically splits 18% GST into **9% CGST** and **9% SGST**.
   * Generates a tamper-proof PDF Tax Invoice (`INV-YYYY-XXXX`) compliant with Indian GST rules.

---

## 4. Complete Database Relational Schema

```
┌─────────────┐       1:N       ┌──────────────┐       1:N       ┌─────────────────────┐
│  Customer   ├────────────────►│   Booking    ├────────────────►│ InspectionChecklist │
└──────┬──────┘                 └──────┬───────┘                 └─────────────────────┘
       │ 1:N                           │
       ▼                               │ 1:N
┌──────────────┐                       ├────────────────►┌──────────────┐
│CustomerDoc   │                       │                 │   Payment    │
└──────────────┘                       │ 1:N             └──────────────┘
                                       ├────────────────►┌──────────────┐
┌─────────────┐       1:N              │                 │   Invoice    │
│   Vehicle   ├────────────────────────┘                 └──────────────┘
└──────┬──────┘                        │ 1:N
       │ 1:N                           └────────────────►┌──────────────┐
       ├────────────────►┌─────────────┐                 │ BookingExtra │
       │                 │ VehicleDoc  │                 └──────────────┘
       │ 1:N             └─────────────┘
       ├────────────────►┌─────────────┐
       │                 │ Maintenance │
       │ 1:N             └─────────────┘
       └────────────────►┌─────────────┐
                         │   Expense   │
                         └─────────────┘
```

### Core Entities:
1. **User**: Administrator credentials, salted password hash, assigned role (`ADMIN`), and active session tokens.
2. **Vehicle**: Multi-category fleet asset tracking cars, bikes, and scooters. Attributes include category `type` (`CAR`, `BIKE`, `SCOOTER`), make, model, variant, year, registration number, fuel type, transmission, seating capacity (1–15 seats), security deposit, status (`AVAILABLE`, `RENTED`, `MAINTENANCE`, `INACTIVE`), and chassis/engine numbers.
3. **VehicleDocument**: Legal compliance certificates (Insurance, Fitness, PUC, RC, Permit) with issue dates, expiry dates, policy details, and validity status.
4. **Customer**: Full name, phone, alternate contact, address, KYC verification status, and blacklist status with documented violation reasons.
5. **CustomerDocument**: Driving licence, Aadhaar, Passport, or Voter ID records with document numbers, verification status, and expiry tracking.
6. **Booking**: Core operational contract tracking pickup/return dates, locations, assigned vehicle, customer, custom agreed rental tariff, 18% GST tax, total charges, advance paid, balance due, and booking status.
7. **InspectionChecklist**: Digital condition reports for pickup and return, recording physical odometer, fuel level, scratch/dent notes, photos, accessory checklist, and customer digital signatures.
8. **Payment**: Payment receipts with transaction references, payment modes (UPI, Cash, Card, NetBanking), payment types (Advance, Balance, Security Deposit, Damage Settlement), and recipient staff ID.
9. **Invoice**: Statutory GST tax invoice records with unique numbers, CGST/SGST breakdown, and customer GSTIN.
10. **AuditLog**: Immutably tracks every administrative action, compliance bypass, balance override, and role change with IP addresses and timestamps.
11. **SystemSetting**: Stores company legal name, GSTIN, PAN, hub addresses, and default business policies.

---

## 5. API Endpoint Catalog

### Authentication (`/api/auth`)
* `POST /login`: Authenticates staff credentials, issues JWT access and refresh cookies.
* `POST /logout`: Clears session cookies and revokes tokens.
* `POST /refresh`: Refreshes expired access tokens using the refresh cookie.
* `GET  /me`: Returns current authenticated staff user and role.

### Fleet & Vehicles (`/api/vehicles`)
* `GET    /`: Lists all vehicles with compliance summary and search filters.
* `POST   /`: Registers a new fleet vehicle (Manager / Super Admin only).
* `GET    /:id`: Returns full vehicle details, specifications, and document records.
* `PUT    /:id`: Updates vehicle specifications and details.
* `DELETE /:id`: Deactivates a vehicle from active fleet.
* `POST   /:id/documents`: Uploads a new legal compliance document.
* `POST   /documents/:docId/renew`: Renews an existing compliance certificate.
* `POST   /:id/maintenance`: Records vehicle servicing or repair.
* `POST   /:id/expenses`: Logs operating expenses (fuel, tolls, cleaning).

### Bookings & Operations (`/api/bookings`)
* `GET  /available-vehicles`: Queries available fleet vehicles for a pickup/return window.
* `GET  /`: Lists bookings with pagination, date filters, and status filters.
* `POST /`: Creates a booking with manual customer entry or existing customer, custom rent, and overlap checks.
* `GET  /:id`: Fetches complete booking details, customer, vehicle, checklists, and ledger.
* `PUT  /:id/status`: Updates booking status (`CONFIRMED`, `PICKED_UP`, `RETURNED`, `CANCELLED`).
* `POST /:id/extend`: Extends rental duration and recalculates balance due.
* `GET  /:id/agreement-pdf`: Downloads the signed PDF Rental Agreement.
* `POST /:bookingId/pickup-inspection`: Records pickup inspection and customer signature.
* `POST /:bookingId/return-inspection`: Records return condition, damage charges, and deposit refund.

### Payments & Invoices (`/api/payments` & `/api/invoices`)
* `POST /payments`: Records an advance or balance payment; returns receipt number.
* `GET  /payments/:id/receipt-pdf`: Downloads the official Payment Receipt PDF.
* `POST /invoices/generate`: Generates an official GST Tax Invoice.
* `GET  /invoices/:id/invoice-pdf`: Downloads the official GST Tax Invoice PDF.

### Executive Dashboard & Reports (`/api/dashboard` & `/api/reports`)
* `GET /dashboard/summary`: Live KPI metrics (total fleet, utilization rate, active rentals, monthly revenue).
* `GET /reports/revenue`: Financial ledger and transaction logs with revenue trends.
* `GET /reports/revenue/export-csv`: Streams downloadable CSV spreadsheet of all transactions.
* `GET /reports/fleet-utilization`: Operating efficiency and rental days per vehicle.
* `GET /reports/customers`: Customer lifetime value and repeat rental frequency.

---

## 6. Security, Compliance & Data Integrity

1. **Role-Based Middleware (`authorize(...)`)**: Protects administrative endpoints against privilege escalation.
2. **Double Verification on Sensitive Overrides**: Staff cannot override compliance document warnings; Managers must document justification.
3. **Double Verification on Pickup Balance**: If a customer has not paid their advance or has an outstanding balance at dispatch, a Manager must approve the release with a documented reason.
4. **Overlap Prevention**: Double-guarded using both pre-query filters and database transaction locking to prevent double-booking the same vehicle.
5. **Customer Blacklist Guard**: Blocks bookings immediately if the customer's phone number matches a blacklisted profile on record.

---

## 7. Development & Deployment Cheatsheet

### Quick Start Commands
```bash
# 1. Install root, client, and server dependencies
npm run install:all

# 2. Setup database and seed default accounts & fleet
npm run seed

# 3. Launch both backend API and frontend dev servers concurrently
npm run dev
# Frontend runs at: http://localhost:3000/
# Backend API runs at: http://localhost:5000/

# 4. Execute automated end-to-end integration test suite
npm run test

# 5. Compile production builds
npm run build
```

### Pre-Configured Administrator Credentials:
* **Admin**: `admin@drivepulse.com` / `Password@123`
*(Sole active administrative login; manager and staff roles are disabled and not needed).*

---

## 8. Zero-Cost ($0) Production Deployment Guide for Client Testing

To allow your client, investors, or testing stakeholders to evaluate **DrivePulse live in a real production environment on mobile phones and desktop computers without spending any money**, the application is architected to run seamlessly on top-tier **$0 / free cloud tiers** with **no credit card required**.

### 8.1 The $0 Cloud Architecture Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│             GLOBAL CLIENT CDN & MOBILE APP (100% FREE)                 │
│                      Platform: Vercel / Render                         │
│   • Continuous Deployment from GitHub repo                             │
│   • Global Anycast Edge CDN + Automatic Free SSL (HTTPS)               │
│   • Zero cold start latency for mobile & desktop staff                 │
│   • Monthly Cost: $0.00 / month                                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS API Calls (httpOnly JWT Cookies)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             PRODUCTION REST API ENGINE (100% FREE)                     │
│                   Platform: Render Free Web Service                    │
│   • Node.js 18+ runtime with Express, Zod & PDFKit                     │
│   • 750 free instance hours/month (Covers 24/7 testing)                │
│   • Free managed SSL subdomain: https://drivepulse-api.onrender.com    │
│   • Automatic health checks & zero-downtime rolling deploys            │
│   • Monthly Cost: $0.00 / month                                        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Direct TLS Connection          │ Storage
                    ▼                                ▼
┌──────────────────────────────────────┐┌────────────────────────────────┐
│   MANAGED POSTGRESQL DATABASE ($0)   ││   CLOUD ASSET STORAGE ($0)     │
│       Platform: Neon Serverless      ││  Platform: Local / Cloudinary  │
│ • 0.5 GB SSD Storage (thousands of   ││ • Local disk on persistent FS  │
│   bookings, customers & vehicles)    ││   OR Cloudinary Free Tier      │
│ • Serverless auto-scaling compute    ││   (25 GB managed bandwidth/mo) │
│ • Automated SSL encryption           ││ • Digital signature data URIs  │
│ • No credit card required            ││ • PDF receipts streamed online │
│ • Monthly Cost: $0.00 / month        ││ • Monthly Cost: $0.00 / month  │
└──────────────────────────────────────┘└────────────────────────────────┘
```

#### Cost Breakdown Summary:
| Infrastructure Layer | Recommended Cloud Provider | Free Tier Specification | Cost to Test for Client |
| :--- | :--- | :--- | :---: |
| **Relational Database** | **Neon PostgreSQL** | 0.5 GB SSD, serverless autoscaling, SSL, no CC needed | **$0.00** |
| **Backend REST API** | **Render Web Service** | 512 MB RAM, 750 free hours/month, automated SSL | **$0.00** |
| **Frontend Web App** | **Vercel** / **Render Static** | Global Edge CDN, unlimited deployments, custom domain | **$0.00** |
| **PDF Generation Engine** | Built-in PDFKit | Zero external microservices, runs in-memory on backend | **$0.00** |
| **SSL / HTTPS Certificates** | Let's Encrypt (Automated) | Full end-to-end encryption for cookies and APIs | **$0.00** |
| **Total Operational Cost** | — | **Full-featured production environment** | **$0.00 / Free** |

---

### 8.2 Step-by-Step Live Deployment Walkthrough

#### Step 1: Provision Free PostgreSQL Database on Neon (2 Minutes)
1. Sign up for free at **[Neon.tech](https://neon.tech)** (sign up with GitHub or Google; no credit card required).
2. Click **Create Project**, choose project name `drivepulse-production` and region closest to your client (e.g. `ap-southeast-1` Singapore or `eu-central-1` Frankfurt).
3. Copy the generated **Postgres Connection String**:
   ```
   postgresql://drivepulse_owner:PASSWORD@ep-xyz-12345.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. This connection string will be set as your `DATABASE_URL` environment variable.

#### Step 2: Push Your Codebase to GitHub
1. Create a private or public repository on GitHub (e.g., `github.com/your-username/drivepulse-rental`).
2. Push your project commits:
   ```bash
   git remote add origin https://github.com/your-username/drivepulse-rental.git
   git branch -M main
   git push -u origin main
   ```

#### Step 3: Deploy Backend API to Render (3 Minutes)
1. Sign up for free at **[Render.com](https://render.com)**.
2. In the dashboard, click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   * **Name**: `drivepulse-api`
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && npm run build && npx prisma db push && npm run seed
     ```
   * **Start Command**:
     ```bash
     npm start
     ```
   * **Instance Type**: `Free` ($0/mo)
5. Under **Environment Variables**, add the following:
   * `DATABASE_URL`: *(Paste the Neon PostgreSQL connection string from Step 1)*
   * `JWT_SECRET`: *(Generate a 32+ character random secret string)*
   * `JWT_REFRESH_SECRET`: *(Generate a second random secret string)*
   * `NODE_ENV`: `production`
   * `PORT`: `5000`
   * `CLIENT_URL`: `https://drivepulse.vercel.app` *(or your Vercel URL from Step 4)*
6. Click **Create Web Service**. Render will install dependencies, compile TypeScript, run Prisma migrations onto Neon, seed all default fleet and staff records, and start the service with a secure URL (e.g. `https://drivepulse-api.onrender.com`).

#### Step 4: Deploy Frontend Client to Vercel (2 Minutes)
1. Sign up for free at **[Vercel.com](https://vercel.com)**.
2. Click **Add New... > Project** and import your GitHub repository.
3. Configure the project:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click edit and select `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   * `VITE_API_BASE_URL`: `https://drivepulse-api.onrender.com` *(your Render backend URL)*
5. Add a `vercel.json` SPA rewrite file inside the `client` directory (already pre-configured) to handle React Router client-side routing:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://drivepulse-api.onrender.com/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
6. Click **Deploy**. Vercel will build and deploy the production SPA to a live HTTPS URL (e.g., `https://drivepulse.vercel.app`).

---

### 8.3 Live Client Acceptance Testing (UAT) Guide

Once deployed, provide the client with the live URL and the pre-configured test credentials. The client can test both on **smartphones (iOS Safari, Android Chrome)** and **desktop browsers**:

#### Client UAT Verification Checklist:
1. **Mobile Experience Testing**:
   * Open the live URL on a phone. Notice the native mobile feel:
   * **Touch Navigation Bar**: Quick one-thumb access to Dashboard, Fleet, Bookings, and floating New Booking action.
   * **Mobile Off-Canvas Drawer**: Tap the "Menu" button to test the sliding navigation drawer with dark mode toggle and user role badge.
   * **Interactive Booking Cards**: On `/bookings`, view the responsive card view with direct "Handover" and "Return" touch buttons.
2. **Booking Dispatch & Dynamic Quotation**:
   * Create a new booking on `/bookings/new`.
   * Type a walk-in customer manually (e.g., *Vikram Patel*, *9876543210*).
   * Notice that no rigid rates are forced; enter the negotiated tariff based on the party size (e.g., *₹3,500 for 5 passengers*).
   * Check the **Mobile Sticky Quotation Bar** at the bottom showing live Total (`₹`), 18% GST calculation, and Balance Due.
3. **Vehicle Handover & Digital Inspection**:
   * Open the newly created booking and click **Handover Inspection**.
   * Draw the customer's signature on the touch canvas using a finger or stylus.
   * Confirm handover. Notice the status instantly flips to **Active on Road (`PICKED_UP`)**.
4. **GST Invoicing & Official PDF Generation**:
   * Navigate to `/payments`.
   * Click **Generate Tax Invoice** or download the **Payment Receipt PDF**.
   * Open the PDF to inspect the statutory Indian GST layout (HSN/SAC `996601`, 9% CGST, 9% SGST, signature verification, and official letterhead).
5. **Fresh Deployment & Admin-Only Security**:
   * Log in with Admin credentials (`admin@drivepulse.com` / `Password@123`).
   * Verify that the database starts completely fresh (0 vehicles, 0 test customers, 0 dummy bookings).
   * Click **Add Vehicle** on `/vehicles` to manually register your first car, bike, or scooter with custom tariffs and compliance documents.

---

### 8.4 Production Environment Variable Reference

#### Server (`server/.env`):
```env
# Database (SQLite default or Neon PostgreSQL Free Tier)
DATABASE_URL="file:./dev.db"

# Server Port & Mode
PORT=5000
NODE_ENV=production

# Authentication Secrets
JWT_SECRET="drivepulse_super_secure_jwt_production_secret_key_2026_xyz"
JWT_REFRESH_SECRET="drivepulse_super_secure_refresh_token_secret_key_2026_abc"

# Cross-Origin Resource Sharing (Frontend Domain)
CLIENT_URL="https://drivepulse.vercel.app"

# Storage Mode (local or cloudinary)
STORAGE_DRIVER=local
UPLOAD_DIR="./uploads"
```

#### Client (`client/.env`):
```env
# Points to Render Live REST API
VITE_API_BASE_URL="https://drivepulse-api.onrender.com"
```

---

*DrivePulse Car Rental Management System — Engineered for reliability, compliance, mobile excellence, and effortless $0 client verification.*

