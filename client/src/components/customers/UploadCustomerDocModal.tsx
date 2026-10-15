import React, { useState } from 'react';
import { api } from '../../lib/api';
import { CustomerDocType } from '../../types/customer';
import { useToast } from '../common/Toast';
import { X, Upload, FileCheck, Camera } from 'lucide-react';

interface UploadCustomerDocModalProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadCustomerDocModal: React.FC<UploadCustomerDocModalProps> = ({
  customerId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    docType: 'DRIVING_LICENCE' as CustomerDocType,
    documentNumber: '',
    expiryDate: '',
    isVerified: true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.warning('File Required', 'Please choose a document file or photo to upload.');
      return;
    }

    if (formData.docType === 'DRIVING_LICENCE' && !formData.expiryDate) {
      toast.warning('Expiry Required', 'Driving Licence requires an expiry date for validity checks.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('docType', formData.docType);
      data.append('documentNumber', formData.documentNumber);
      if (formData.expiryDate) data.append('expiryDate', formData.expiryDate);
      data.append('isVerified', formData.isVerified ? 'true' : 'false');
      data.append('file', file);

      await api.post(`/customers/${customerId}/documents`, data);
      toast.success('Document Uploaded', `${formData.docType} attached to customer record.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Upload Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {formData.docType === 'SELFIE' ? (
                <Camera className="w-5 h-5" />
              ) : (
                <FileCheck className="w-5 h-5" />
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Upload Customer KYC Document
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
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Type *
            </label>
            <select
              value={formData.docType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  docType: e.target.value as CustomerDocType,
                  documentNumber: e.target.value === 'SELFIE' ? 'CUSTOMER-SELFIE' : formData.documentNumber,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              <option value="DRIVING_LICENCE">Driving Licence (Mandatory for rentals)</option>
              <option value="AADHAAR">Aadhaar Card (National ID)</option>
              <option value="PASSPORT">Passport (International / NRI)</option>
              <option value="VOTER_ID">Voter ID Card</option>
              <option value="SELFIE">Customer Selfie / Live Verification Photo</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document / Certificate Number *
            </label>
            <input
              type="text"
              required
              value={formData.documentNumber}
              onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
              placeholder={
                formData.docType === 'DRIVING_LICENCE'
                  ? 'e.g. KA0320180012345'
                  : formData.docType === 'AADHAAR'
                  ? 'e.g. 1234-5678-9012'
                  : 'Document Number'
              }
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          {formData.docType === 'DRIVING_LICENCE' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Licence Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                The system checks this date before creating any bookings to prevent booking with an expired licence.
              </p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              File Attachment (PDF, JPG, PNG) *
            </label>
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-[11px] text-slate-500">
                {file ? file.name : 'Choose clear scan or live camera capture photo'}
              </p>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="cust-doc-file"
              />
              <label
                htmlFor="cust-doc-file"
                className="mt-2 inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg font-semibold cursor-pointer"
              >
                Browse File
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">KYC Verified</p>
              <p className="text-[10px] text-slate-400">Staff verified physical original / DigiLocker</p>
            </div>
            <input
              type="checkbox"
              checked={formData.isVerified}
              onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
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
              {isSubmitting ? 'Uploading...' : 'Save Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
