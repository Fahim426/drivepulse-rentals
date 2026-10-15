import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Booking } from '../../types/booking';
import { useToast } from '../common/Toast';

interface ExtendBookingModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExtendBookingModal: React.FC<ExtendBookingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addToast } = useToast();
  
  // Format current return date to YYYY-MM-DDTHH:mm
  const defaultNextDate = new Date(new Date(booking.returnDateTime).getTime() + 24 * 60 * 60 * 1000);
  const formattedDefault = defaultNextDate.toISOString().slice(0, 16);

  const [newReturnDateTime, setNewReturnDateTime] = useState(formattedDefault);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentReturn = new Date(booking.returnDateTime);
  const selectedReturn = new Date(newReturnDateTime);
  const diffDays = Math.max(
    0,
    Math.ceil((selectedReturn.getTime() - currentReturn.getTime()) / (1000 * 60 * 60 * 24))
  );
  const approxAdditionalRent = diffDays * booking.baseRate;
  const approxAdditionalTax = approxAdditionalRent * 0.18;
  const approxAdditionalTotal = approxAdditionalRent + approxAdditionalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedReturn <= currentReturn) {
      addToast('New return date must be strictly after the current scheduled return date', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newReturnDateTime: new Date(newReturnDateTime).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to extend booking');
      }

      addToast('Booking successfully extended!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Extend Rental Duration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Current Scheduled Return:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(booking.returnDateTime).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vehicle Base Rate:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">₹{booking.baseRate}/day</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Return Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={newReturnDateTime}
              onChange={(e) => setNewReturnDateTime(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {diffDays > 0 && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-xs space-y-1 text-blue-900 dark:text-blue-300">
              <div className="flex justify-between font-medium">
                <span>Extended By:</span>
                <span>+{diffDays} Day(s)</span>
              </div>
              <div className="flex justify-between font-bold text-blue-700 dark:text-blue-400">
                <span>Additional Charges (+18% GST):</span>
                <span>₹{Math.round(approxAdditionalTotal).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || diffDays <= 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying & Extending...' : 'Confirm Extension'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
