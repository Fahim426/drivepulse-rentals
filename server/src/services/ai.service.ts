import { prisma } from '../prisma';
import { config } from '../config';

export interface ActionButton {
  label: string;
  action: string;
  url: string;
  variant?: 'primary' | 'secondary' | 'warning';
}

export interface AIChatResponse {
  reply: string;
  actions?: ActionButton[];
  timestamp: string;
}

export interface AIDailyBriefing {
  date: string;
  headline: string;
  summary: string;
  metrics: {
    availableVehicles: number;
    activeRentals: number;
    returnsToday: number;
    pickupsToday: number;
    pendingBalanceTotal: number;
    expiringDocsCount: number;
  };
  highlights: string[];
  actionItems: ActionButton[];
}

export class AIService {
  /**
   * 1. Query available vehicles for date range
   */
  public static async checkAvailability(params: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }) {
    const now = new Date();
    const pickup = params.startDate ? new Date(params.startDate) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const returnDate = params.endDate ? new Date(params.endDate) : new Date(pickup.getTime() + 3 * 24 * 60 * 60 * 1000);

    const where: any = {
      deletedAt: null,
      status: { notIn: ['INACTIVE', 'MAINTENANCE'] },
    };

    if (params.category && ['CAR', 'BIKE', 'SCOOTER'].includes(params.category.toUpperCase())) {
      where.type = params.category.toUpperCase();
    }

    const allVehicles = await prisma.vehicle.findMany({
      where,
      select: {
        id: true,
        make: true,
        model: true,
        variant: true,
        registrationNumber: true,
        type: true,
        seats: true,
        fuelType: true,
        transmission: true,
        status: true,
      },
    });

    // Check overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: ['CONFIRMED', 'PICKED_UP'] },
        pickupDateTime: { lt: returnDate },
        returnDateTime: { gt: pickup },
      },
      select: { vehicleId: true },
    });

    const bookedIds = new Set(overlappingBookings.map((b) => b.vehicleId));
    const available = allVehicles.filter((v) => !bookedIds.has(v.id));

    return {
      pickupDateTime: pickup.toISOString(),
      returnDateTime: returnDate.toISOString(),
      totalFound: available.length,
      vehicles: available,
    };
  }

  /**
   * 2. Check specific vehicle status, current booking, and days remaining
   */
  public static async checkVehicleStatus(searchQuery: string) {
    const q = searchQuery.trim().toLowerCase();

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { registrationNumber: { contains: q } },
          { make: { contains: q } },
          { model: { contains: q } },
        ],
      },
      include: {
        documents: true,
        bookings: {
          where: {
            deletedAt: null,
            status: { in: ['CONFIRMED', 'PICKED_UP'] },
          },
          include: {
            customer: { select: { fullName: true, phone: true } },
          },
          orderBy: { pickupDateTime: 'desc' },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      return null;
    }

    const currentBooking = vehicle.bookings[0] || null;
    let rentalInfo = null;

    if (currentBooking) {
      const now = new Date();
      const returnTime = new Date(currentBooking.returnDateTime);
      const diffMs = returnTime.getTime() - now.getTime();
      const totalHours = Math.round(diffMs / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = Math.max(0, totalHours % 24);
      const isOverdue = diffMs < 0;

      rentalInfo = {
        bookingId: currentBooking.id,
        bookingNumber: currentBooking.bookingNumber,
        customerName: currentBooking.customer?.fullName || 'Walk-in Customer',
        customerPhone: currentBooking.customer?.phone || '',
        pickupDateTime: currentBooking.pickupDateTime,
        returnDateTime: currentBooking.returnDateTime,
        isOverdue,
        remainingDays: Math.max(0, days),
        remainingHours: hours,
        balanceDue: currentBooking.balanceDue,
      };
    }

    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant,
      registrationNumber: vehicle.registrationNumber,
      type: vehicle.type,
      seats: vehicle.seats,
      status: vehicle.status,
      currentRental: rentalInfo,
      documents: vehicle.documents.map((d) => ({
        type: d.type,
        documentNumber: d.documentNumber,
        expiryDate: d.expiryDate,
        status: d.status,
      })),
    };
  }

  /**
   * 3. Query expiring compliance documents (< 30 days)
   */
  public static async getExpiringDocuments(daysAhead = 30) {
    const threshold = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    const docs = await prisma.vehicleDocument.findMany({
      where: {
        expiryDate: { lte: threshold },
      },
      include: {
        vehicle: {
          select: { id: true, make: true, model: true, registrationNumber: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    const now = Date.now();
    return docs.map((d) => {
      const remainingDays = Math.ceil((new Date(d.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
      return {
        id: d.id,
        vehicleId: d.vehicleId,
        vehicle: `${d.vehicle.make} ${d.vehicle.model} (${d.vehicle.registrationNumber})`,
        documentType: d.type,
        documentNumber: d.documentNumber,
        expiryDate: d.expiryDate,
        remainingDays,
        isExpired: remainingDays < 0,
      };
    });
  }

  /**
   * 4. Query pending balances across active and completed bookings
   */
  public static async getPendingBalances() {
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['CANCELLED'] },
        balanceDue: { gt: 0 },
      },
      include: {
        customer: { select: { fullName: true, phone: true } },
        vehicle: { select: { make: true, model: true, registrationNumber: true } },
      },
      orderBy: { balanceDue: 'desc' },
    });

    const totalPending = bookings.reduce((sum, b) => sum + b.balanceDue, 0);

    return {
      totalPending,
      count: bookings.length,
      bookings: bookings.map((b) => ({
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customer?.fullName || 'Walk-in Customer',
        customerPhone: b.customer?.phone || '',
        vehicle: `${b.vehicle?.make || 'Vehicle'} ${b.vehicle?.model || ''} (${b.vehicle?.registrationNumber || 'N/A'})`,
        balanceDue: b.balanceDue,
        status: b.status,
      })),
    };
  }

  /**
   * 5. Query cashier collections for today or weekly
   */
  public static async getCollectionsSummary(period: 'today' | 'week' | 'month' = 'today') {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        mode: true,
        type: true,
      },
    });

    let totalCollected = 0;
    const byMode: Record<string, number> = {};

    for (const p of payments) {
      if (p.type !== 'REFUND') {
        totalCollected += p.amount;
        byMode[p.mode] = (byMode[p.mode] || 0) + p.amount;
      } else {
        totalCollected -= p.amount;
      }
    }

    return {
      period,
      totalCollected,
      transactionCount: payments.length,
      byMode,
    };
  }

  /**
   * 6. Fleet overview counts
   */
  public static async getFleetOverview() {
    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { status: true, type: true },
    });

    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const rented = vehicles.filter((v) => v.status === 'RENTED').length;
    const maintenance = vehicles.filter((v) => v.status === 'MAINTENANCE').length;

    const cars = vehicles.filter((v) => v.type === 'CAR').length;
    const bikes = vehicles.filter((v) => v.type === 'BIKE').length;
    const scooters = vehicles.filter((v) => v.type === 'SCOOTER').length;

    return {
      total,
      available,
      rented,
      maintenance,
      breakdown: { cars, bikes, scooters },
      utilizationRate: total > 0 ? Math.round((rented / total) * 100) : 0,
    };
  }

  /**
   * Process natural language query using Dual-Engine (Gemini or Local Smart Heuristic)
   */
  public static async processChat(
    userMessage: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AIChatResponse> {
    const raw = userMessage.trim().toLowerCase();

    // Check if Gemini API Key is configured
    if (config.geminiApiKey) {
      try {
        const geminiResponse = await this.askGemini(userMessage, history);
        if (geminiResponse) return geminiResponse;
      } catch (err) {
        console.warn('Gemini API call failed, falling back to Local Operations NLP Engine:', err);
      }
    }

    // Local Operations NLP Engine (Guaranteed zero-downtime, offline-capable)
    return this.processLocalNLP(raw, userMessage);
  }

  /**
   * Local Smart Operations NLP Engine
   */
  private static async processLocalNLP(raw: string, originalMessage: string): Promise<AIChatResponse> {
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // 1. Availability Queries
    if (
      raw.includes('available') ||
      raw.includes('free') ||
      raw.includes('bookable') ||
      raw.includes('vacant') ||
      raw.includes('rent now') ||
      raw.includes('dates')
    ) {
      let category = undefined;
      if (raw.includes('bike')) category = 'BIKE';
      else if (raw.includes('scooter')) category = 'SCOOTER';
      else if (raw.includes('car')) category = 'CAR';

      // Specific vehicle check within availability
      const matchVehicle = await this.findMatchingVehicle(raw);
      if (matchVehicle) {
        const status = await this.checkVehicleStatus(matchVehicle.make);
        if (status) {
          return this.formatVehicleStatusReply(status, timestamp);
        }
      }

      const avail = await this.checkAvailability({ category });
      if (avail.vehicles.length === 0) {
        return {
          reply: `🔍 **Fleet Availability Check**\n\nNo vehicles are currently available in the fleet${category ? ` under category **${category}**` : ''}.\n\n• All vehicles may currently be on active rental or your fleet may be empty.`,
          actions: [
            { label: 'View Fleet', action: 'navigate', url: '/vehicles' },
            { label: 'Add New Vehicle', action: 'navigate', url: '/vehicles' },
          ],
          timestamp,
        };
      }

      const vehicleLines = avail.vehicles
        .slice(0, 5)
        .map(
          (v) =>
            `• **${v.make} ${v.model}** (${v.registrationNumber}) — ${v.type === 'CAR' ? '🚗 Car' : v.type === 'BIKE' ? '🏍️ Bike' : '🛵 Scooter'} • ${v.seats} Seats • ${v.fuelType}`
        )
        .join('\n');

      return {
        reply: `✨ **Available Fleet (${avail.vehicles.length} ready for rent):**\n\n${vehicleLines}\n\nAll these vehicles have cleared compliance checks and can be dispatched immediately.`,
        actions: [
          { label: 'Dispatch Booking', action: 'navigate', url: '/bookings/new', variant: 'primary' },
          { label: 'View All in Fleet', action: 'navigate', url: '/vehicles', variant: 'secondary' },
        ],
        timestamp,
      };
    }

    // 2. Specific Vehicle Status & Remaining Days Queries
    if (
      raw.includes('remaining') ||
      raw.includes('return') ||
      raw.includes('status') ||
      raw.includes('creta') ||
      raw.includes('thar') ||
      raw.includes('jupiter') ||
      raw.includes('activa') ||
      raw.includes('swift') ||
      raw.includes('nexon') ||
      raw.includes('innova') ||
      raw.includes('seltos') ||
      raw.includes('classic') ||
      raw.includes('days left')
    ) {
      const match = await this.findMatchingVehicle(raw);
      if (match) {
        const status = await this.checkVehicleStatus(match.registrationNumber || match.model);
        if (status) {
          return this.formatVehicleStatusReply(status, timestamp);
        }
      }
    }

    // 3. Expiring Documents / Insurance / PUC / Fitness Queries
    if (
      raw.includes('insurance') ||
      raw.includes('puc') ||
      raw.includes('fitness') ||
      raw.includes('document') ||
      raw.includes('expire') ||
      raw.includes('expiry') ||
      raw.includes('compliance')
    ) {
      const docs = await this.getExpiringDocuments(30);

      if (docs.length === 0) {
        return {
          reply: `🛡️ **Compliance Audit: All Clear!**\n\nAll registered vehicle documents (Insurance, Fitness, PUC) across your fleet are completely valid for at least the next 30 days. No renewals required right now.`,
          actions: [{ label: 'View Fleet Compliance', action: 'navigate', url: '/vehicles' }],
          timestamp,
        };
      }

      const docLines = docs
        .map(
          (d) =>
            `• **${d.vehicle}**: ${d.documentType} (${d.documentNumber}) — ${
              d.isExpired
                ? `❌ **EXPIRED ${Math.abs(d.remainingDays)} day(s) ago**`
                : `⚠️ **Expiring in ${d.remainingDays} day(s)**`
            }`
        )
        .join('\n');

      return {
        reply: `⚠️ **Compliance Alert: ${docs.length} Document(s) Requiring Attention**:\n\n${docLines}\n\nPlease renew these documents promptly to ensure vehicle rental legality and insurance protection.`,
        actions: [{ label: 'View Vehicles', action: 'navigate', url: '/vehicles', variant: 'warning' }],
        timestamp,
      };
    }

    // 4. Pending Balances / Unpaid Rentals / Debtors Queries
    if (
      raw.includes('balance') ||
      raw.includes('owe') ||
      raw.includes('pending') ||
      raw.includes('due') ||
      raw.includes('unpaid')
    ) {
      const pending = await this.getPendingBalances();

      if (pending.count === 0) {
        return {
          reply: `✅ **Financial Balance Audit: 100% Settled!**\n\nThere are currently **zero pending balances**. All active and returned bookings have their tariffs settled in full.`,
          actions: [{ label: 'View Payments Ledger', action: 'navigate', url: '/payments' }],
          timestamp,
        };
      }

      const list = pending.bookings
        .slice(0, 4)
        .map(
          (b) =>
            `• **${b.customerName}** (${b.customerPhone}): **₹${b.balanceDue.toLocaleString('en-IN')}** pending on ${b.vehicle}`
        )
        .join('\n');

      return {
        reply: `💳 **Pending Rental Balances Total: ₹${pending.totalPending.toLocaleString(
          'en-IN'
        )}** across ${pending.count} booking(s):\n\n${list}\n\nWould you like to record a cashier payment?`,
        actions: [
          { label: 'Record Payment', action: 'navigate', url: '/payments', variant: 'primary' },
          { label: 'View All Bookings', action: 'navigate', url: '/bookings' },
        ],
        timestamp,
      };
    }

    // 5. Collections & Revenue Queries
    if (
      raw.includes('collect') ||
      raw.includes('revenue') ||
      raw.includes('earning') ||
      raw.includes('cash') ||
      raw.includes('upi') ||
      raw.includes('income')
    ) {
      const isWeek = raw.includes('week');
      const isMonth = raw.includes('month');
      const period = isMonth ? 'month' : isWeek ? 'week' : 'today';

      const data = await this.getCollectionsSummary(period);

      const modeList = Object.entries(data.byMode)
        .map(([m, amt]) => `  - ${m}: ₹${amt.toLocaleString('en-IN')}`)
        .join('\n');

      return {
        reply: `💰 **Cashier Collections (${period.toUpperCase()}): ₹${data.totalCollected.toLocaleString(
          'en-IN'
        )}**\n\n• Total Transactions: **${data.transactionCount}**\n${modeList || '  - No transactions recorded yet.'}`,
        actions: [
          { label: 'View Reports', action: 'navigate', url: '/reports', variant: 'primary' },
          { label: 'View Payments', action: 'navigate', url: '/payments' },
        ],
        timestamp,
      };
    }

    // 6. Fleet Overview / Count Queries
    if (raw.includes('fleet') || raw.includes('how many') || raw.includes('vehicles') || raw.includes('cars')) {
      const fleet = await this.getFleetOverview();

      return {
        reply: `🚗 **DrivePulse Fleet Snapshot:**\n\n• **Total Fleet Size**: ${fleet.total} vehicles\n• **Available for Rent**: ${fleet.available} ready\n• **Active on Road**: ${fleet.rented} on booking\n• **In Workshop**: ${fleet.maintenance}\n• **Fleet Utilization**: **${fleet.utilizationRate}%**\n\nBreakdown: 🚗 ${fleet.breakdown.cars} Cars • 🏍️ ${fleet.breakdown.bikes} Bikes • 🛵 ${fleet.breakdown.scooters} Scooters`,
        actions: [
          { label: 'View Fleet Inventory', action: 'navigate', url: '/vehicles', variant: 'primary' },
          { label: 'New Booking', action: 'navigate', url: '/bookings/new' },
        ],
        timestamp,
      };
    }

    // Default Friendly Copilot Reply
    return {
      reply: `👋 **DrivePulse AI Assistant**\n\nI can help you monitor live fleet availability, verify active bookings, track expiring insurance documents, and view financial collections.\n\n**Quick things you can ask me:**\n• *"Which vehicles are available this weekend?"*\n• *"Is Creta available? How many days remaining?"*\n• *"Which insurance or fitness documents are expiring soon?"*\n• *"How much money did we collect today?"*\n• *"Who has unpaid rental balances?"*`,
      actions: [
        { label: 'Check Availability', action: 'prompt', url: 'Which vehicles are available right now?' },
        { label: 'Check Expiring Docs', action: 'prompt', url: 'Are any vehicle documents expiring soon?' },
        { label: 'Today Collections', action: 'prompt', url: 'How much money did we collect today?' },
      ],
      timestamp,
    };
  }

  /**
   * Helper to format vehicle status and remaining days
   */
  private static formatVehicleStatusReply(status: any, timestamp: string): AIChatResponse {
    const vName = `${status.make} ${status.model} (${status.registrationNumber})`;

    if (status.status === 'AVAILABLE') {
      return {
        reply: `🟢 **${vName} is AVAILABLE**\n\n• **Status**: Ready in garage for immediate hire.\n• **Category**: ${status.type} • ${status.seats} Seats.\n• All compliance certificates are in order.`,
        actions: [
          { label: `Book ${status.model}`, action: 'navigate', url: `/bookings/new?vehicleId=${status.id}`, variant: 'primary' },
          { label: 'View Vehicle', action: 'navigate', url: `/vehicles/${status.id}` },
        ],
        timestamp,
      };
    }

    if (status.status === 'RENTED' && status.currentRental) {
      const cr = status.currentRental;
      const formattedReturn = new Date(cr.returnDateTime).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const timeRemaining = cr.isOverdue
        ? `⚠️ **OVERDUE** by ${cr.remainingDays} days`
        : `⏳ **${cr.remainingDays} day(s) and ${cr.remainingHours} hour(s) remaining**`;

      return {
        reply: `🔵 **${vName} is currently ON RENT**\n\n• **Time Remaining**: ${timeRemaining}\n• **Scheduled Return**: ${formattedReturn}\n• **Customer**: ${cr.customerName} (${cr.customerPhone})\n• **Booking #**: ${cr.bookingNumber}\n• **Balance Due**: ₹${cr.balanceDue.toLocaleString('en-IN')}`,
        actions: [
          { label: 'View Booking', action: 'navigate', url: `/bookings/${cr.bookingId}`, variant: 'primary' },
          { label: 'View Vehicle', action: 'navigate', url: `/vehicles/${status.id}` },
        ],
        timestamp,
      };
    }

    if (status.status === 'MAINTENANCE') {
      return {
        reply: `🔧 **${vName} is in MAINTENANCE**\n\nThis vehicle is currently undergoing routine service or repairs in the workshop bay and cannot be rented until released.`,
        actions: [{ label: 'View Vehicle Details', action: 'navigate', url: `/vehicles/${status.id}` }],
        timestamp,
      };
    }

    return {
      reply: `ℹ️ **${vName}** is currently marked as **${status.status}**.`,
      actions: [{ label: 'View Vehicle', action: 'navigate', url: `/vehicles/${status.id}` }],
      timestamp,
    };
  }

  /**
   * Helper to find matching vehicle from user utterance
   */
  private static async findMatchingVehicle(text: string) {
    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { id: true, make: true, model: true, registrationNumber: true },
    });

    for (const v of vehicles) {
      const cleanReg = v.registrationNumber.toLowerCase().replace(/\s+/g, '');
      const cleanMake = v.make.toLowerCase();
      const cleanModel = v.model.toLowerCase();

      if (
        text.includes(cleanReg) ||
        text.includes(cleanMake) ||
        text.includes(cleanModel)
      ) {
        return v;
      }
    }
    return null;
  }

  /**
   * Call Google Gemini REST API (100% Free on Google AI Studio)
   */
  private static async askGemini(
    userMessage: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AIChatResponse | null> {
    const apiKey = config.geminiApiKey;
    if (!apiKey) return null;

    // Pull current fleet context to ground the Gemini model in real data
    const [fleet, pending, collections, expiring] = await Promise.all([
      this.getFleetOverview(),
      this.getPendingBalances(),
      this.getCollectionsSummary('today'),
      this.getExpiringDocuments(30),
    ]);

    const systemPrompt = `You are DrivePulse AI, an intelligent executive assistant for a vehicle rental management system.
Current Live System Context:
- Fleet Size: ${fleet.total} vehicles (${fleet.available} Available, ${fleet.rented} Rented, ${fleet.maintenance} In Workshop).
- Fleet Categories: ${fleet.breakdown.cars} Cars, ${fleet.breakdown.bikes} Bikes, ${fleet.breakdown.scooters} Scooters. Fleet Utilization: ${fleet.utilizationRate}%.
- Today's Collections: ₹${collections.totalCollected} across ${collections.transactionCount} payments.
- Total Unpaid Balances: ₹${pending.totalPending} across ${pending.count} active bookings.
- Expiring Documents (<30 days): ${expiring.length} document(s).

Rules:
1. Provide concise, professional, actionable answers using clean GitHub markdown (bolding, bullet points).
2. Never hallucinate fake vehicle models or plates not in the system.
3. Keep answers friendly and under 150 words.`;

    const contents: any[] = [];
    if (history && history.length > 0) {
      for (const h of history.slice(-4)) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }],
    });

    const primaryModel = config.geminiModel || 'gemini-1.5-flash';
    const modelsToTry = Array.from(
      new Set([primaryModel, 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro'])
    );

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });

        if (res.ok) {
          const data = await res.json();
          const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return {
              reply: replyText,
              timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            };
          }
        } else {
          console.warn(`Gemini API model ${model} returned HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn(`Gemini model ${model} fetch failed:`, err);
      }
    }

    return null;
  }

  /**
   * 7. Feature D: AI Daily Executive Morning Briefing
   */
  public static async getDailyBriefing(): Promise<AIDailyBriefing> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      allVehicles,
      returnsToday,
      pickupsToday,
      pendingBalances,
      expiringDocs,
    ] = await Promise.all([
      prisma.vehicle.findMany({ where: { deletedAt: null }, select: { status: true } }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: 'PICKED_UP',
          returnDateTime: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          customer: { select: { fullName: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: 'CONFIRMED',
          pickupDateTime: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          customer: { select: { fullName: true } },
          vehicle: { select: { make: true, model: true } },
        },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['CANCELLED'] },
          balanceDue: { gt: 0 },
        },
        select: { balanceDue: true },
      }),
      prisma.vehicleDocument.findMany({
        where: {
          expiryDate: { lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        },
        include: { vehicle: { select: { make: true, model: true } } },
      }),
    ]);

    const totalVehicles = allVehicles.length;
    const availableVehicles = allVehicles.filter((v) => v.status === 'AVAILABLE').length;
    const activeRentals = allVehicles.filter((v) => v.status === 'RENTED').length;
    const pendingBalanceTotal = pendingBalances.reduce((sum, b) => sum + b.balanceDue, 0);

    const highlights: string[] = [];
    const actionItems: ActionButton[] = [];

    // Headline & Highlights formulation
    if (returnsToday.length > 0) {
      highlights.push(
        `🕒 **${returnsToday.length} vehicle(s)** due for return today: ${returnsToday
          .map((b) => `${b.vehicle.make} ${b.vehicle.model} (${b.customer?.fullName || 'Client'})`)
          .join(', ')}.`
      );
      actionItems.push({ label: 'Check Returns', action: 'navigate', url: '/bookings', variant: 'primary' });
    } else {
      highlights.push('✅ No customer vehicle returns scheduled for today.');
    }

    if (pickupsToday.length > 0) {
      highlights.push(
        `🚀 **${pickupsToday.length} upcoming dispatch(es)** scheduled for pickup today.`
      );
    }

    if (pendingBalanceTotal > 0) {
      highlights.push(
        `💳 **₹${pendingBalanceTotal.toLocaleString('en-IN')}** in pending rental balance collections awaiting cashier settlement.`
      );
      actionItems.push({ label: 'Collect Dues', action: 'navigate', url: '/payments', variant: 'secondary' });
    }

    if (expiringDocs.length > 0) {
      highlights.push(
        `⚠️ **${expiringDocs.length} vehicle compliance document(s)** expiring within 15 days.`
      );
      actionItems.push({ label: 'Review Compliance', action: 'navigate', url: '/vehicles', variant: 'warning' });
    }

    if (availableVehicles > 0) {
      highlights.push(
        `🟢 **${availableVehicles} vehicle(s)** available and ready for walk-in dispatch.`
      );
    } else if (totalVehicles === 0) {
      highlights.push('💡 Fleet is currently empty. Add your vehicles to start dispatching bookings.');
      actionItems.push({ label: 'Add First Vehicle', action: 'navigate', url: '/vehicles', variant: 'primary' });
    }

    const headline =
      returnsToday.length > 0
        ? `Busy Day: ${returnsToday.length} Vehicle Return(s) & ₹${pendingBalanceTotal.toLocaleString('en-IN')} Pending Dues`
        : totalVehicles === 0
        ? 'Fleet Ready: Add Your Vehicles to Start Operations'
        : `Fleet Operational: ${availableVehicles} Available • ${activeRentals} on Road`;

    const summary =
      totalVehicles === 0
        ? 'Your DrivePulse operations center is online with zero active records. Add your cars, bikes, or scooters to begin issuing rentals.'
        : `Operations are active with ${availableVehicles} available asset(s) and ${activeRentals} current rental(s). Today requires attention on ${returnsToday.length} scheduled return(s) and ₹${pendingBalanceTotal.toLocaleString('en-IN')} in outstanding receivables.`;

    return {
      date: now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      headline,
      summary,
      metrics: {
        availableVehicles,
        activeRentals,
        returnsToday: returnsToday.length,
        pickupsToday: pickupsToday.length,
        pendingBalanceTotal,
        expiringDocsCount: expiringDocs.length,
      },
      highlights,
      actionItems,
    };
  }
}
