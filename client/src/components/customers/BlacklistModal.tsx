import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Customer } from '../../types/customer';
import { useToast } from '../common/Toast';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface BlacklistModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BlacklistModal: React.FC<BlacklistModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState(customer.blacklistReason || '');

  if (!isOpen) return null;

  const isCurrentlyBlacklisted = customer.isBlacklisted;

  const handleToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCurrentlyBlacklisted && !reason.trim()) {
      toast.warning('Reason Required', 'Please enter a reason for blacklisting this customer.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/customers/${customer.id}/blacklist`, {
        isBlacklisted: !isCurrentlyBlacklisted,
        blacklistReason: !isCurrentlyBlacklisted ? reason : null,
      });

      toast.success(
        !isCurrentlyBlacklisted ? 'Customer Blacklisted' : 'Blacklist Removed',
        !isCurrentlyBlacklisted
          ? `${customer.fullName} has been blacklisted from future bookings.`
          : `${customer.fullName} is now eligible for rental bookings.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isCurrentlyBlacklisted
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
              }`}
            >
              {isCurrentlyBlacklisted ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isCurrentlyBlacklisted ? 'Remove from Blacklist' : 'Blacklist Customer'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleToggle} className="space-y-4 mt-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            {isCurrentlyBlacklisted ? (
              <>
                Are you sure you want to remove <span className="font-bold">{customer.fullName}</span> from the
                blacklist? They will be allowed to make bookings again.
              </>
            ) : (
              <>
                Blacklisting <span className="font-bold">{customer.fullName}</span> will prevent staff from creating
                bookings for them and display a prominent warning banner across the console.
              </>
            )}
          </p>

          {!isCurrentlyBlacklisted && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blacklist Reason *
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Repeated late returns, vehicle damage refusal, fraudulent payment attempt..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 rounded-xl text-white font-semibold shadow-sm transition disabled:opacity-50 ${
                isCurrentlyBlacklisted
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : isCurrentlyBlacklisted
                ? 'Confirm Whitelist'
                : 'Confirm Blacklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
