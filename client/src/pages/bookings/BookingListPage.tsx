import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Car,
  User,
  Clock,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  KeyRound,
  Download,
} from 'lucide-react';
import { Booking, BookingStatus } from '../../types/booking';
import { PickupInspectionModal } from '../../components/bookings/PickupInspectionModal';
import { ReturnInspectionModal } from '../../components/bookings/ReturnInspectionModal';

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  QUOTE: {
    label: 'Quote',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  PICKED_UP: {
    label: 'On Road (Active)',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500 animate-pulse',
  },
  RETURNED: {
    label: 'Returned',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
  },
};

export const BookingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspection modals state
  const [activePickupBooking, setActivePickupBooking] = useState<Booking | null>(null);
  const [activeReturnBooking, setActiveReturnBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  // KPI counts
  const totalCount = bookings.length;
  const activeCount = bookings.filter((b) => b.status === 'PICKED_UP').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const quoteCount = bookings.filter((b) => b.status === 'QUOTE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Booking & Rental Operations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch, active on-road rentals, scheduled returns, and digital agreements.
          </p>
        </div>

        <button
          onClick={() => navigate('/bookings/new')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Create New Booking
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Records</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-2xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Active On Road</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Upcoming Confirmed</span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{confirmedCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-2xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Pending Quotes</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{quoteCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PICKED_UP', label: 'Active on Road' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'QUOTE', label: 'Quotes' },
            { id: 'RETURNED', label: 'Returned' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search booking #, customer, car..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Bookings Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no rental bookings matching your selected filters. Create a new booking to get started.
            </p>
            <button
              onClick={() => navigate('/bookings/new')}
              className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Create Booking
            </button>
          </div>
        ) : (
          <div>
            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {bookings.map((booking) => {
                const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED;
                const pickup = new Date(booking.pickupDateTime);
                const returnD = new Date(booking.returnDateTime);

                return (
                  <div
                    key={booking.id}
                    className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                        className="font-black text-blue-600 dark:text-blue-400 text-sm hover:underline"
                      >
                        {booking.bookingNumber}
                      </button>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {booking.vehicle.make} {booking.vehicle.model}
                        </span>
                        <span className="inline-block mt-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {booking.vehicle.registrationNumber}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {booking.customer.fullName}
                        </span>
                        <span className="text-[11px] text-slate-500">{booking.customer.phone}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Dates:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {pickup.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} →{' '}
                          {returnD.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ({booking.rentalDays}d)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Total: ₹{booking.totalAmount.toLocaleString('en-IN')}</span>
                        {booking.balanceDue > 0 ? (
                          <span className="text-amber-600 font-bold">Due: ₹{booking.balanceDue.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Settled</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={`/api/bookings/${booking.id}/agreement-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Agreement</span>
                      </a>

                      <div className="flex items-center gap-2">
                        {booking.status === 'CONFIRMED' && (
                          <button
                            onClick={() => setActivePickupBooking(booking)}
                            className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm"
                          >
                            Handover
                          </button>
                        )}
                        {booking.status === 'PICKED_UP' && (
                          <button
                            onClick={() => setActiveReturnBooking(booking)}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-sm"
                          >
                            Return
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Booking # / Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Rental Duration</th>
                    <th className="py-3.5 px-4">Financials</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bookings.map((booking) => {
                    const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED;
                    const pickup = new Date(booking.pickupDateTime);
                    const returnD = new Date(booking.returnDateTime);

                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        {/* Booking # & Created */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-blue-600 dark:text-blue-400 text-sm group-hover:underline">
                            {booking.bookingNumber}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {booking.customer.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {booking.customer.phone}
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {booking.vehicle.make} {booking.vehicle.model}
                          </div>
                          <span className="inline-block mt-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {booking.vehicle.registrationNumber}
                          </span>
                        </td>

                        {/* Dates & Duration */}
                        <td className="py-4 px-4">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {pickup.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                            <span className="text-slate-400">→</span>{' '}
                            {returnD.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {booking.rentalDays} Day(s) {booking.withDriver && '• With Chauffeur'}
                          </div>
                        </td>

                        {/* Financials */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            ₹{booking.totalAmount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {booking.balanceDue > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Due: ₹{booking.balanceDue.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Fully Settled
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-4 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {booking.status === 'CONFIRMED' && (
                              <button
                                onClick={() => setActivePickupBooking(booking)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                              >
                                Handover
                              </button>
                            )}

                            {booking.status === 'PICKED_UP' && (
                              <button
                                onClick={() => setActiveReturnBooking(booking)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                              >
                                Return
                              </button>
                            )}

                            <a
                              href={`/api/bookings/${booking.id}/agreement-pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Download Agreement PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => navigate(`/bookings/${booking.id}`)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pickup Handover Modal */}
      {activePickupBooking && (
        <PickupInspectionModal
          booking={activePickupBooking}
          isOpen={!!activePickupBooking}
          onClose={() => setActivePickupBooking(null)}
          onSuccess={() => {
            fetchBookings();
            setActivePickupBooking(null);
          }}
        />
      )}

      {/* Return Settlement Modal */}
      {activeReturnBooking && (
        <ReturnInspectionModal
          booking={activeReturnBooking}
          isOpen={!!activeReturnBooking}
          onClose={() => setActiveReturnBooking(null)}
          onSuccess={() => {
            fetchBookings();
            setActiveReturnBooking(null);
          }}
        />
      )}
    </div>
  );
};
