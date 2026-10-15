import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Customer } from '../../types/customer';
import { useToast } from '../common/Toast';
import { X, User, Phone, Star } from 'lucide-react';

const customerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  alternatePhone: z.string().optional(),
  email: z.string().email('Valid email address is required').optional().or(z.literal('')),
  address: z.string().min(5, 'Full residential address is required'),
  dob: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          fullName: customer.fullName,
          phone: customer.phone,
          alternatePhone: customer.alternatePhone || '',
          email: customer.email || '',
          address: customer.address,
          dob: customer.dob ? new Date(customer.dob).toISOString().split('T')[0] : '',
          occupation: customer.occupation || '',
          emergencyContactName: customer.emergencyContactName || '',
          emergencyContactPhone: customer.emergencyContactPhone || '',
          emergencyContactRelation: customer.emergencyContactRelation || '',
          rating: customer.rating,
          notes: customer.notes || '',
        }
      : {
          fullName: '',
          phone: '',
          alternatePhone: '',
          email: '',
          address: '',
          dob: '',
          occupation: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: 'Spouse',
          rating: 5,
          notes: '',
        },
  });

  const selectedRating = watch('rating') || 5;

  if (!isOpen) return null;

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        email: data.email?.trim() || null,
        alternatePhone: data.alternatePhone?.trim() || null,
        dob: data.dob ? new Date(data.dob) : null,
      };

      if (isEdit) {
        await api.put(`/customers/${customer.id}`, payload);
        toast.success('Customer Updated', `${data.fullName}'s profile has been updated.`);
      } else {
        await api.post('/customers', payload);
        toast.success('Customer Registered', `${data.fullName} registered successfully.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(isEdit ? 'Update Failed' : 'Registration Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit Customer Profile' : 'Register New Customer'}
              </h3>
              <p className="text-xs text-slate-400">
                Personal demographics, contact numbers, and emergency contact details.
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4 text-xs">
          {/* Personal Info */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Personal Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  {...register('fullName')}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
                {errors.fullName && (
                  <p className="text-rose-400 mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Mobile Phone *
                </label>
                <input
                  type="text"
                  {...register('phone')}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
                />
                {errors.phone && <p className="text-rose-400 mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="text"
                  {...register('alternatePhone')}
                  placeholder="e.g. +91 80 2525 0000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
                {errors.email && <p className="text-rose-400 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  {...register('dob')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Occupation / Company
                </label>
                <input
                  type="text"
                  {...register('occupation')}
                  placeholder="e.g. Software Consultant"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Residential Address *
            </label>
            <textarea
              rows={2}
              {...register('address')}
              placeholder="House/Flat No, Street, Area, City, Pin Code..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            />
            {errors.address && <p className="text-rose-400 mt-1">{errors.address.message}</p>}
          </div>

          {/* Emergency Contact */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-500" />
              <span>Emergency Contact Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  {...register('emergencyContactName')}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  {...register('emergencyContactPhone')}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Relationship
                </label>
                <select
                  {...register('emergencyContactRelation')}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rating and Staff Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Internal Customer Rating
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setValue('rating', star)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= selectedRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="font-bold text-slate-700 dark:text-slate-300 ml-2">
                  {selectedRating} Star{selectedRating > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Staff Notes / Rental Preferences
              </label>
              <textarea
                rows={2}
                {...register('notes')}
                placeholder="e.g. Prefers automatic SUVs, prompt payments..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
