import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Car,
  Key,
  CalendarCheck,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Activity,
  User,
  Plus,
} from 'lucide-react';

interface DashboardData {
  fleet: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    utilizationRate: number;
    fuelBreakdown: Array<{ fuel: string; count: number }>;
  };
  financials: {
    todayCollections: number;
    monthRevenue: number;
    pendingReceivables: number;
    activeDepositsHeld: number;
  };
  operations: {
    todayPickupsCount: number;
    todayReturnsCount: number;
    overdueReturnsCount: number;
    expiringDocumentsCount: number;
    todayPickups: Array<any>;
    todayReturns: Array<any>;
    overdueReturns: Array<any>;
    expiringDocuments: Array<any>;
  };
  revenueTrend: Array<{ date: string; label: string; collections: number }>;
  recentActivities: Array<any>;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = () => {
    setIsLoading(true);
    setError(null);
    fetch('/api/dashboard/summary')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard data');
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Error loading dashboard metrics');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading real-time executive fleet metrics...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/40 my-8">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Unable to load dashboard</h3>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
        <button
          onClick={loadSummary}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Calculate SVG chart coordinates for 14-day trend
  const maxCollection = Math.max(...data.revenueTrend.map((d) => d.collections), 10000);
  const chartHeight = 120;
  const chartWidth = 500;
  const points = data.revenueTrend.map((d, idx) => {
    const x = (idx / (data.revenueTrend.length - 1)) * chartWidth;
    const y = chartHeight - (d.collections / maxCollection) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  });
  const pathD = `M 0,${chartHeight} L ${points.join(' L ')} L ${chartWidth},${chartHeight} Z`;
  const strokeD = `M ${points.join(' L ')}`;

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Live Action Bar */}
      <div className="p-6 lg:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white relative overflow-hidden shadow-xl border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DrivePulse Executive Operations Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {user?.fullName}!
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 mt-1.5 leading-relaxed">
              Real-time fleet operations overview • {data.fleet.available} available vehicles • {data.fleet.rented} active on rent • {data.fleet.utilizationRate}% fleet utilization
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/bookings/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              New Rental Booking
            </Link>
            <Link
              to="/payments"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md border border-white/10 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </Link>
          </div>
        </div>

        {/* Ambient subtle vehicle watermark */}
        <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none text-white">
          <Car className="w-72 h-72" />
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Fleet Utilization */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Fleet Utilization</span>
            <span className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl">
              <Car className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {data.fleet.utilizationRate}%
              </h3>
              <span className="text-xs font-bold text-emerald-600">
                {data.fleet.rented}/{data.fleet.total} On Rent
              </span>
            </div>
            {/* Utilization progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data.fleet.utilizationRate)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-medium">
              <span>{data.fleet.available} Available</span>
              <span>{data.fleet.maintenance} In Workshop</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Net Collections */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Collections</span>
            <span className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{data.financials.todayCollections.toLocaleString('en-IN')}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Cashier receipts collected today</p>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Month to Date:</span>
              <span className="font-bold text-emerald-600">₹{data.financials.monthRevenue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Security Deposits Held */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Security Deposits</span>
            <span className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-2xl">
              <ShieldCheck className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400">
                ₹{data.financials.activeDepositsHeld.toLocaleString('en-IN')}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Safely held across active rentals</p>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Customer Ledger:</span>
              <Link to="/payments" className="font-bold text-purple-600 hover:underline">View Ledger &rarr;</Link>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Receivables */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Balance Receivables</span>
            <span className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                ₹{data.financials.pendingReceivables.toLocaleString('en-IN')}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Pending collection on return</p>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Total Invoiced:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">Active Pipeline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Urgent Action Center (Alerts & Schedule) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Operations Banner: Overdue / Due Returns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Operations Dispatch & Returns Schedule
                  </h3>
                  <p className="text-xs text-slate-400">
                    Active pick-ups, scheduled returns, and overdue tracking
                  </p>
                </div>
              </div>
              <Link
                to="/bookings"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                All Bookings <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Overdue alert if any */}
            {data.operations.overdueReturnsCount > 0 && (
              <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    {data.operations.overdueReturnsCount} Rental(s) Overdue for Return!
                  </h4>
                  <div className="mt-1 space-y-1">
                    {data.operations.overdueReturns.map((b) => (
                      <div key={b.id} className="text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
                        <span>{b.bookingNumber} • {b.customer.fullName} ({b.vehicle.registrationNumber})</span>
                        <Link to={`/bookings/${b.id}`} className="font-bold underline text-rose-900 dark:text-rose-200">
                          Complete Return &rarr;
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pickups and Returns side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Today's Pickups */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    Scheduled Pickups Today ({data.operations.todayPickupsCount})
                  </span>
                </div>
                {data.operations.todayPickups.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No pickups scheduled for today</p>
                ) : (
                  <div className="space-y-2">
                    {data.operations.todayPickups.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          <span className="font-bold text-blue-600 block">{b.bookingNumber}</span>
                          <span className="text-slate-700 dark:text-slate-300">{b.customer.fullName}</span>
                        </div>
                        <Link
                          to={`/bookings/${b.id}`}
                          className="px-2 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg shadow-sm"
                        >
                          Handover
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Returns */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                    Returns Due Today ({data.operations.todayReturnsCount})
                  </span>
                </div>
                {data.operations.todayReturns.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No returns due today</p>
                ) : (
                  <div className="space-y-2">
                    {data.operations.todayReturns.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          <span className="font-bold text-blue-600 block">{b.bookingNumber}</span>
                          <span className="text-slate-700 dark:text-slate-300">{b.customer.fullName}</span>
                        </div>
                        <Link
                          to={`/bookings/${b.id}`}
                          className="px-2 py-1 text-[11px] font-bold bg-blue-600 text-white rounded-lg shadow-sm"
                        >
                          Check-in
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revenue Trend 14-day Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  14-Day Revenue Collections Trend
                </h3>
                <p className="text-xs text-slate-400">Cashier receipts collected over the last 14 days</p>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                Max: ₹{maxCollection.toLocaleString('en-IN')}
              </span>
            </div>

            {/* SVG Area Chart */}
            <div className="relative w-full overflow-hidden">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path d={pathD} fill="url(#revenueGradient)" />
                {/* Trend line */}
                <path d={strokeD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                {/* Data point dots */}
                {data.revenueTrend.map((d, idx) => {
                  const x = (idx / (data.revenueTrend.length - 1)) * chartWidth;
                  const y = chartHeight - (d.collections / maxCollection) * (chartHeight - 20) - 10;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r="3.5"
                      className="fill-white stroke-blue-600 stroke-2 hover:r-5 transition-all cursor-pointer"
                    >
                      <title>{`${d.label}: ₹${d.collections.toLocaleString('en-IN')}`}</title>
                    </circle>
                  );
                })}
              </svg>
              {/* X-axis date labels */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
                {data.revenueTrend.filter((_, idx) => idx % 2 === 0).map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Expiring Compliance Alerts & Live Audit Feed */}
        <div className="space-y-4">
          {/* Expiring Compliance Documents Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Compliance Expirations
                  </h3>
                  <p className="text-[11px] text-slate-400">Within next 15 days</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                data.operations.expiringDocumentsCount > 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {data.operations.expiringDocumentsCount} Alerts
              </span>
            </div>

            {data.operations.expiringDocuments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                All vehicle compliance documents are active and up-to-date!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {data.operations.expiringDocuments.map((doc) => {
                  const daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft < 0;

                  return (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                        isExpired
                          ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                          : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{doc.type}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {doc.vehicle.registrationNumber}
                          </span>
                        </div>
                        <span className="text-[10px] block opacity-80">
                          {isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `Expires in ${daysLeft} days`}
                        </span>
                      </div>
                      <Link
                        to={`/vehicles/${doc.vehicle.id}`}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 border shadow-xs"
                      >
                        Renew
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fleet Composition by Fuel Type */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Fleet Composition
            </h3>
            <div className="space-y-2">
              {data.fleet.fuelBreakdown.map((item) => (
                <div key={item.fuel} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{item.fuel}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${(item.count / data.fleet.total) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 w-4 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Recent Activities Audit Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-600" />
                Recent System Activity
              </h3>
              <Link to="/audit-logs" className="text-[11px] font-bold text-blue-600 hover:underline">
                Full Log
              </Link>
            </div>
            <div className="space-y-2.5">
              {data.recentActivities.slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {log.user?.fullName || 'System'}: <span className="font-normal">{log.action} {log.entity}</span>
                    </p>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
