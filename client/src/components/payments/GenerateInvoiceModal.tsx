import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, ShieldCheck, Download, AlertCircle } from 'lucide-react';
import { useToast } from '../common/Toast';

interface BookingSummary {
  id: string;
  bookingNumber: string;
  totalAmount: number;
  baseRate: number;
  rentalDays: number;
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

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBookingId?: string;
}

export const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultBookingId,
}) => {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState(defaultBookingId || '');
  const [customerGstin, setCustomerGstin] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (!isOpen) return null;

  // Approximate live preview
  const taxableSubtotal = selectedBooking
    ? Math.max(0, (selectedBooking.totalAmount / 1.18) - discount)
    : 0;
  const cgst = taxableSubtotal * 0.09;
  const sgst = taxableSubtotal * 0.09;
  const totalInvoice = taxableSubtotal + cgst + sgst;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingId) {
      addToast('Please select a booking to invoice', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          customerGstin: customerGstin.trim().toUpperCase() || undefined,
          discount: Number(discount || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate tax invoice');
      }

      addToast(`GST Tax Invoice ${data.invoiceNumber} generated!`, 'success');
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
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate GST Tax Invoice
              </h3>
              <p className="text-xs text-slate-500">
                Official SAC 996601 passenger rental tax invoice
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Booking Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Booking Reference <span className="text-rose-500">*</span>
            </label>
            <select
              id="invoice-booking-select"
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber} • {b.customer.fullName} • {b.vehicle.make} {b.vehicle.model} ({b.vehicle.registrationNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Corporate GSTIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer / Corporate GSTIN (Optional)
            </label>
            <input
              id="customer-gstin-input"
              type="text"
              placeholder="e.g. 29AABCU9603R1ZM (Leave blank for B2C Retail)"
              value={customerGstin}
              onChange={(e) => setCustomerGstin(e.target.value)}
              maxLength={15}
              className="w-full px-3.5 py-2.5 text-xs uppercase font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              15-character GSTIN will be recorded on the invoice for customer input tax credit (ITC).
            </span>
          </div>

          {/* Additional Discount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Courtesy / Adjustment Discount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Tax Breakdown Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-300">GST SCHEDULE (INTRA-STATE)</span>
              <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-400">
                SAC 996601
              </span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Taxable Value:</span>
              <span className="text-white">₹{taxableSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Central GST (CGST @ 9%):</span>
              <span className="text-white">₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>State GST (SGST @ 9%):</span>
              <span className="text-white">₹{sgst.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center font-bold text-sm text-white pt-2 border-t border-slate-800">
              <span>TOTAL INVOICE VALUE</span>
              <span className="text-blue-400">₹{totalInvoice.toFixed(2)}</span>
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
              id="submit-generate-invoice-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                'Generating Invoice...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Generate Official Tax Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
