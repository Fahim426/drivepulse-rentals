import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Car,
  Wrench,
  Users,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const ReportsPage: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'FLEET' | 'MAINTENANCE' | 'CUSTOMERS'>('REVENUE');

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Data states
  const [isLoading, setIsLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);

  // Fetch logic based on active tab
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      if (activeTab === 'REVENUE') {
        if (modeFilter !== 'ALL') params.set('mode', modeFilter);
        if (typeFilter !== 'ALL') params.set('type', typeFilter);
        const res = await fetch(`/api/reports/revenue?${params.toString()}`);
        if (res.ok) setRevenueData(await res.json());
      } else if (activeTab === 'FLEET') {
        const res = await fetch(`/api/reports/fleet-utilization?${params.toString()}`);
        if (res.ok) setFleetData(await res.json());
      } else if (activeTab === 'MAINTENANCE') {
        const res = await fetch(`/api/reports/maintenance?${params.toString()}`);
        if (res.ok) setMaintenanceData(await res.json());
      } else if (activeTab === 'CUSTOMERS') {
        const res = await fetch(`/api/reports/customers?${params.toString()}`);
        if (res.ok) setCustomerData(await res.json());
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, modeFilter, typeFilter]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('format', 'csv');

    let endpoint = '';
    if (activeTab === 'REVENUE') {
      if (modeFilter !== 'ALL') params.set('mode', modeFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      endpoint = `/api/reports/revenue?${params.toString()}`;
    } else if (activeTab === 'FLEET') {
      endpoint = `/api/reports/fleet-utilization?${params.toString()}`;
    } else if (activeTab === 'MAINTENANCE') {
      endpoint = `/api/reports/maintenance?${params.toString()}`;
    } else if (activeTab === 'CUSTOMERS') {
      endpoint = `/api/reports/customers?${params.toString()}`;
    }

    window.open(endpoint, '_blank');
    addToast('CSV export generated and downloading...', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Reports & Business Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Auditable revenue statements, fleet utilization, operating expense ratios, and customer CLV.
          </p>
        </div>

        <button
          id="export-csv-btn"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Export Report to CSV
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            {[
              { id: 'REVENUE', label: 'Revenue & Collections', icon: DollarSign },
              { id: 'FLEET', label: 'Fleet Performance & Utilization', icon: Car },
              { id: 'MAINTENANCE', label: 'Maintenance & Expenses', icon: Wrench },
              { id: 'CUSTOMERS', label: 'Customer Intelligence', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tab-report-${tab.id.toLowerCase()}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Date Range & Filter Controls */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
              />
            </div>

            <button
              onClick={fetchData}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Tab 1: Revenue & Collections Report */}
        {activeTab === 'REVENUE' && (
          <div className="p-6 space-y-6">
            {/* KPI Summary Cards */}
            {revenueData?.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold block">
                    Gross Collections
                  </span>
                  <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1 block">
                    ₹{revenueData.summary.totalCollected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                  <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold block">
                    Customer Refunds
                  </span>
                  <span className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-1 block">
                    ₹{revenueData.summary.totalRefunds.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold block">
                    Net Rental Revenue
                  </span>
                  <span className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1 block">
                    ₹{revenueData.summary.netCollections.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-semibold block">Total Transactions</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                    {revenueData.summary.totalTransactions} Receipts
                  </span>
                </div>
              </div>
            )}

            {/* Mode Breakdown Pills */}
            {revenueData?.summary?.byMode && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Collections by Payment Channel:
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(revenueData.summary.byMode).map(([mode, amt]: [string, any]) => (
                    <span
                      key={mode}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span className="font-mono text-blue-600 font-bold">{mode}:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{Number(amt).toLocaleString('en-IN')}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Receipt # / Date</th>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Mode / Type</th>
                    <th className="py-3 px-4">Amount (INR)</th>
                    <th className="py-3 px-4">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {revenueData?.payments?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {p.receiptNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600">
                        {p.booking.bookingNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold block text-slate-800 dark:text-slate-200">
                          {p.booking.customer.fullName}
                        </span>
                        <span className="text-[11px] text-slate-400">{p.booking.customer.phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                          {p.booking.vehicle.make} {p.booking.vehicle.model}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {p.booking.vehicle.registrationNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 font-bold mr-1">
                          {p.mode}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.receivedByUser?.fullName || 'Cashier'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Fleet Performance & Utilization Report */}
        {activeTab === 'FLEET' && (
          <div className="p-6 space-y-6">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Status / Odo</th>
                    <th className="py-3 px-4">Daily Rate</th>
                    <th className="py-3 px-4">Bookings</th>
                    <th className="py-3 px-4">Rental Days</th>
                    <th className="py-3 px-4">Revenue (INR)</th>
                    <th className="py-3 px-4">Expenses (INR)</th>
                    <th className="py-3 px-4">Operating Margin</th>
                    <th className="py-3 px-4">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fleetData.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {v.make} {v.model}
                        </span>
                        <span className="font-mono text-[11px] text-blue-600 font-bold">
                          {v.registrationNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          {v.status}
                        </span>
                        <span className="text-[11px] text-slate-400">{v.odometer} KM</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        ₹{v.dailyRate}
                      </td>
                      <td className="py-3 px-4 font-semibold">{v.totalBookings} rentals</td>
                      <td className="py-3 px-4 font-semibold">{v.totalRentalDays} days</td>
                      <td className="py-3 px-4 font-black text-emerald-600">
                        ₹{v.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-rose-500">
                        ₹{v.totalExpenses.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        ₹{v.netProfit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, v.utilizationRate)}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs">{v.utilizationRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Maintenance & Expenses Report */}
        {activeTab === 'MAINTENANCE' && (
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold block">
                  Total Fleet Maintenance Expenditures
                </span>
                <span className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1 block">
                  ₹{(maintenanceData?.totalCost || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl">
                {maintenanceData?.totalRecords || 0} Service Invoices
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Service Type</th>
                    <th className="py-3 px-4">Odometer</th>
                    <th className="py-3 px-4">Cost (INR)</th>
                    <th className="py-3 px-4">Vendor & Invoice</th>
                    <th className="py-3 px-4">Work Performed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {maintenanceData?.records?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono">
                        {new Date(r.serviceDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {r.vehicle.make} {r.vehicle.model}
                        </span>
                        <span className="font-mono text-[10px] text-blue-600 font-bold">
                          {r.vehicle.registrationNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                          {r.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{r.odometerAtService} KM</td>
                      <td className="py-3 px-4 font-black text-rose-600">
                        ₹{r.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block">{r.vendorName || 'Authorized Workshop'}</span>
                        <span className="text-[10px] text-slate-400">{r.invoiceNumber || 'Direct Cash'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {r.description || 'Periodic Inspection & Lubrication'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Customer Intelligence */}
        {activeTab === 'CUSTOMERS' && (
          <div className="p-6 space-y-6">
            {customerData?.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                  <span className="text-xs text-blue-700 font-semibold block">Total Registered Customers</span>
                  <span className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1 block">
                    {customerData.summary.totalCustomers}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-xs text-emerald-700 font-semibold block">Repeat Customers</span>
                  <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1 block">
                    {customerData.summary.repeatCustomersCount} ({customerData.summary.repeatRatePercentage}%)
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                  <span className="text-xs text-purple-700 font-semibold block">KYC Verified</span>
                  <span className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1 block">
                    {customerData.summary.verifiedCount}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                  <span className="text-xs text-rose-700 font-semibold block">Blacklisted</span>
                  <span className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-1 block">
                    {customerData.summary.blacklistedCount}
                  </span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Total Rentals</th>
                    <th className="py-3 px-4">Lifetime Spend (INR)</th>
                    <th className="py-3 px-4">KYC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerData?.customers?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {c.fullName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block">{c.phone}</span>
                        <span className="text-[11px] text-slate-400">{c.email}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{c.city}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">{c.totalBookings} bookings</td>
                      <td className="py-3 px-4 font-black text-emerald-600">
                        ₹{c.totalSpent.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        {c.isBlacklisted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Blacklisted
                          </span>
                        ) : c.hasVerifiedKyc ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            KYC Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                            KYC Incomplete
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
