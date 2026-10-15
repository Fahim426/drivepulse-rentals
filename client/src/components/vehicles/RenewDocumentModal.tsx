import React, { useState } from 'react';
import { api } from '../../lib/api';
import { VehicleDocument } from '../../types/vehicle';
import { useToast } from '../common/Toast';
import { X, RefreshCw, Upload, History } from 'lucide-react';

interface RenewDocumentModalProps {
  document: VehicleDocument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RenewDocumentModal: React.FC<RenewDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    documentNumber: document.documentNumber,
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    premium: document.premium ? document.premium.toString() : '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('documentNumber', formData.documentNumber);
      data.append('issueDate', formData.issueDate);
      data.append('expiryDate', formData.expiryDate);
      if (formData.premium) data.append('premium', formData.premium);
      if (formData.notes) data.append('notes', formData.notes);
      if (file) data.append('file', file);

      await api.put(`/vehicles/documents/${document.id}/renew`, data);
      toast.success(
        'Document Renewed',
        `${document.type} renewed. Previous validity archived to history.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Renewal Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Renew {document.type}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Document Archive Notice */}
        <div className="my-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
          <History className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Automatic Versioning:</span> Current validity (Doc #{' '}
            {document.documentNumber}, Expiry:{' '}
            {new Date(document.expiryDate).toLocaleDateString('en-IN')}) will be archived into renewal
            history.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Policy / Document Number *
            </label>
            <input
              type="text"
              required
              value={formData.documentNumber}
              onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Issue Date *
              </label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {document.type === 'INSURANCE' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Renewal Premium Paid (₹)
              </label>
              <input
                type="number"
                value={formData.premium}
                onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                placeholder="e.g. 31000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Upload New Document PDF / Scan
            </label>
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center">
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-[11px] text-slate-500">{file ? file.name : 'Choose updated scan'}</p>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="renew-file"
              />
              <label
                htmlFor="renew-file"
                className="mt-1 inline-block px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded text-[11px] font-semibold cursor-pointer"
              >
                Browse File
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Renewal Notes / Endorsements
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Added Zero Dep add-on cover..."
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
              {isSubmitting ? 'Renewing...' : 'Confirm Renewal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
