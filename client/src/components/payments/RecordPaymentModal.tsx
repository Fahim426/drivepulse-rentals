import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, DollarSign, CreditCard, Wallet, Smartphone, Building, FileCheck } from 'lucide-react';
import { PaymentMode, PaymentType } from '../../types/payment';
import { useToast } from '../common/Toast';

interface BookingSummary {
  id: string;
  bookingNumber: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  securityDeposit: number;
  status: string;
  customer: {
    fullName: string;
    phone: string;
  };
  vehicle: {
    make: string;
    model: string;
    registrationNumber: string;
  };
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBookingId?: string;
}

const MODES: Array<{ id: PaymentMode; label: string; icon: any }> = [
  { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
  { id: 'CASH', label: 'Cash Counter', icon: Wallet },
  { id: 'CARD', label: 'Debit/Credit Card', icon: CreditCard },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer (IMPS/NEFT)', icon: Building },
  { id: 'CHEQUE', label: 'Bank Cheque', icon: FileCheck },
];

const TYPES: Array<{ id: PaymentType; label: string }> = [
  { id: 'BALANCE', label: 'Rental Balance Payment' },
  { id: 'ADVANCE', label: 'Advance Deposit' },
  { id: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
  { id: 'EXTRA_KM', label: 'Extra Kilometres' },
  { id: 'DAMAGE_CHARGE', label: 'Damage Assessment' },
  { id: 'LATE_FEE', label: 'Late Return Fee' },
  { id: 'REFUND', label: 'Customer Refund' },
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultBookingId,
}) => {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState(defaultBookingId || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [mode, setMode] = useState<PaymentMode>('UPI');
  const [type, setType] = useState<PaymentType>('BALANCE');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load active and confirmed bookings for payment
  useEffect(() => {
    fetch('/api/bookings?limit=50')
      .then((res) => res.json())
      .then((data) => {
        const list = data.bookings || [];
        setBookings(list);
        if (!selectedBookingId && list.length > 0) {
          setSelectedBookingId(list[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  // Auto populate amount with balance due when booking changes if not set
  useEffect(() => {
    if (selectedBooking && selectedBooking.balanceDue > 0 && amount === '') {
      setAmount(selectedBooking.balanceDue);
    }
  }, [selectedBookingId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingId) {
      addToast('Please select a booking to apply this payment', 'error');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      addToast('Please enter a valid payment amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          amount: Number(amount),
          mode,
          type,
          transactionReference: transactionReference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record payment');
      }

      addToast(`Payment recorded! Receipt: ${data.receiptNumber}`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Payment Transaction
              </h3>
              <p className="text-xs text-slate-500">
                Generate official cashier receipt and adjust booking ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Booking Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Booking Reference <span className="text-rose-500">*</span>
            </label>
            <select
              id="booking-select"
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber} • {b.customer.fullName} • {b.vehicle.make} {b.vehicle.model} ({b.vehicle.registrationNumber}) [Due: ₹{b.balanceDue.toLocaleString('en-IN')}]
                </option>
              ))}
            </select>
          </div>

          {/* Selected Booking Financial Status Card */}
          {selectedBooking && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white">
                  Customer: {selectedBooking.customer.fullName} ({selectedBooking.customer.phone})
                </span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                  {selectedBooking.vehicle.registrationNumber}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Charges:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{selectedBooking.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Advance Paid:</span>
                  <span className="font-bold text-emerald-600">
                    ₹{selectedBooking.advancePaid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Balance Due:</span>
                  <span className="font-bold text-amber-600">
                    ₹{selectedBooking.balanceDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input with Quick Fill Balance */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Amount (INR) <span className="text-rose-500">*</span>
              </label>
              {selectedBooking && selectedBooking.balanceDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(selectedBooking.balanceDue)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  Pay Full Balance (₹{selectedBooking.balanceDue.toLocaleString('en-IN')})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                id="payment-amount-input"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className="w-full pl-8 pr-4 py-2.5 text-base font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Payment Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Purpose / Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentType)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Payment Method / Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="text-xs truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transaction Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Reference #
              </label>
              <input
                id="payment-ref-input"
                type="text"
                placeholder="UPI UTR, Card Auth Code, Cheque #"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Internal Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="Counter remarks, voucher ref..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              id="submit-record-payment-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                'Recording Payment...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Record Payment & Issue Receipt
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
