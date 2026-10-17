import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  User,
  ShieldCheck,
  ShieldAlert,
  Download,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  FileText,
  DollarSign,
  Fuel,
  Gauge,
  PackageCheck,
  ExternalLink,
} from 'lucide-react';
import { Booking, BookingStatus } from '../../types/booking';
import { PickupInspectionModal } from '../../components/bookings/PickupInspectionModal';
import { ReturnInspectionModal } from '../../components/bookings/ReturnInspectionModal';
import { ExtendBookingModal } from '../../components/bookings/ExtendBookingModal';
import { CancelBookingModal } from '../../components/bookings/CancelBookingModal';
import { useToast } from '../../components/common/Toast';

const STATUS_STEPS: BookingStatus[] = ['QUOTE', 'CONFIRMED', 'PICKED_UP', 'RETURNED'];

export const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isPickupOpen, setIsPickupOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const fetchBooking = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
      } else {
        addToast('Booking not found', 'error');
        navigate('/bookings');
      }
    } catch (err) {
      console.error(err);
      addToast('Error fetching booking details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleConfirmQuote = async () => {
    if (!booking) return;
    try {
      const res = await fetch(`/api/bookings/${booking.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      if (res.ok) {
        addToast('Quotation confirmed successfully!', 'success');
        fetchBooking();
      } else {
        const data = await res.json();
        addToast(data.message || 'Error confirming quote', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-slate-400">Loading booking...</div>;
  }

  if (!booking) {
    return null;
  }

  const pickupChecklist = booking.checklists?.find((c) => c.type === 'PICKUP');
  const returnChecklist = booking.checklists?.find((c) => c.type === 'RETURN');

  const currentStepIdx = STATUS_STEPS.indexOf(booking.status);
  const isCancelled = booking.status === 'CANCELLED';

  const dlDoc = booking.customer.documents?.find((d) => d.docType === 'DRIVING_LICENCE');

  return (
    <div className="space-y-6">
      {/* Top Bar with Back, Ref #, and Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bookings')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {booking.bookingNumber}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  booking.status === 'PICKED_UP'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : booking.status === 'CONFIRMED'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                    : booking.status === 'QUOTE'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : booking.status === 'RETURNED'
                    ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {booking.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Booked on{' '}
              {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              by {booking.createdByUser?.fullName || 'Staff'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/api/bookings/${booking.id}/agreement-pdf`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Download Agreement PDF
          </a>

          {booking.status === 'QUOTE' && (
            <button
              onClick={handleConfirmQuote}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Reservation
            </button>
          )}

          {booking.status === 'CONFIRMED' && (
            <button
              onClick={() => setIsPickupOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <KeyRound className="w-4 h-4" />
              Perform Pickup Handover
            </button>
          )}

          {booking.status === 'PICKED_UP' && (
            <button
              onClick={() => setIsReturnOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Return Inspection & Settlement
            </button>
          )}

          {(booking.status === 'CONFIRMED' || booking.status === 'PICKED_UP') && (
            <button
              onClick={() => setIsExtendOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
            >
              <RotateCcw className="w-4 h-4 text-indigo-600" />
              Extend Return
            </button>
          )}

          {(booking.status === 'QUOTE' || booking.status === 'CONFIRMED') && (
            <button
              onClick={() => setIsCancelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
            >
              <XCircle className="w-4 h-4" />
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Stepper Card */}
      {!isCancelled ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              const stepLabels: Record<string, string> = {
                QUOTE: 'Draft Quotation',
                CONFIRMED: 'Confirmed Reservation',
                PICKED_UP: 'Vehicle On Road',
                RETURNED: 'Returned & Settled',
              };

              return (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-md ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40'
                        : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-2 font-bold ${
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : isPast
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {stepLabels[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-300">
            <strong className="block text-sm">Booking Cancelled</strong>
            <p className="mt-1">
              Reason: <strong>{booking.cancellationReason || 'Staff initiated cancellation'}</strong>
            </p>
            {booking.cancellationFee && booking.cancellationFee > 0 && (
              <p className="mt-0.5">
                Cancellation Fee Assessed: ₹{booking.cancellationFee.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main 3-Column Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Customer KYC */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
                <User className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer & KYC
              </h3>
            </div>
            <button
              onClick={() => navigate(`/customers/${booking.customer.id}`)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Profile <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div>
            <span className="text-sm font-bold text-slate-900 dark:text-white block">
              {booking.customer.fullName}
            </span>
            <span className="text-xs text-slate-500">{booking.customer.phone}</span>
            {booking.customer.email && (
              <span className="text-xs text-slate-500 block">{booking.customer.email}</span>
            )}
            <span className="text-xs text-slate-400 block mt-1 line-clamp-1">
              {booking.customer.address}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Driving Licence:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {dlDoc ? dlDoc.documentNumber : 'Verified at counter'}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>DL Expiry Date:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {dlDoc && dlDoc.expiryDate
                  ? new Date(dlDoc.expiryDate).toLocaleDateString('en-IN')
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Vehicle */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
                <Car className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fleet Vehicle
              </h3>
            </div>
            <button
              onClick={() => navigate(`/vehicles/${booking.vehicle.id}`)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Details <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {booking.vehicle.make} {booking.vehicle.model}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  booking.vehicle.type === 'BIKE'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : booking.vehicle.type === 'SCOOTER'
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}>
                  {booking.vehicle.type === 'BIKE' ? '🏍️ Bike' : booking.vehicle.type === 'SCOOTER' ? '🛵 Scooter' : '🚗 Car'}
                </span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                {booking.vehicle.registrationNumber}
              </span>
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              {booking.vehicle.fuelType} • {booking.vehicle.year} • {booking.vehicle.seats || 5} Seats
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1.5">
            <div className="flex justify-between text-slate-500">
              <span>Rental Tariff:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">Negotiated (Per People)</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Refundable Deposit:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                ₹{booking.vehicle.securityDeposit.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Transmission:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {booking.vehicle.transmission || 'Manual'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Rental Period & Locations */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trip Window & Locations
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Pickup Date & Time:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {new Date(booking.pickupDateTime).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                📍 {booking.pickupLocation}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px]">Scheduled Return:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {new Date(booking.returnDateTime).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                🏁 {booking.returnLocation}
              </span>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-blue-600 font-semibold">
              <span>Duration: {booking.rentalDays} Day(s)</span>
              <span>{booking.withDriver ? 'Chauffeur Included' : 'Self-Drive'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financials & Inspection Checklists Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Financial Statement & Receipts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Charges & Payment Ledger
              </h3>
            </div>

            {/* Line items */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Base Rental ({booking.rentalDays}d @ ₹{booking.baseRate}/d)</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  ₹{(booking.rentalDays * booking.baseRate).toLocaleString('en-IN')}
                </span>
              </div>

              {booking.withDriver && (
                <div className="flex justify-between text-slate-500">
                  <span>Chauffeur Allowance</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    ₹{(booking.rentalDays * booking.driverAllowancePerDay).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {booking.extras &&
                booking.extras.map((ex) => (
                  <div key={ex.id || ex.name} className="flex justify-between text-slate-500">
                    <span>
                      Add-on: {ex.name} ({ex.quantity}x)
                    </span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      ₹{ex.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}

              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>- ₹{booking.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {booking.taxAmount > 0 ? (
                <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>GST Tax ({booking.taxPercentage || 18}%)</span>
                  <span>₹{booking.taxAmount.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>GST</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Included in Tariff</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>TOTAL RENTAL CHARGES</span>
                <span className="text-blue-600 dark:text-blue-400">
                  ₹{booking.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Balances */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Refundable Deposit:</span>
                <span className="font-bold">₹{booking.securityDeposit.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Advance Paid:</span>
                <span className="font-bold text-emerald-600">
                  ₹{booking.advancePaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-800 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Balance Due:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  ₹{booking.balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payments List */}
            {booking.payments && booking.payments.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Recorded Payments
                </span>
                <div className="space-y-1.5">
                  {booking.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          ₹{p.amount.toLocaleString('en-IN')} via {p.mode}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {p.receiptNumber || 'Receipt'} • {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {p.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Inspection Checklists (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Pickup Inspection Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Pickup Handover Checklist
                </h3>
              </div>
              {pickupChecklist ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded-full">
                  Pending Handover
                </span>
              )}
            </div>

            {pickupChecklist ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Handover Odometer</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {pickupChecklist.odometer.toLocaleString('en-IN')} km
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Handover Fuel Level</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {pickupChecklist.fuelLevel} Full
                    </span>
                  </div>
                </div>

                {pickupChecklist.damageNotes && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pre-existing Condition Notes:</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                      {pickupChecklist.damageNotes}
                    </p>
                  </div>
                )}

                {pickupChecklist.customerSignature && (
                  <div>
                    <span className="text-slate-400 block text-[11px] mb-1">
                      Customer Signature at Handover:
                    </span>
                    <img
                      src={pickupChecklist.customerSignature}
                      alt="Customer Signature"
                      className="h-16 border rounded-xl bg-white p-1"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                Vehicle has not been handed over to the customer yet.
                {booking.status === 'CONFIRMED' && (
                  <button
                    onClick={() => setIsPickupOpen(true)}
                    className="mt-3 block mx-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    Start Pickup Handover
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Return Inspection Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Return Inspection & Settlement
                </h3>
              </div>
              {returnChecklist ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Settled
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full">
                  {booking.status === 'PICKED_UP' ? 'Vehicle On Road' : 'Not Yet Returned'}
                </span>
              )}
            </div>

            {returnChecklist ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Final Return Odometer</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {returnChecklist.odometer.toLocaleString('en-IN')} km
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Final Fuel Level</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {returnChecklist.fuelLevel} Full
                    </span>
                  </div>
                </div>

                {/* Settlement Table */}
                <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-1.5">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Extra KM ({returnChecklist.extraKm || 0} km)</span>
                    <span>₹{(returnChecklist.extraKmCharge || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {(returnChecklist.fuelCharge || 0) > 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Fuel Penalty</span>
                      <span>₹{(returnChecklist.fuelCharge || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {(returnChecklist.lateFee || 0) > 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Late Return Fee</span>
                      <span>₹{(returnChecklist.lateFee || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {(returnChecklist.damageCharge || 0) > 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Damage Charge</span>
                      <span>₹{(returnChecklist.damageCharge || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-emerald-400 pt-1 border-t border-slate-800">
                    <span>Deposit Adjustment / Deductions</span>
                    <span>₹{(returnChecklist.depositAdjustment || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {returnChecklist.damageNotes && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Return Condition Notes:</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                      {returnChecklist.damageNotes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                Return inspection pending.
                {booking.status === 'PICKED_UP' && (
                  <button
                    onClick={() => setIsReturnOpen(true)}
                    className="mt-3 block mx-auto px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    Start Return Inspection & Settlement
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspection & Action Modals */}
      <PickupInspectionModal
        booking={booking}
        isOpen={isPickupOpen}
        onClose={() => setIsPickupOpen(false)}
        onSuccess={fetchBooking}
      />

      <ReturnInspectionModal
        booking={booking}
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        onSuccess={fetchBooking}
      />

      <ExtendBookingModal
        booking={booking}
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
        onSuccess={fetchBooking}
      />

      <CancelBookingModal
        booking={booking}
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSuccess={fetchBooking}
      />
    </div>
  );
};
