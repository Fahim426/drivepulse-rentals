import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Download,
  FileText,
  CreditCard,
  Wallet,
  Smartphone,
  Building,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { PaymentRecord, InvoiceRecord, PaymentMode, PaymentType } from '../../types/payment';
import { RecordPaymentModal } from '../../components/payments/RecordPaymentModal';
import { GenerateInvoiceModal } from '../../components/payments/GenerateInvoiceModal';

export const PaymentListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'INVOICES' | 'DEPOSITS'>('PAYMENTS');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (modeFilter !== 'ALL') params.set('mode', modeFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PAYMENTS' || activeTab === 'DEPOSITS') {
      fetchPayments();
    } else {
      fetchInvoices();
    }
  }, [activeTab, modeFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'INVOICES') fetchInvoices();
    else fetchPayments();
  };

  // KPI Computations
  const totalCollections = payments.reduce((sum, p) => (p.type !== 'REFUND' ? sum + p.amount : sum - p.amount), 0);
  const totalAdvances = payments.filter((p) => p.type === 'ADVANCE').reduce((sum, p) => sum + p.amount, 0);
  const totalDeposits = payments.filter((p) => p.type === 'SECURITY_DEPOSIT').reduce((sum, p) => sum + p.amount, 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Payments, Receipts & Invoicing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete cashier ledger, GST Tax Invoices (SAC 996601), and security deposit reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="generate-tax-invoice-btn"
            onClick={() => setIsGenerateInvoiceOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Generate Tax Invoice
          </button>

          <button
            id="record-payment-btn"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-2xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Net Collections</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              ₹{totalCollections.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Advance Deposits</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
              ₹{totalAdvances.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Invoiced (GST)</span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              ₹{totalInvoiced.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-2xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Recorded Payments</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {payments.length} Receipts
            </span>
          </div>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {[
              { id: 'PAYMENTS', label: 'Payments & Cashier Receipts' },
              { id: 'INVOICES', label: 'GST Tax Invoices' },
              { id: 'DEPOSITS', label: 'Security Deposit Ledger' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id.toLowerCase()}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt, invoice, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </form>
        </div>

        {/* Tab 1: Payments & Cashier Receipts */}
        {activeTab === 'PAYMENTS' && (
          <div>
            {/* Filter Pills */}
            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-400 font-semibold px-2">Method:</span>
              {['ALL', 'UPI', 'CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].map((m) => (
                <button
                  key={m}
                  onClick={() => setModeFilter(m)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    modeFilter === m
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading payment ledger...</div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Receipt # / Date</th>
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Method & Purpose</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Cashier Staff</th>
                      <th className="py-3 px-4 text-right">Receipt PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {p.receiptNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {new Date(p.paymentDate).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {p.booking.bookingNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {p.booking.vehicle.make} {p.booking.vehicle.model}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {p.booking.customer.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400">{p.booking.customer.phone}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {p.mode}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                              {p.type}
                            </span>
                          </div>
                          {p.transactionReference && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">
                              Ref: {p.transactionReference}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-black text-sm text-slate-900 dark:text-white">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {p.receivedByUser?.fullName || 'Cashier'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`/api/payments/${p.id}/receipt-pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-lg shadow-sm transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: GST Tax Invoices */}
        {activeTab === 'INVOICES' && (
          <div>
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No GST tax invoices generated yet. Use the "Generate Tax Invoice" button above to issue an invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Invoice # / Date</th>
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Billed To Customer</th>
                      <th className="py-3 px-4">Taxable Subtotal</th>
                      <th className="py-3 px-4">CGST (9%) + SGST (9%)</th>
                      <th className="py-3 px-4">Total Invoice Value</th>
                      <th className="py-3 px-4 text-right">Tax Invoice PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {inv.booking.bookingNumber}
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {inv.booking.vehicle.registrationNumber}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {inv.booking.customer.fullName}
                          </span>
                          {inv.customerGstin ? (
                            <span className="font-mono text-[10px] text-blue-600 font-semibold block">
                              GSTIN: {inv.customerGstin}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">B2C Retail</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                          ₹{inv.subtotal.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          ₹{inv.cgstAmount.toFixed(2)} + ₹{inv.sgstAmount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-black text-sm text-blue-600 dark:text-blue-400">
                          ₹{inv.totalAmount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Tax Invoice PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Security Deposit & Deductions Ledger */}
        {activeTab === 'DEPOSITS' && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <strong className="block text-sm text-slate-900 dark:text-white">
                  Security Deposit Management Protocol
                </strong>
                Security deposits are held in a ring-fenced escrow account and reconciled during the Return Inspection checklist. Deductions for excess kilometres, fuel shortfalls, or accidental damages are debited against this deposit, and the net surplus is refunded within 48 hours.
              </div>
            </div>

            {/* Deposits list from payments */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Receipt / Date</th>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments
                    .filter((p) => p.type === 'SECURITY_DEPOSIT' || p.type === 'REFUND' || p.type === 'EXTRA_KM')
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-4 text-blue-600 font-bold">{p.booking.bookingNumber}</td>
                        <td className="py-3 px-4">{p.booking.customer.fullName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.type === 'REFUND'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`/api/payments/${p.id}/receipt-pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <Download className="w-4 h-4 inline" />
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={() => {
          fetchPayments();
          setIsRecordPaymentOpen(false);
        }}
      />

      {/* Generate Tax Invoice Modal */}
      <GenerateInvoiceModal
        isOpen={isGenerateInvoiceOpen}
        onClose={() => setIsGenerateInvoiceOpen(false)}
        onSuccess={() => {
          fetchInvoices();
          setIsGenerateInvoiceOpen(false);
        }}
      />
    </div>
  );
};
