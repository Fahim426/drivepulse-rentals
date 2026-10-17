import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Vehicle,
  VehicleDocument,
  MaintenanceRecord,
  Expense,
  VehicleProfitability,
} from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { VehicleFormModal } from '../../components/vehicles/VehicleFormModal';
import { AddDocumentModal } from '../../components/vehicles/AddDocumentModal';
import { RenewDocumentModal } from '../../components/vehicles/RenewDocumentModal';
import { AddMaintenanceModal } from '../../components/vehicles/AddMaintenanceModal';
import { AddExpenseModal } from '../../components/vehicles/AddExpenseModal';
import {
  Car,
  FileText,
  CalendarCheck,
  Wrench,
  Receipt,
  Images,
  Calendar as CalendarIcon,
  ShieldAlert,
  ArrowLeft,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  Edit2,
  DollarSign,
  History,
  Gauge,
  Users,
  Fuel,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [vehicle, setVehicle] = useState<
    (Vehicle & { profitability?: VehicleProfitability; bookings?: any[] }) | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab: overview, documents, bookings, maintenance, expenses, photos, calendar
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [renewingDoc, setRenewingDoc] = useState<VehicleDocument | null>(null);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<any>(null);

  const fetchVehicle = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.get<any>(`/vehicles/${id}`);
      setVehicle(res);
    } catch (err: any) {
      toast.error('Failed to load vehicle', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendar = async () => {
    if (!id) return;
    try {
      const res = await api.get<any>(`/vehicles/${id}/calendar?month=${calMonth}&year=${calYear}`);
      setCalendarData(res);
    } catch (err: any) {
      // non-fatal
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendar();
    }
  }, [id, activeTab, calMonth, calYear]);

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/vehicles/documents/${docId}`);
      toast.success('Document Deleted', 'Document removed successfully.');
      fetchVehicle();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const handleDeleteMaintenance = async (maintId: string) => {
    if (!window.confirm('Are you sure you want to delete this maintenance record?')) return;
    try {
      await api.delete(`/vehicles/maintenance/${maintId}`);
      toast.success('Record Deleted', 'Maintenance log removed.');
      fetchVehicle();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const handleDeleteExpense = async (expId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/vehicles/expenses/${expId}`);
      toast.success('Expense Deleted', 'Expense log removed.');
      fetchVehicle();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Vehicle not found.</p>
        <Link to="/vehicles" className="text-indigo-600 text-xs font-semibold mt-2 inline-block">
          Return to fleet
        </Link>
      </div>
    );
  }

  const isBlocked = vehicle.compliance?.isBlocked;
  const docs = vehicle.documents || [];
  const maintRecords = (vehicle as any).maintenanceRecords || [];
  const expenses = (vehicle as any).expenses || [];
  const bookings = vehicle.bookings || [];
  const prof = vehicle.profitability;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vehicles')}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {vehicle.make} {vehicle.model}
              </h1>
              <span className="font-mono text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {vehicle.registrationNumber}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                vehicle.type === 'BIKE'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : vehicle.type === 'SCOOTER'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}>
                {vehicle.type === 'BIKE' ? '🏍️ Bike' : vehicle.type === 'SCOOTER' ? '🛵 Scooter' : '🚗 Car'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {vehicle.variant || 'Standard'} • {vehicle.year} • {vehicle.fuelType} •{' '}
              {vehicle.transmission} • {vehicle.seats} Seats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('SUPER_ADMIN', 'MANAGER') && (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Vehicle</span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {vehicle.status}
          </div>
        </div>
      </div>

      {/* Compliance Blocking Banner if any mandatory doc is expired */}
      {isBlocked && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-900 dark:text-rose-200">
              Vehicle Blocked from Rental Bookings
            </h4>
            <p className="text-rose-700 dark:text-rose-300 mt-0.5">
              One or more mandatory compliance certificates (Insurance, Fitness, or PUC) have expired.
              This vehicle cannot be assigned to customer bookings until renewed.
            </p>
            <div className="mt-2 space-y-1">
              {vehicle.compliance?.reasons.map((r, i) => (
                <div key={i} className="font-mono text-[11px] text-rose-800 dark:text-rose-200">
                  • {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & Specs', icon: Car },
          { id: 'documents', label: `Compliance Docs (${docs.length})`, icon: FileText },
          { id: 'bookings', label: `Bookings (${bookings.length})`, icon: CalendarCheck },
          { id: 'maintenance', label: `Maintenance (${maintRecords.length})`, icon: Wrench },
          { id: 'expenses', label: `Expenses & P&L (${expenses.length})`, icon: Receipt },
          { id: 'photos', label: `Photos (${vehicle.photos?.length || 0})`, icon: Images },
          { id: 'calendar', label: 'Availability Calendar', icon: CalendarIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition shrink-0 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Vehicle Technical Specifications */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Vehicle Specifications & Identity</span>
                </h3>
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {vehicle.registrationNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Seating Capacity</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 mt-1">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    {vehicle.seats} Passengers
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fuel Type</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 mt-1">
                    <Fuel className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    {vehicle.fuelType}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transmission</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 mt-1">
                    <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    {vehicle.transmission}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Year</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1 block">
                    {vehicle.year}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Body Color</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1 block">
                    {vehicle.color}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Variant</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1 block">
                    {vehicle.variant || 'Standard'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl col-span-2 sm:col-span-3 flex flex-col sm:flex-row justify-between gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Chassis Number (VIN)</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {vehicle.chassisNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Engine Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {vehicle.engineNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Rental Policy & Direct Action */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Rental Policy & Dispatch</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {vehicle.status}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Flexible Rental Tariff
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                      Rent by People
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                    This vehicle does not enforce fixed daily or weekly rates. Tariffs are decided dynamically based on passenger count ({vehicle.seats} seats max) and agreed trip details with the customer.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Refundable Security Deposit
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      ₹{vehicle.securityDeposit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Compliance Certificates
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {docs.length} on file
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action Button to Book this vehicle */}
              <button
                onClick={() => navigate(`/bookings/new?vehicleId=${vehicle.id}`)}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Rental Booking for this Vehicle</span>
              </button>
            </div>
          </div>

          {/* Recent & Upcoming Bookings for this Vehicle */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                <span>Recent & Upcoming Bookings ({bookings.length})</span>
              </h3>
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                View all ({bookings.length}) →
              </button>
            </div>

            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No bookings recorded yet for this vehicle. Ready for immediate dispatch.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {bookings.slice(0, 4).map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                        {b.bookingNumber}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        {b.customer?.fullName || 'Customer'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {new Date(b.pickupDateTime).toLocaleDateString('en-IN')} →{' '}
                        {new Date(b.returnDateTime).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 dark:text-white block">
                        ₹{b.totalAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COMPLIANCE DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Compliance & Legal Certificates
              </h3>
              <p className="text-xs text-slate-400">
                Mandatory certificates required for road legality. Expired Insurance, Fitness, or PUC
                blocks rental booking.
              </p>
            </div>
            {hasRole('SUPER_ADMIN', 'MANAGER') && (
              <button
                onClick={() => setShowAddDocModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No documents uploaded yet.
              </div>
            ) : (
              docs.map((doc) => {
                const days = doc.daysRemaining ?? 0;
                const isExpired = doc.status === 'EXPIRED' || days < 0;
                const isExpiringSoon = doc.status === 'EXPIRING_SOON' || (days >= 0 && days <= 30);

                return (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {doc.type}
                        </span>
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            EXPIRED ({Math.abs(days)}d ago)
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            Expires in {days}d
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            VALID
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        Doc #: {doc.documentNumber}
                      </p>

                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Issue Date:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {new Date(doc.issueDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expiry Date:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {new Date(doc.expiryDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        {doc.issuingAuthority && (
                          <div className="flex justify-between">
                            <span>Authority:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                              {doc.issuingAuthority}
                            </span>
                          </div>
                        )}
                        {doc.type === 'INSURANCE' && (
                          <>
                            {doc.insuranceProvider && (
                              <div className="flex justify-between">
                                <span>Provider:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {doc.insuranceProvider}
                                </span>
                              </div>
                            )}
                            {doc.idv && (
                              <div className="flex justify-between">
                                <span>IDV:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  ₹{doc.idv.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                            {doc.premium && (
                              <div className="flex justify-between">
                                <span>Premium:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  ₹{doc.premium.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Renewal History Accordion */}
                      {doc.renewals && doc.renewals.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <History className="w-3 h-3" />
                            <span>Renewal History ({doc.renewals.length})</span>
                          </p>
                          <div className="mt-1 space-y-1">
                            {doc.renewals.map((r, ri) => (
                              <div
                                key={ri}
                                className="text-[10px] p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-slate-500 flex justify-between"
                              >
                                <span className="font-mono">#{r.documentNumber}</span>
                                <span>Expired {new Date(r.expiryDate).toLocaleDateString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {doc.filePath ? (
                        <a
                          href={doc.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> View File
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file attached</span>
                      )}

                      <div className="flex items-center gap-2">
                        {hasRole('SUPER_ADMIN', 'MANAGER') && (
                          <button
                            onClick={() => setRenewingDoc(doc)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Renew</span>
                          </button>
                        )}

                        {hasRole('SUPER_ADMIN', 'MANAGER') && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BOOKINGS HISTORY */}
      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Rental Bookings History for {vehicle.registrationNumber}
            </h3>
            <span className="text-xs text-slate-500">Total: {bookings.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Pickup Date</th>
                  <th className="py-3 px-4">Return Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No bookings recorded for this vehicle yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {b.bookingNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {b.customer?.fullName}
                        <p className="text-[10px] text-slate-400 font-normal">{b.customer?.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(b.pickupDateTime).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(b.returnDateTime).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{b.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Service & Maintenance History
              </h3>
              <p className="text-xs text-slate-400">
                Log regular services, mechanical repairs, tyre and battery replacements.
              </p>
            </div>
            {hasRole('SUPER_ADMIN', 'MANAGER') && (
              <button
                onClick={() => setShowMaintModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Log Service</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type / Description</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Odometer</th>
                    <th className="py-3 px-4">Cost (INR)</th>
                    <th className="py-3 px-4">Next Due</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {maintRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No maintenance records logged for this vehicle.
                      </td>
                    </tr>
                  ) : (
                    maintRecords.map((m: MaintenanceRecord) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {new Date(m.serviceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {m.type}
                          {m.notes && <p className="text-[10px] text-slate-400 font-normal">{m.notes}</p>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.vendor}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {m.odometer.toLocaleString('en-IN')} km
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          ₹{m.cost.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {m.nextServiceDueKm
                            ? `${m.nextServiceDueKm.toLocaleString('en-IN')} km`
                            : m.nextServiceDueDate
                            ? new Date(m.nextServiceDueDate).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {m.invoiceFilePath && (
                              <a
                                href={m.invoiceFilePath}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline"
                                title="Download Invoice"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {hasRole('SUPER_ADMIN', 'MANAGER') && (
                              <button
                                onClick={() => handleDeleteMaintenance(m.id)}
                                className="text-slate-400 hover:text-rose-600"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPENSES & PROFITABILITY */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Vehicle Operating Expenses
              </h3>
              <p className="text-xs text-slate-400">
                Track fuel, repairs, challans/traffic fines, tolls, and calculate overall vehicle profitability.
              </p>
            </div>
            {hasRole('SUPER_ADMIN', 'MANAGER') && (
              <button
                onClick={() => setShowExpenseModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount (INR)</th>
                    <th className="py-3 px-4">Odometer</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No expenses logged for this vehicle.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e: Expense) => (
                      <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {new Date(e.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          ₹{e.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {e.odometer ? `${e.odometer.toLocaleString('en-IN')} km` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{e.notes || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {e.receiptFilePath && (
                              <a
                                href={e.receiptFilePath}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline"
                                title="Download Receipt"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {hasRole('SUPER_ADMIN', 'MANAGER') && (
                              <button
                                onClick={() => handleDeleteExpense(e.id)}
                                className="text-slate-400 hover:text-rose-600"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PHOTOS */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Vehicle Photos</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vehicle.photos?.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No photos uploaded yet. Click &quot;Edit Vehicle&quot; to add photos.
              </div>
            ) : (
              vehicle.photos?.map((url, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm aspect-video bg-slate-100 dark:bg-slate-800 group relative"
                >
                  <img src={url} alt="Vehicle" className="w-full h-full object-cover" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: AVAILABILITY CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Availability Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Visual rental intervals and service bay downtime.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => {
                  if (calMonth === 1) {
                    setCalMonth(12);
                    setCalYear(calYear - 1);
                  } else {
                    setCalMonth(calMonth - 1);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Previous
              </button>
              <span className="font-bold px-2">
                {new Date(calYear, calMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  if (calMonth === 12) {
                    setCalMonth(1);
                    setCalYear(calYear + 1);
                  } else {
                    setCalMonth(calMonth + 1);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Next
              </button>
            </div>
          </div>

          {/* Schedule Calendar representation */}
          <div className="grid grid-cols-7 gap-2 pt-2 text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center font-bold text-slate-400 py-1 uppercase text-[10px]">
                {d}
              </div>
            ))}
            {Array.from({ length: 30 }).map((_, index) => {
              const dayNum = index + 1;
              const thisDate = new Date(calYear, calMonth - 1, dayNum);

              // Check if any booking falls on this day
              const activeBooking = calendarData?.bookings?.find((b: any) => {
                const pick = new Date(b.pickupDateTime);
                const ret = new Date(b.returnDateTime);
                return thisDate >= pick && thisDate <= ret;
              });

              // Check if any maintenance falls on this day
              const activeMaint = calendarData?.maintenance?.find((m: any) => {
                const sd = new Date(m.serviceDate);
                return sd.toDateString() === thisDate.toDateString();
              });

              return (
                <div
                  key={index}
                  className={`min-h-[72px] p-2 rounded-xl border flex flex-col justify-between transition ${
                    activeMaint
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : activeBooking
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                    {dayNum}
                  </span>
                  {activeBooking && (
                    <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 p-1 rounded">
                      Rented: {activeBooking.customer?.fullName?.split(' ')[0]}
                    </div>
                  )}
                  {activeMaint && (
                    <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 p-1 rounded">
                      Service: {activeMaint.type}
                    </div>
                  )}
                  {!activeBooking && !activeMaint && (
                    <span className="text-[9px] text-emerald-600 font-medium">Available</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && (
        <VehicleFormModal
          isOpen={showEditModal}
          vehicle={vehicle}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchVehicle}
        />
      )}

      {showAddDocModal && (
        <AddDocumentModal
          isOpen={showAddDocModal}
          vehicleId={vehicle.id}
          onClose={() => setShowAddDocModal(false)}
          onSuccess={fetchVehicle}
        />
      )}

      {renewingDoc && (
        <RenewDocumentModal
          isOpen={!!renewingDoc}
          document={renewingDoc}
          onClose={() => setRenewingDoc(null)}
          onSuccess={fetchVehicle}
        />
      )}

      {showMaintModal && (
        <AddMaintenanceModal
          isOpen={showMaintModal}
          vehicleId={vehicle.id}
          currentOdometer={vehicle.odometer}
          onClose={() => setShowMaintModal(false)}
          onSuccess={fetchVehicle}
        />
      )}

      {showExpenseModal && (
        <AddExpenseModal
          isOpen={showExpenseModal}
          vehicleId={vehicle.id}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={fetchVehicle}
        />
      )}
    </div>
  );
};
