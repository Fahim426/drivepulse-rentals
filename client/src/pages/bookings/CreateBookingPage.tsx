import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  User,
  Users,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Minus,
  Check,
  FileText,
  DollarSign,
  Fuel,
  Info,
  Phone,
  Mail,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { AvailableVehicle } from '../../types/booking';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

interface CustomerOption {
  id: string;
  fullName: string;
  phone: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  documents?: Array<{
    docType: string;
    documentNumber: string;
    expiryDate?: string;
  }>;
}

const DEFAULT_EXTRAS = [
  { name: 'Baby Safety Child Seat', dailyPrice: 250, fixedPrice: 0 },
  { name: 'GPS Navigation System', dailyPrice: 150, fixedPrice: 0 },
  { name: 'Fastag Prepaid Pass', dailyPrice: 100, fixedPrice: 0 },
  { name: 'Express Interior Detailing', dailyPrice: 0, fixedPrice: 350 },
];

export const CreateBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Date defaults: pickup tomorrow, return 3 days later
  const now = new Date();
  const defaultPickup = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const defaultReturn = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const [pickupDateTime, setPickupDateTime] = useState(defaultPickup.toISOString().slice(0, 16));
  const [returnDateTime, setReturnDateTime] = useState(defaultReturn.toISOString().slice(0, 16));
  const [pickupLocation, setPickupLocation] = useState('DrivePulse Indiranagar Hub, Bengaluru');
  const [returnLocation, setReturnLocation] = useState('DrivePulse Indiranagar Hub, Bengaluru');

  // Customer state: Manual entry vs Existing customer
  const [customerMode, setCustomerMode] = useState<'manual' | 'existing'>('manual');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualCustomerEmail, setManualCustomerEmail] = useState('');
  const [manualCustomerDl, setManualCustomerDl] = useState('');
  const [manualCustomerCity, setManualCustomerCity] = useState('');

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Available vehicles state
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Rental tariff: Manual entry based on passenger count/negotiation
  const [manualRentalAmount, setManualRentalAmount] = useState<number | ''>('');
  const [passengerCount, setPassengerCount] = useState<number>(4);

  // Options & Extras
  const [withDriver, setWithDriver] = useState(false);
  const [driverAllowancePerDay, setDriverAllowancePerDay] = useState(500);
  const [extras, setExtras] = useState<
    Array<{ name: string; dailyPrice: number; fixedPrice: number; quantity: number }>
  >([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);

  // Compliance override
  const [managerOverrideCompliance, setManagerOverrideCompliance] = useState(false);
  const [overrideComplianceReason, setOverrideComplianceReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customer directory
  useEffect(() => {
    fetch('/api/customers?limit=100')
      .then((res) => res.json())
      .then((resData) => {
        const custList = resData.data?.customers || resData.customers || [];
        setCustomers(custList);
        if (custList.length > 0) {
          setSelectedCustomerId(custList[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch available vehicles whenever pickup or return dates change
  useEffect(() => {
    if (!pickupDateTime || !returnDateTime) return;
    const pDate = new Date(pickupDateTime);
    const rDate = new Date(returnDateTime);
    if (rDate <= pDate) return;

    setIsLoadingVehicles(true);
    const params = new URLSearchParams({
      pickupDateTime: pDate.toISOString(),
      returnDateTime: rDate.toISOString(),
    });

    fetch(`/api/bookings/available-vehicles?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setAvailableVehicles(data.vehicles || []);
        if (data.vehicles && data.vehicles.length > 0) {
          // Select first available that is not compliance blocked if possible
          const candidate =
            data.vehicles.find((v: AvailableVehicle) => !v.complianceBlocked) || data.vehicles[0];
          setSelectedVehicleId(candidate.id);
        } else {
          setSelectedVehicleId('');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingVehicles(false));
  }, [pickupDateTime, returnDateTime]);

  // Selected entities
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedVehicle = availableVehicles.find((v) => v.id === selectedVehicleId);

  // Auto adjust passenger count if vehicle changes and capacity is lower
  useEffect(() => {
    if (selectedVehicle && passengerCount > selectedVehicle.seats) {
      setPassengerCount(selectedVehicle.seats);
    }
  }, [selectedVehicleId]);

  // Customer DL & Blacklist Checks (for existing customer mode)
  const customerDl = selectedCustomer?.documents?.find((d) => d.docType === 'DRIVING_LICENCE');
  const returnDateObj = new Date(returnDateTime);
  const dlExpired =
    customerDl?.expiryDate && new Date(customerDl.expiryDate) < returnDateObj;

  // Rental Duration Calculation
  const pickupObj = new Date(pickupDateTime);
  const diffDays = Math.max(
    1,
    Math.ceil((returnDateObj.getTime() - pickupObj.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Manual Rental Tariff Calculations (Amount entered manually based on people)
  const baseRental =
    typeof manualRentalAmount === 'number'
      ? manualRentalAmount
      : manualRentalAmount !== ''
      ? Number(manualRentalAmount)
      : 0;

  const driverTotal = withDriver ? diffDays * driverAllowancePerDay : 0;
  const extrasTotal = extras.reduce(
    (sum, ex) => sum + (ex.dailyPrice * diffDays + ex.fixedPrice) * ex.quantity,
    0
  );
  const subtotal = Math.max(0, baseRental + driverTotal + extrasTotal - Number(discountAmount || 0));
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
  const securityDeposit = selectedVehicle?.securityDeposit || 5000;
  const balanceDue = Math.max(0, totalAmount - Number(advancePaid || 0));

  const toggleExtra = (item: (typeof DEFAULT_EXTRAS)[0]) => {
    const exists = extras.find((e) => e.name === item.name);
    if (exists) {
      setExtras(extras.filter((e) => e.name !== item.name));
    } else {
      setExtras([...extras, { ...item, quantity: 1 }]);
    }
  };

  const handleCreate = async (targetStatus: 'CONFIRMED' | 'QUOTE') => {
    if (customerMode === 'manual') {
      if (!manualCustomerName.trim()) {
        addToast('Please enter the customer full name', 'error');
        return;
      }
      if (!manualCustomerPhone.trim() || manualCustomerPhone.trim().length < 10) {
        addToast('Please enter a valid 10-digit mobile number for the customer', 'error');
        return;
      }
    } else {
      if (!selectedCustomerId) {
        addToast('Please select a customer', 'error');
        return;
      }

      if (selectedCustomer?.isBlacklisted) {
        addToast(`Cannot book: Customer is blacklisted (${selectedCustomer.blacklistReason})`, 'error');
        return;
      }

      if (dlExpired && !withDriver) {
        addToast('Customer Driving Licence expires before the scheduled return date', 'error');
        return;
      }
    }

    if (!selectedVehicleId) {
      addToast('Please select an available vehicle', 'error');
      return;
    }

    if (baseRental <= 0 && targetStatus === 'CONFIRMED') {
      addToast('Please enter the agreed rental amount before confirming', 'error');
      return;
    }

    if (selectedVehicle?.complianceBlocked && !managerOverrideCompliance) {
      addToast('Selected vehicle has expired compliance documents. Manager override required.', 'error');
      return;
    }

    if (selectedVehicle?.complianceBlocked && managerOverrideCompliance && !overrideComplianceReason.trim()) {
      addToast('Please document a justification for the compliance override', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        vehicleId: selectedVehicleId,
        pickupDateTime: new Date(pickupDateTime).toISOString(),
        returnDateTime: new Date(returnDateTime).toISOString(),
        pickupLocation,
        returnLocation,
        rateType: 'DAILY',
        manualRentalAmount: Number(baseRental || 0),
        passengerCount: Number(passengerCount || 1),
        withDriver,
        driverAllowancePerDay: withDriver ? driverAllowancePerDay : 0,
        discountAmount: Number(discountAmount || 0),
        advancePaid: Number(advancePaid || 0),
        status: targetStatus,
        managerOverrideCompliance,
        overrideComplianceReason: managerOverrideCompliance ? overrideComplianceReason : undefined,
        extras,
      };

      if (customerMode === 'manual') {
        payload.customerName = manualCustomerName.trim();
        payload.customerPhone = manualCustomerPhone.trim();
        if (manualCustomerEmail.trim()) payload.customerEmail = manualCustomerEmail.trim();
        if (manualCustomerDl.trim()) payload.customerDlNumber = manualCustomerDl.trim();
        if (manualCustomerCity.trim()) payload.customerCity = manualCustomerCity.trim();
      } else {
        payload.customerId = selectedCustomerId;
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create booking');
      }

      addToast(
        `Booking ${data.bookingNumber} created as ${targetStatus}!`,
        'success'
      );
      navigate(`/bookings/${data.id}`);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    !isSubmitting &&
    !!selectedVehicleId &&
    (customerMode === 'manual'
      ? manualCustomerName.trim().length >= 2 && manualCustomerPhone.trim().length >= 10
      : !!selectedCustomerId && !selectedCustomer?.isBlacklisted && (!dlExpired || withDriver));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/bookings')}
          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Create Rental Booking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dispatch workflow with manual customer entry, negotiated rent based on passengers, and live GST quotation.
          </p>
        </div>
      </div>

      {/* Main Grid: Form Left, Sticky Live Quote Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Customer Information (Manual vs Existing) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                  1
                </span>
                <h3>Customer Information</h3>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCustomerMode('manual')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    customerMode === 'manual'
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Enter Manually
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    customerMode === 'existing'
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Select Existing
                </button>
              </div>
            </div>

            {/* Mode 1: Enter Customer Manually */}
            {customerMode === 'manual' ? (
              <div className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Gowda"
                        value={manualCustomerName}
                        onChange={(e) => setManualCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile / Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        placeholder="e.g. 9845012345"
                        value={manualCustomerPhone}
                        onChange={(e) => setManualCustomerPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Driving Licence No. (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KA0520210087"
                      value={manualCustomerDl}
                      onChange={(e) => setManualCustomerDl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City / Area (Optional)
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru"
                        value={manualCustomerCity}
                        onChange={(e) => setManualCustomerCity(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        placeholder="e.g. customer@gmail.com"
                        value={manualCustomerEmail}
                        onChange={(e) => setManualCustomerEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    New customer will be automatically saved to directory upon booking confirmation.
                  </span>
                </div>
              </div>
            ) : (
              /* Mode 2: Select From Existing Customer Directory */
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Hirer / Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone}) {c.isBlacklisted ? '⚠️ [BLACKLISTED]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Existing Customer Status Banner */}
                {selectedCustomer && (
                  <div className="space-y-2">
                    {selectedCustomer.isBlacklisted && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <strong className="block">Customer is Blacklisted!</strong>
                          {selectedCustomer.blacklistReason || 'Documented violation on record. Booking blocked.'}
                        </div>
                      </div>
                    )}

                    {customerDl ? (
                      dlExpired ? (
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <strong>Driving Licence Expired / Expiring!</strong>
                            <p>
                              DL No: {customerDl.documentNumber} expires on{' '}
                              {new Date(customerDl.expiryDate!).toLocaleDateString('en-IN')}, which is before
                              rental return date.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>
                              Valid DL: <strong>{customerDl.documentNumber}</strong> (Expires{' '}
                              {customerDl.expiryDate
                                ? new Date(customerDl.expiryDate).toLocaleDateString('en-IN')
                                : 'N/A'}
                              )
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                            KYC OK
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500">
                        No Driving Licence record on profile. Staff can verify physical DL at handover.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Trip Duration & Locations */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                2
              </span>
              <h3>Rental Period & Locations</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pickup Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={pickupDateTime}
                  onChange={(e) => setPickupDateTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Return Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={returnDateTime}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pickup Location
                </label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Return Location
                </label>
                <input
                  type="text"
                  value={returnLocation}
                  onChange={(e) => setReturnLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Available Vehicles (No fixed rate shown; focused on people capacity) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                  3
                </span>
                <h3>Select Fleet Vehicle</h3>
              </div>
              <span className="text-xs text-slate-400">
                {isLoadingVehicles
                  ? 'Checking availability...'
                  : `${availableVehicles.length} vehicles available`}
              </span>
            </div>

            {availableVehicles.length === 0 && !isLoadingVehicles ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                No vehicles available for the selected dates. Please adjust your pickup/return window.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {availableVehicles.map((vehicle) => {
                  const isSelected = selectedVehicleId === vehicle.id;
                  return (
                    <div
                      key={vehicle.id}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {vehicle.make} {vehicle.model}
                          </h4>
                          <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                            {vehicle.registrationNumber}
                          </span>
                        </div>
                        {/* Seating badge instead of fixed price */}
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900 shrink-0">
                          👥 {vehicle.seats} Seater
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                        <span>{vehicle.fuelType}</span>
                        <span>•</span>
                        <span>{vehicle.transmission}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Custom Tariff
                        </span>
                      </div>

                      {/* Compliance Warning */}
                      {vehicle.complianceBlocked && (
                        <div className="mt-2.5 p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                          ⚠️ {vehicle.complianceIssues.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manager Compliance Override Section if vehicle is blocked */}
            {selectedVehicle?.complianceBlocked && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Compliance Alert: Vehicle documents require renewal</span>
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-400">
                  {selectedVehicle.complianceIssues.join('. ')}. Only Managers can override this constraint.
                </p>

                {user?.role !== 'STAFF' ? (
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={managerOverrideCompliance}
                        onChange={(e) => setManagerOverrideCompliance(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4"
                      />
                      <span>Authorize Manager Compliance Override</span>
                    </label>

                    {managerOverrideCompliance && (
                      <input
                        type="text"
                        placeholder="Documented reason for override (e.g. Renewal submitted to RTO)..."
                        value={overrideComplianceReason}
                        onChange={(e) => setOverrideComplianceReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-semibold">
                    Staff role cannot override compliance blocks. Please pick another vehicle or consult Manager.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Step 4: Negotiated Rental Tariff (Pricing Based on People) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                  4
                </span>
                <h3>Negotiated Rental Tariff (Rent Based on People)</h3>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900">
                Manual Pricing
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vehicles do not have a fixed tariff — specify the agreed rental amount manually based on the number of passengers and trip plan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agreed Rental Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Enter agreed rent (e.g. 3500)"
                    value={manualRentalAmount === '' ? '' : manualRentalAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setManualRentalAmount(val);
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 text-sm font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Total rental agreed with customer for {diffDays} day(s).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Passengers / People
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min="1"
                      max={selectedVehicle?.seats || 20}
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 font-medium">
                    / Max {selectedVehicle?.seats || 5} Seats
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Occupancy context for pricing quotation.
                </span>
              </div>
            </div>
          </div>

          {/* Step 5: Add-ons & Driver Options */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                5
              </span>
              <h3>Add-ons & Chauffeur Services</h3>
            </div>

            {/* Chauffeur Toggle */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Dedicated Chauffeur (With Driver)
                </span>
                <span className="text-[11px] text-slate-500">
                  Professional licensed corporate driver • ₹500 / day
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWithDriver(!withDriver)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  withDriver
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {withDriver ? 'Driver Added (+₹500/d)' : 'Self-Drive'}
              </button>
            </div>

            {/* Extras items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEFAULT_EXTRAS.map((extra) => {
                const isSelected = extras.some((e) => e.name === extra.name);
                const priceStr =
                  extra.dailyPrice > 0 ? `+₹${extra.dailyPrice}/d` : `+₹${extra.fixedPrice} fixed`;

                return (
                  <div
                    key={extra.name}
                    onClick={() => toggleExtra(extra)}
                    className={`p-3 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold block">{extra.name}</span>
                      <span className="text-[11px] text-slate-400">{priceStr}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 6: Discounts & Initial Advance Payment */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                6
              </span>
              <h3>Discounts & Advance Deposit</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Promotional / Courtesy Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Advance Collected (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Creates an automatic payment receipt upon booking confirmation.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Column: Real-time Live Quotation Breakdown (5 cols) */}
        <div id="quotation-summary" className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-blue-400 font-bold block uppercase tracking-wider">
                  Live Quotation
                </span>
                <h3 className="text-base font-bold text-white">Quotation Summary</h3>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-blue-600/30 text-blue-400 rounded-full border border-blue-500/30">
                {diffDays} Day(s)
              </span>
            </div>

            {/* Selected Vehicle Overview */}
            {selectedVehicle ? (
              <div className="p-3 bg-slate-800/60 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">
                    {selectedVehicle.make} {selectedVehicle.model}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {selectedVehicle.registrationNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-blue-400 block">{selectedVehicle.seats} Seater</span>
                  <span className="text-slate-400 text-[10px] block">Rent by People</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-800/40 rounded-2xl text-xs text-slate-400 text-center">
                Select a vehicle to preview quote
              </div>
            )}

            {/* Customer Summary in Quote */}
            <div className="p-2.5 bg-slate-800/40 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-400">Hirer / Customer:</span>
              <span className="text-white font-semibold truncate max-w-[180px]">
                {customerMode === 'manual'
                  ? manualCustomerName || 'Manual Customer'
                  : selectedCustomer?.fullName || 'Selected Customer'}
              </span>
            </div>

            {/* Line items */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between text-slate-400">
                <span>
                  Agreed Rental ({diffDays} d • {passengerCount} pax)
                </span>
                <span className="text-white font-semibold">
                  ₹{baseRental.toLocaleString('en-IN')}
                </span>
              </div>

              {withDriver && (
                <div className="flex justify-between text-slate-400">
                  <span>Chauffeur Allowance ({diffDays} days @ ₹500/d)</span>
                  <span className="text-white">₹{driverTotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              {extras.map((ex) => (
                <div key={ex.name} className="flex justify-between text-slate-400">
                  <span>
                    Add-on: {ex.name} ({ex.quantity}x)
                  </span>
                  <span className="text-white">
                    ₹
                    {(
                      (ex.dailyPrice * diffDays + ex.fixedPrice) *
                      ex.quantity
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Courtesy Discount</span>
                  <span>- ₹{Number(discountAmount).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span>Subtotal (Net)</span>
                <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>GST Tax (18%)</span>
                <span className="text-white">₹{taxAmount.toLocaleString('en-IN')}</span>
              </div>

              {/* Total Card */}
              <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>TOTAL RENTAL CHARGES</span>
                <span className="text-xl text-blue-400">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Deposit & Balance */}
            <div className="p-3.5 bg-slate-800/80 rounded-2xl space-y-1.5 text-xs border border-slate-700/50">
              <div className="flex justify-between text-slate-300">
                <span>Refundable Security Deposit:</span>
                <span className="font-bold">₹{securityDeposit.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Advance Paid Today:</span>
                <span className="font-bold text-emerald-400">
                  ₹{Number(advancePaid || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-700">
                <span>Balance Due at Handover:</span>
                <span className="font-bold text-amber-400">
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={!isFormValid}
                onClick={() => handleCreate('CONFIRMED')}
                className="w-full py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Booking...' : 'Confirm & Schedule Booking'}
              </button>

              <button
                type="button"
                disabled={!isFormValid}
                onClick={() => handleCreate('QUOTE')}
                className="w-full py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
              >
                Save as Draft Quotation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Live Quote Bar (< lg) */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl safe-area-pb">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total:</span>
              <span className="text-sm font-black text-blue-400">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Balance: <span className="text-amber-400 font-semibold">₹{balanceDue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                document.getElementById('quotation-summary')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
            >
              Review
            </button>
            <button
              type="button"
              disabled={!isFormValid || isSubmitting}
              onClick={() => handleCreate('CONFIRMED')}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
