import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertTriangle, Gauge, Fuel, ShieldAlert, DollarSign } from 'lucide-react';
import { Booking } from '../../types/booking';
import { SignatureCanvas } from './SignatureCanvas';
import { useToast } from '../common/Toast';

interface ReturnInspectionModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FUEL_VALUES: Record<string, number> = {
  '0/4': 0,
  '1/4': 0.25,
  '2/4': 0.5,
  '3/4': 0.75,
  '4/4': 1,
};

export const ReturnInspectionModal: React.FC<ReturnInspectionModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addToast } = useToast();

  const pickupChecklist = booking.checklists?.find((c) => c.type === 'PICKUP');
  const initialOdo = pickupChecklist ? pickupChecklist.odometer : booking.vehicle.odometer;
  const initialFuel = pickupChecklist ? pickupChecklist.fuelLevel : '4/4';

  const [odometer, setOdometer] = useState<number>(initialOdo + 150);
  const [fuelLevel, setFuelLevel] = useState<'0/4' | '1/4' | '2/4' | '3/4' | '4/4'>(
    initialFuel as any
  );
  const [damageNotes, setDamageNotes] = useState('');
  const [damageCharge, setDamageCharge] = useState<number>(0);
  const [lateFee, setLateFee] = useState<number>(0);
  const [fuelCharge, setFuelCharge] = useState<number>(0);
  const [customerSignature, setCustomerSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto calculate fuel shortfall charge when fuelLevel changes
  const handleFuelChange = (lvl: '0/4' | '1/4' | '2/4' | '3/4' | '4/4') => {
    setFuelLevel(lvl);
    const pickupVal = FUEL_VALUES[initialFuel] || 1;
    const returnVal = FUEL_VALUES[lvl] || 1;
    if (returnVal < pickupVal) {
      const quartersShort = Math.round((pickupVal - returnVal) / 0.25);
      setFuelCharge(quartersShort * 600); // ₹600 per 1/4 tank
    } else {
      setFuelCharge(0);
    }
  };

  // Settlement calculations
  const totalKmRun = Math.max(0, odometer - initialOdo);
  const allowedKm = booking.rentalDays * (booking.vehicle.kmLimitPerDay || 250);
  const extraKm = Math.max(0, totalKmRun - allowedKm);
  const extraKmCharge = extraKm * (booking.vehicle.extraKmCharge || 12);

  const totalDeductions = extraKmCharge + Number(fuelCharge || 0) + Number(lateFee || 0) + Number(damageCharge || 0);
  const securityDeposit = booking.securityDeposit || 5000;
  const netRefund = Math.max(0, securityDeposit - totalDeductions);
  const additionalDue = Math.max(0, totalDeductions - securityDeposit);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (odometer < initialOdo) {
      addToast(
        `Return odometer (${odometer} km) cannot be less than pickup odometer (${initialOdo} km)`,
        'error'
      );
      return;
    }

    if (!customerSignature) {
      addToast('Customer return sign-off signature is mandatory', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/return-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometer: Number(odometer),
          fuelLevel,
          damageNotes: damageNotes.trim() || undefined,
          damageCharge: Number(damageCharge || 0),
          lateFee: Number(lateFee || 0),
          fuelCharge: Number(fuelCharge || 0),
          customerSignature,
          photos: ['/uploads/inspections/return_front.jpg', '/uploads/inspections/return_rear.jpg'],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to complete return inspection');
      }

      addToast('Vehicle return & settlement completed successfully!', 'success');
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
              <span className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Vehicle Return Inspection & Settlement
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
          {/* Pickup Benchmark Reference */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 block">Pickup Odometer</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {initialOdo.toLocaleString('en-IN')} km
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Pickup Fuel Level</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{initialFuel}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Allowance ({booking.rentalDays}d)</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {allowedKm} km ({booking.vehicle.kmLimitPerDay} km/d)
              </span>
            </div>
          </div>

          {/* Return Odometer & Fuel Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Gauge className="w-4 h-4 text-emerald-600" />
                Return Odometer (km) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={initialOdo}
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Total Driven: {totalKmRun} km{' '}
                {extraKm > 0 ? (
                  <span className="text-amber-600 font-semibold">({extraKm} extra km)</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">(Within limit)</span>
                )}
              </span>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Fuel className="w-4 h-4 text-amber-500" />
                Return Fuel Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['0/4', '1/4', '2/4', '3/4', '4/4'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleFuelChange(lvl)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      fuelLevel === lvl
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {FUEL_VALUES[fuelLevel] < (FUEL_VALUES[initialFuel] || 1) ? (
                  <span className="text-amber-600 font-semibold">
                    Shortfall detected! Auto fuel charge: ₹{fuelCharge}
                  </span>
                ) : (
                  'Fuel matches or exceeds handover.'
                )}
              </span>
            </div>
          </div>

          {/* Adjustments & Deductions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fuel Shortfall (₹)
              </label>
              <input
                type="number"
                min="0"
                value={fuelCharge}
                onChange={(e) => setFuelCharge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Late Return Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={lateFee}
                onChange={(e) => setLateFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Damage / Repair (₹)
              </label>
              <input
                type="number"
                min="0"
                value={damageCharge}
                onChange={(e) => setDamageCharge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Return Condition Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Return Condition / Damage Notes
            </label>
            <textarea
              rows={2}
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="e.g. Returned clean, spare tyre intact, minor scratch on left mirror."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Interactive Settlement Breakdown Card */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-300">SETTLEMENT CALCULATION</span>
              <span className="text-slate-400">Security Deposit: ₹{securityDeposit.toLocaleString('en-IN')}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Extra KM Charges ({extraKm} km @ ₹{booking.vehicle.extraKmCharge}/km)</span>
                <span>₹{extraKmCharge.toLocaleString('en-IN')}</span>
              </div>
              {fuelCharge > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Fuel Penalty Charge</span>
                  <span>₹{fuelCharge.toLocaleString('en-IN')}</span>
                </div>
              )}
              {lateFee > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Late Return Fee</span>
                  <span>₹{lateFee.toLocaleString('en-IN')}</span>
                </div>
              )}
              {damageCharge > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Vehicle Damage Assessment</span>
                  <span>₹{damageCharge.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-200 pt-1 border-t border-slate-800">
                <span>Total Deductions</span>
                <span>₹{totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              {additionalDue > 0 ? (
                <>
                  <div>
                    <span className="text-xs text-rose-400 block font-semibold">Additional Amount Due</span>
                    <span className="text-[10px] text-slate-400">Deductions exceed security deposit</span>
                  </div>
                  <span className="text-xl font-bold text-rose-400">
                    ₹{additionalDue.toLocaleString('en-IN')}
                  </span>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-xs text-emerald-400 block font-semibold">
                      Net Deposit Refund to Customer
                    </span>
                    <span className="text-[10px] text-slate-400">Refund to original payment source</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-400">
                    ₹{netRefund.toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Digital Signature */}
          <SignatureCanvas
            value={customerSignature}
            onChange={setCustomerSignature}
            label="Customer Return Sign-off Signature"
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
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                'Processing Settlement...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Finalize Return & Settlement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
