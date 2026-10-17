import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Vehicle } from '../../types/vehicle';
import { useToast } from '../common/Toast';
import { X, Car, DollarSign, Gauge, Plus, Trash2 } from 'lucide-react';

const vehicleFormSchema = z.object({
  registrationNumber: z.string().min(4, 'Registration number is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  year: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1, 'Color is required'),
  type: z.enum(['CAR', 'BIKE', 'SCOOTER']).default('CAR'),
  fuelType: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG']),
  transmission: z.enum(['Manual', 'Automatic']),
  seats: z.coerce.number().int().min(1, 'Minimum 1 seat').max(15),
  chassisNumber: z.string().min(4, 'Chassis number is required'),
  engineNumber: z.string().min(4, 'Engine number is required'),
  odometer: z.coerce.number().optional().default(0),
  dailyRate: z.coerce.number().optional().default(0),
  weeklyRate: z.coerce.number().optional().default(0),
  monthlyRate: z.coerce.number().optional().default(0),
  securityDeposit: z.coerce.number().min(0).default(5000),
  kmLimitPerDay: z.coerce.number().optional().default(0),
  extraKmCharge: z.coerce.number().optional().default(0),
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE']),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

interface VehicleFormModalProps {
  vehicle?: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photosList, setPhotosList] = useState<string[]>(vehicle?.photos || []);

  const isEdit = !!vehicle;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle
      ? {
          registrationNumber: vehicle.registrationNumber,
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant || '',
          year: vehicle.year,
          color: vehicle.color,
          type: (vehicle.type as any) || 'CAR',
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          seats: vehicle.seats,
          chassisNumber: vehicle.chassisNumber,
          engineNumber: vehicle.engineNumber,
          odometer: vehicle.odometer,
          dailyRate: vehicle.dailyRate,
          weeklyRate: vehicle.weeklyRate,
          monthlyRate: vehicle.monthlyRate,
          securityDeposit: vehicle.securityDeposit,
          kmLimitPerDay: vehicle.kmLimitPerDay,
          extraKmCharge: vehicle.extraKmCharge,
          status: vehicle.status,
        }
      : {
          registrationNumber: '',
          make: '',
          model: '',
          variant: '',
          year: new Date().getFullYear(),
          color: '',
          type: 'CAR',
          fuelType: 'Petrol',
          transmission: 'Manual',
          seats: 5,
          chassisNumber: '',
          engineNumber: '',
          odometer: 0,
          dailyRate: 2500,
          weeklyRate: 15000,
          monthlyRate: 50000,
          securityDeposit: 5000,
          kmLimitPerDay: 250,
          extraKmCharge: 12,
          status: 'AVAILABLE',
        },
  });

  if (!isOpen) return null;

  const handleAddPhoto = () => {
    if (!photoUrlInput.trim()) return;
    setPhotosList([...photosList, photoUrlInput.trim()]);
    setPhotoUrlInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setPhotosList(photosList.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: VehicleFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        odometer: vehicle?.odometer ?? 0,
        dailyRate: vehicle?.dailyRate ?? 0,
        weeklyRate: vehicle?.weeklyRate ?? 0,
        monthlyRate: vehicle?.monthlyRate ?? 0,
        kmLimitPerDay: vehicle?.kmLimitPerDay ?? 0,
        extraKmCharge: vehicle?.extraKmCharge ?? 0,
        photos: photosList,
      };

      if (isEdit) {
        await api.put(`/vehicles/${vehicle.id}`, payload);
        toast.success('Vehicle Updated', `${data.make} ${data.model} has been updated.`);
      } else {
        await api.post('/vehicles', payload);
        toast.success('Vehicle Created', `${data.make} ${data.model} added to fleet.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(isEdit ? 'Update Failed' : 'Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit Vehicle Details' : 'Add New Fleet Vehicle'}
              </h3>
              <p className="text-xs text-slate-400">
                Enter technical specifications, registration numbers, and rental pricing tiers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4 text-xs">
          {/* Section 1: Vehicle Identification */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Vehicle Identification & Specs</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fleet Category *
                </label>
                <select
                  {...register('type')}
                  onChange={(e) => {
                    const val = e.target.value as 'CAR' | 'BIKE' | 'SCOOTER';
                    setValue('type', val);
                    if (val === 'BIKE') {
                      setValue('seats', 2);
                      setValue('transmission', 'Manual');
                    } else if (val === 'SCOOTER') {
                      setValue('seats', 2);
                      setValue('transmission', 'Automatic');
                    } else if (val === 'CAR') {
                      setValue('seats', 5);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  <option value="CAR">🚗 Car</option>
                  <option value="BIKE">🏍️ Bike</option>
                  <option value="SCOOTER">🛵 Scooter</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  {...register('registrationNumber')}
                  placeholder="e.g. KA01AB1234"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono uppercase"
                />
                {errors.registrationNumber && (
                  <p className="text-rose-400 mt-1">{errors.registrationNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Make / Manufacturer *
                </label>
                <input
                  type="text"
                  {...register('make')}
                  placeholder="e.g. Hyundai"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
                {errors.make && <p className="text-rose-400 mt-1">{errors.make.message}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  {...register('model')}
                  placeholder="e.g. Creta"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
                {errors.model && <p className="text-rose-400 mt-1">{errors.model.message}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Variant / Trim
                </label>
                <input
                  type="text"
                  {...register('variant')}
                  placeholder="e.g. SX (O)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Manufacturing Year *
                </label>
                <input
                  type="number"
                  {...register('year')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Color *
                </label>
                <input
                  type="text"
                  {...register('color')}
                  placeholder="e.g. Polar White"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Technical Specifications */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Technical & Mechanical Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fuel Type *
                </label>
                <select
                  {...register('fuelType')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transmission *
                </label>
                <select
                  {...register('transmission')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Seating Capacity *
                </label>
                <input
                  type="number"
                  {...register('seats')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chassis Number (VIN) *
                </label>
                <input
                  type="text"
                  {...register('chassisNumber')}
                  placeholder="e.g. MALC181CLPM102938"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Engine Number *
                </label>
                <input
                  type="text"
                  {...register('engineNumber')}
                  placeholder="e.g. G4FLPM839201"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Rental Deposit & Fleet Status */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Rental Deposit & Operational Status</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Refundable Security Deposit (₹) *
                </label>
                <input
                  type="number"
                  {...register('securityDeposit')}
                  placeholder="5000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Status *
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  <option value="AVAILABLE">AVAILABLE — Ready for rent</option>
                  <option value="RENTED">RENTED — Currently on booking</option>
                  <option value="MAINTENANCE">MAINTENANCE — Service bay</option>
                  <option value="INACTIVE">INACTIVE — Decommissioned</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Note: Vehicles do not use rigid daily/weekly rates. Rental tariffs are agreed dynamically based on passenger count and trip requirements.
            </p>
          </div>

          {/* Section 4: Vehicle Photos */}
          <div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Add Vehicle Photo URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Photos preview */}
          {photosList.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {photosList.map((url, i) => (
                <div key={i} className="relative group w-20 h-16 rounded-lg overflow-hidden border">
                  <img src={url} alt="Vehicle" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Vehicle...' : isEdit ? 'Save Changes' : 'Add Vehicle to Fleet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
