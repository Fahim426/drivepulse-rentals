import React, { useState } from 'react';
import { X, CheckCircle2, ShieldAlert, Camera, Fuel, Gauge, PackageCheck } from 'lucide-react';
import { Booking } from '../../types/booking';
import { SignatureCanvas } from './SignatureCanvas';
import { useToast } from '../common/Toast';

interface PickupInspectionModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ACCESSORIES_LIST = [
  'Spare Tyre / Wheel',
  'Jack & Handle',
  'Wheel Spanner / Tool Kit',
  'RC Smart Card Copy',
  'Fastag Electronic Tag',
  'First Aid Kit',
  'Emergency Hazard Triangle',
];

export const PickupInspectionModal: React.FC<PickupInspectionModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addToast } = useToast();
  const [odometer, setOdometer] = useState<number>(booking.vehicle.odometer || 0);
  const [fuelLevel, setFuelLevel] = useState<'0/4' | '1/4' | '2/4' | '3/4' | '4/4'>('4/4');
  const [damageNotes, setDamageNotes] = useState('');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([
    'Spare Tyre / Wheel',
    'Jack & Handle',
    'Wheel Spanner / Tool Kit',
    'RC Smart Card Copy',
    'Fastag Electronic Tag',
  ]);
  const [customerSignature, setCustomerSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleAccessory = (acc: string) => {
    setSelectedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((item) => item !== acc) : [...prev, acc]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (odometer < booking.vehicle.odometer) {
      addToast(
        `Odometer reading cannot be lower than current vehicle odometer (${booking.vehicle.odometer} km)`,
        'error'
      );
      return;
    }

    if (!customerSignature) {
      addToast('Customer signature is mandatory before vehicle handover', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/pickup-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometer: Number(odometer),
          fuelLevel,
          damageNotes: damageNotes.trim() || undefined,
          accessoriesHandedOver: selectedAccessories,
          customerSignature,
          photos: ['/uploads/inspections/pickup_front.jpg', '/uploads/inspections/pickup_rear.jpg'],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to complete pickup handover');
      }

      addToast('Pickup inspection completed! Vehicle handed over to customer.', 'success');
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
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Vehicle Handover & Pickup Inspection
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Booking: <strong className="text-slate-800 dark:text-slate-200">{booking.bookingNumber}</strong> •{' '}
              {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.registrationNumber})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Customer alert */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                Hirer / Customer: {booking.customer.fullName}
              </span>
              <p className="text-xs text-blue-700/80 dark:text-blue-400">
                Contact: {booking.customer.phone} • Security Deposit: ₹{booking.securityDeposit.toLocaleString('en-IN')}
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-full">
              DL Verified
            </span>
          </div>

          {/* Odometer & Fuel Level Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Gauge className="w-4 h-4 text-blue-600" />
                Handover Odometer (km) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={booking.vehicle.odometer}
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Last recorded: {booking.vehicle.odometer} km
              </span>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Fuel className="w-4 h-4 text-amber-500" />
                Handover Fuel Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['0/4', '1/4', '2/4', '3/4', '4/4'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFuelLevel(lvl)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      fuelLevel === lvl
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Customer must return vehicle at {fuelLevel} or shortfall is billed.
              </span>
            </div>
          </div>

          {/* Accessories Checkbox List */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              Handover Accessories Checklist
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACCESSORIES_LIST.map((acc) => {
                const checked = selectedAccessories.includes(acc);
                return (
                  <label
                    key={acc}
                    onClick={() => toggleAccessory(acc)}
                    className={`flex items-center gap-2.5 p-2.5 text-xs font-medium rounded-xl border cursor-pointer select-none transition-all ${
                      checked
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>{acc}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Damage & Condition Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pre-existing Scratches, Dents or Notes
            </label>
            <textarea
              rows={2}
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="e.g. Minor paint scratch on left door, interior clean, 2 keys handed over."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Digital Signature */}
          <SignatureCanvas
            value={customerSignature}
            onChange={setCustomerSignature}
            label="Hirer / Customer Acknowledgment Signature"
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                'Processing Handover...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Handover & Release Vehicle
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
