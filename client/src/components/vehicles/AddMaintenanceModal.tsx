import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../common/Toast';
import { X, Wrench, Upload } from 'lucide-react';

interface AddMaintenanceModalProps {
  vehicleId: string;
  currentOdometer: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
  vehicleId,
  currentOdometer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    type: 'Routine Service',
    cost: '',
    vendor: '',
    odometer: currentOdometer.toString(),
    nextServiceDueDate: '',
    nextServiceDueKm: (currentOdometer + 10000).toString(),
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('serviceDate', formData.serviceDate);
      data.append('type', formData.type);
      data.append('cost', formData.cost);
      data.append('vendor', formData.vendor);
      data.append('odometer', formData.odometer);
      if (formData.nextServiceDueDate)
        data.append('nextServiceDueDate', formData.nextServiceDueDate);
      if (formData.nextServiceDueKm) data.append('nextServiceDueKm', formData.nextServiceDueKm);
      if (formData.notes) data.append('notes', formData.notes);
      if (file) data.append('invoice', file);

      await api.post(`/vehicles/${vehicleId}/maintenance`, data);
      toast.success('Maintenance Recorded', 'Service record logged and odometer synced.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to log maintenance', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Log Service & Maintenance
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Service Date *
              </label>
              <input
                type="date"
                required
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cost (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="e.g. 6500"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Maintenance Type *
            </label>
            <input
              type="text"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="e.g. 20,000 KM Routine Service / Brake Pads Replacement"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Workshop / Vendor Name *
            </label>
            <input
              type="text"
              required
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g. Authorized Service Center / Bosch Car Care"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Service Odometer (KM) *
              </label>
              <input
                type="number"
                required
                value={formData.odometer}
                onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Next Service Due (KM)
              </label>
              <input
                type="number"
                value={formData.nextServiceDueKm}
                onChange={(e) => setFormData({ ...formData, nextServiceDueKm: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Next Service Due Date
            </label>
            <input
              type="date"
              value={formData.nextServiceDueDate}
              onChange={(e) => setFormData({ ...formData, nextServiceDueDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Service Invoice / Bill Upload
            </label>
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center">
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-[11px] text-slate-500">
                {file ? file.name : 'Upload garage invoice / bill (PDF or Image)'}
              </p>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="maint-file"
              />
              <label
                htmlFor="maint-file"
                className="mt-1 inline-block px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded text-[11px] font-semibold cursor-pointer"
              >
                Browse File
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Work Notes / Parts Replaced
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Engine oil replaced with 5W-30 synthetic, new oil filter, wheel alignment done..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>

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
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Maintenance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
