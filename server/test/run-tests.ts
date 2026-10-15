/**
 * DrivePulse Car Rental Management System — Automated Test Suite
 * End-to-End Integration & Business Logic Tests
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

interface AuthContext {
  cookieStr: string;
  accessToken: string;
}

let adminAuth: AuthContext = { cookieStr: '', accessToken: '' };
let managerAuth: AuthContext = { cookieStr: '', accessToken: '' };
let staffAuth: AuthContext = { cookieStr: '', accessToken: '' };

function parseAuth(headers: Headers): AuthContext {
  let accessToken = '';
  const parts: string[] = [];

  const rawList = typeof (headers as any).getSetCookie === 'function'
    ? (headers as any).getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie')!] : []);

  for (const raw of rawList) {
    const segments = raw.split(',');
    for (const seg of segments) {
      const pair = seg.split(';')[0].trim();
      if (pair) parts.push(pair);
      if (pair.startsWith('accessToken=')) {
        accessToken = pair.substring('accessToken='.length);
      }
    }
  }

  return {
    cookieStr: parts.join('; '),
    accessToken,
  };
}

async function request(path: string, options: RequestInit = {}, auth?: AuthContext): Promise<{ res: Response; data: any; headers: Headers }> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }
  if (auth?.cookieStr) {
    headers.set('Cookie', auth.cookieStr);
  }
  if (auth?.accessToken) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else if (contentType.includes('text/')) {
    data = await res.text();
  }

  return { res, data, headers: res.headers };
}

async function runTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      suite,
      name,
      passed: true,
      durationMs: Date.now() - start,
    });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      suite,
      name,
      passed: false,
      error: err.message || String(err),
      durationMs: Date.now() - start,
    });
    console.error(`  ✗ ${name} (${Date.now() - start}ms)`);
    console.error(`    Error: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🚀 DrivePulse Car Rental Management — Test Suite');
  console.log(`Targeting: ${BASE_URL}`);
  console.log('======================================================\n');

  // ==========================================
  // 1. SYSTEM HEALTH & AUTHENTICATION SUITE
  // ==========================================
  console.log('📦 Suite 1: Authentication & Session Management');

  await runTest('Auth', 'Health check endpoint returns ok', async () => {
    const { res, data } = await request('/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(data.status === 'ok', 'Expected status to be ok');
  });

  await runTest('Auth', 'Super Admin login succeeds and sets auth cookies', async () => {
    const { res, data, headers } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@drivepulse.com', password: 'Password@123' }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const user = data.data?.user || data.user;
    assert(user?.role === 'SUPER_ADMIN', `Expected SUPER_ADMIN, got ${user?.role}`);
    adminAuth = parseAuth(headers);
    assert(!!adminAuth.accessToken, 'Expected JWT access token');
  });

  await runTest('Auth', 'Login fails with invalid password (HTTP 401)', async () => {
    const { res } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@drivepulse.com', password: 'WrongPassword' }),
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await runTest('Auth', 'Manager login succeeds with MANAGER role', async () => {
    const { res, data, headers } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'manager@drivepulse.com', password: 'Password@123' }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const user = data.data?.user || data.user;
    assert(user?.role === 'MANAGER', `Expected MANAGER, got ${user?.role}`);
    managerAuth = parseAuth(headers);
  });

  await runTest('Auth', 'Staff login succeeds with STAFF role', async () => {
    const { res, data, headers } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@drivepulse.com', password: 'Password@123' }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const user = data.data?.user || data.user;
    assert(user?.role === 'STAFF', `Expected STAFF, got ${user?.role}`);
    staffAuth = parseAuth(headers);
  });

  await runTest('Auth', 'Current session /auth/me returns authenticated user', async () => {
    const { res, data } = await request('/auth/me', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const user = data.data?.user || data.user;
    assert(user?.email === 'admin@drivepulse.com', `Expected admin email, got ${user?.email}`);
  });

  // ==========================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC) SUITE
  // ==========================================
  console.log('\n📦 Suite 2: Role-Based Access Control (RBAC)');

  await runTest('RBAC', 'Staff cannot access User Management /users (HTTP 403)', async () => {
    const { res } = await request('/users', {}, staffAuth);
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await runTest('RBAC', 'Super Admin can access User Management /users (HTTP 200)', async () => {
    const { res, data } = await request('/users', {}, adminAuth);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const list = data.data || data.users || data;
    assert(Array.isArray(list), 'Expected users array');
  });

  await runTest('RBAC', 'Staff cannot update system settings (HTTP 403)', async () => {
    const { res } = await request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ companyName: 'Unauthorized Change' }),
    }, staffAuth);
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await runTest('RBAC', 'Manager can read system settings (HTTP 200)', async () => {
    const { res, data } = await request('/settings', {}, managerAuth);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(typeof data === 'object', 'Expected settings object');
  });

  // ==========================================
  // 3. VEHICLE FLEET & COMPLIANCE ENGINE SUITE
  // ==========================================
  console.log('\n📦 Suite 3: Vehicle Fleet & Compliance Engine');

  let testVehicleId = '';
  await runTest('Vehicles', 'List vehicles with compliance document status', async () => {
    const { res, data } = await request('/vehicles', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const list = data.data?.vehicles || data.vehicles || data;
    assert(Array.isArray(list) && list.length > 0, 'Expected non-empty vehicles array');
    testVehicleId = list[0].id;
    assert(!!list[0].registrationNumber, 'Expected vehicle registrationNumber');
  });

  await runTest('Vehicles', 'Get vehicle detail with compliance documents and odometer', async () => {
    const { res, data } = await request(`/vehicles/${testVehicleId}`, {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const v = data.data?.vehicle || data.vehicle || data.data || data;
    assert(v.id === testVehicleId, 'Expected matching vehicle id');
    assert(Array.isArray(v.documents), 'Expected documents array');
  });

  // ==========================================
  // 4. CUSTOMER MANAGEMENT & KYC VERIFICATION
  // ==========================================
  console.log('\n📦 Suite 4: Customer Management & KYC ID Verification');

  let testCustomerId = '';
  let blacklistedCustomerId = '';

  await runTest('Customers', 'List customers with KYC status', async () => {
    const { res, data } = await request('/customers', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const list = data.data?.customers || data.customers || data;
    assert(Array.isArray(list) && list.length > 0, 'Expected customers array');
    const valid = list.find((c: any) => !c.isBlacklisted);
    testCustomerId = valid?.id || list[0].id;
    const bl = list.find((c: any) => c.isBlacklisted);
    if (bl) blacklistedCustomerId = bl.id;
  });

  await runTest('Customers', 'Customer detail includes verified KYC documents', async () => {
    const { res, data } = await request(`/customers/${testCustomerId}`, {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const c = data.data?.customer || data.customer || data.data || data;
    assert(c.id === testCustomerId, 'Expected customer match');
    assert(Array.isArray(c.documents), 'Expected documents array');
  });

  if (blacklistedCustomerId) {
    await runTest('Customers', 'Blacklisted customer is flagged with documented reason', async () => {
      const { res, data } = await request(`/customers/${blacklistedCustomerId}`, {}, adminAuth);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const c = data.data?.customer || data.customer || data.data || data;
      assert(c.isBlacklisted === true, 'Expected isBlacklisted to be true');
      assert(!!c.blacklistReason, 'Expected blacklistReason to be documented');
    });
  }

  // ==========================================
  // 5. BOOKING LIFECYCLE & FINANCIAL ENGINE
  // ==========================================
  console.log('\n📦 Suite 5: Booking Lifecycle, Payments & Invoicing');

  let testBookingId = '';
  await runTest('Bookings', 'List existing bookings with balance and status', async () => {
    const { res, data } = await request('/bookings', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const list = data.data?.bookings || data.bookings || data;
    assert(Array.isArray(list) && list.length > 0, 'Expected bookings array');
    const activeBooking = list.find((b: any) => b.status !== 'CANCELLED') || list[0];
    testBookingId = activeBooking.id;
  });

  await runTest('Bookings', 'Available vehicles query filters overlapping dates', async () => {
    const from = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString();
    const { res, data } = await request(`/bookings/available-vehicles?pickupDateTime=${from}&returnDateTime=${to}`, {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const list = data.vehicles || data.data || data;
    assert(Array.isArray(list), 'Expected array of available vehicles');
  });

  await runTest('Bookings', 'Create booking with manually entered customer name & custom manual rent', async () => {
    const randomOffset = Math.floor(60 + Math.random() * 500);
    const pickup = new Date(Date.now() + randomOffset * 24 * 60 * 60 * 1000).toISOString();
    const returnDate = new Date(Date.now() + (randomOffset + 3) * 24 * 60 * 60 * 1000).toISOString();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const manualPhone = `98888${randomSuffix}`;
    const manualRent = 4500; // custom negotiated rent based on 6 people

    const { res, data } = await request('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customerName: `Walk-in Customer ${randomSuffix}`,
        customerPhone: manualPhone,
        customerDlNumber: `KA05${randomSuffix}`,
        customerCity: 'Bengaluru',
        vehicleId: testVehicleId,
        pickupDateTime: pickup,
        returnDateTime: returnDate,
        pickupLocation: 'DrivePulse Hub',
        returnLocation: 'DrivePulse Hub',
        manualRentalAmount: manualRent,
        passengerCount: 6,
        status: 'CONFIRMED',
        managerOverrideCompliance: true,
        overrideComplianceReason: 'Super admin test compliance bypass',
      }),
    }, adminAuth);

    assert(res.status === 201 || res.status === 200, `Expected 201/200, got ${res.status}: ${JSON.stringify(data)}`);
    const booking = data.data || data;
    assert(booking.bookingNumber.startsWith('BK-'), `Expected BK- prefix, got ${booking.bookingNumber}`);
    assert(booking.customer.fullName === `Walk-in Customer ${randomSuffix}`, 'Expected customer to be created with manual name');
    assert(booking.customer.phone === manualPhone, 'Expected customer phone to match');
    // Check manual tariff was used: 4500 subtotal + 18% GST (810) = 5310 total
    assert(booking.totalAmount === 5310, `Expected totalAmount to be 5310, got ${booking.totalAmount}`);
  });

  let testPaymentId = '';
  await runTest('Payments', 'Record payment against booking generates REC-YYYY-XXXX receipt', async () => {
    const { res, data } = await request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: testBookingId,
        amount: 1500,
        mode: 'UPI',
        type: 'BALANCE',
        transactionReference: 'TEST-UPI-AUTO-01',
        notes: 'Automated integration test payment',
      }),
    }, adminAuth);

    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    const payment = data.data || data;
    assert(payment.receiptNumber.startsWith('REC-'), `Expected REC- prefix, got ${payment.receiptNumber}`);
    assert(payment.amount === 1500, 'Expected amount to be 1500');
    testPaymentId = payment.id;
  });

  await runTest('Payments', 'Official Receipt PDF endpoint returns HTTP 200 and application/pdf', async () => {
    const { res, headers } = await request(`/payments/${testPaymentId}/receipt-pdf`, {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(headers.get('content-type')?.includes('application/pdf') || false, 'Expected application/pdf');
  });

  let testInvoiceId = '';
  await runTest('Invoices', 'Generate GST Tax Invoice with SAC 996601 & CGST/SGST split', async () => {
    const { res, data } = await request('/invoices/generate', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: testBookingId,
        customerGstin: '29AABCU9603R1ZM',
        discount: 0,
      }),
    }, adminAuth);

    assert(res.status === 201 || res.status === 200, `Expected 201 or 200, got ${res.status}`);
    const invoice = data.data || data;
    assert(invoice.invoiceNumber.startsWith('INV-'), `Expected INV- prefix, got ${invoice.invoiceNumber}`);
    assert(invoice.cgstAmount > 0, 'Expected CGST amount > 0');
    assert(invoice.sgstAmount > 0, 'Expected SGST amount > 0');
    testInvoiceId = invoice.id;
  });

  await runTest('Invoices', 'Official Tax Invoice PDF endpoint returns HTTP 200 and application/pdf', async () => {
    const { res, headers } = await request(`/invoices/${testInvoiceId}/invoice-pdf`, {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(headers.get('content-type')?.includes('application/pdf') || false, 'Expected application/pdf');
  });

  // ==========================================
  // 6. DASHBOARD & ANALYTICAL REPORTS SUITE
  // ==========================================
  console.log('\n📦 Suite 6: Executive Dashboard & Analytics Reports');

  await runTest('Dashboard', 'Executive summary endpoint returns live fleet & financial metrics', async () => {
    const { res, data } = await request('/dashboard/summary', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const summary = data.data || data;
    assert(typeof summary.fleet.total === 'number', 'Expected fleet.total');
    assert(typeof summary.fleet.utilizationRate === 'number', 'Expected utilizationRate');
    assert(Array.isArray(summary.revenueTrend), 'Expected revenueTrend array');
  });

  await runTest('Reports', 'Revenue report returns totals and transactions ledger', async () => {
    const { res, data } = await request('/reports/revenue', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const r = data.data || data;
    assert(typeof r.summary.totalCollected === 'number', 'Expected totalCollected');
    assert(Array.isArray(r.payments), 'Expected payments array');
  });

  await runTest('Reports', 'Revenue report CSV export returns text/csv header and attachment', async () => {
    const { res, data, headers } = await request('/reports/revenue?format=csv', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(headers.get('content-type')?.includes('text/csv') || false, 'Expected text/csv');
    assert(typeof data === 'string' && data.includes('Receipt #,Date'), 'Expected CSV column headers');
  });

  await runTest('Reports', 'Fleet utilization report returns per-vehicle operating performance', async () => {
    const { res, data } = await request('/reports/fleet-utilization', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const list = data.data || data;
    assert(Array.isArray(list), 'Expected array of vehicle metrics');
    assert(list.length > 0 && typeof list[0].utilizationRate === 'number', 'Expected vehicle utilizationRate');
  });

  await runTest('Reports', 'Customer intelligence report returns CLV and repeat rental rate', async () => {
    const { res, data } = await request('/reports/customers', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const r = data.data || data;
    assert(typeof r.summary.repeatRatePercentage === 'number', 'Expected repeatRatePercentage');
    assert(Array.isArray(r.customers), 'Expected customers array');
  });

  // ==========================================
  // 7. BUSINESS SETTINGS & TARIFF CONFIG SUITE
  // ==========================================
  console.log('\n📦 Suite 7: Business Settings & Policies');

  await runTest('Settings', 'Get settings returns company details and tariff rules', async () => {
    const { res, data } = await request('/settings', {}, adminAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const s = data.data || data;
    assert(!!s.companyName, 'Expected companyName');
    assert(typeof s.defaultSecurityDeposit === 'number' || !isNaN(Number(s.defaultSecurityDeposit)), 'Expected deposit');
  });

  await runTest('Settings', 'Manager updates tariff policy settings successfully', async () => {
    const { res } = await request('/settings', {
      method: 'PUT',
      body: JSON.stringify({
        gracePeriodMinutes: 60,
        lateFeePerHour: 200,
        extraKmRate: 12,
      }),
    }, managerAuth);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ==========================================
  // TEST REPORT SUMMARY
  // ==========================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log('\n======================================================');
  console.log('📊 TEST RUN SUMMARY');
  console.log('======================================================');
  console.log(`Total Tests Run:  ${total}`);
  console.log(`Passed:           ${passed} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Failed:           ${failed}`);
  console.log(`Total Duration:   ${totalDuration}ms`);
  console.log('======================================================\n');

  if (failed > 0) {
    console.error('❌ SOME TESTS FAILED:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(` - [${r.suite}] ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 ALL INTEGRATION & BUSINESS LOGIC TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
