import React, { useState } from 'react';
import { api } from '../../lib/api';
import { DocumentType } from '../../types/vehicle';
import { useToast } from '../common/Toast';
import { X, FileText, Upload, ShieldCheck } from 'lucide-react';

interface AddDocumentModalProps {
  vehicleId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  vehicleId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    type: 'INSURANCE' as DocumentType,
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    issuingAuthority: '',
    policyNumber: '',
    insuranceProvider: '',
    insuranceType: 'Comprehensive',
    idv: '',
    premium: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('type', formData.type);
      data.append('documentNumber', formData.documentNumber);
      data.append('issueDate', formData.issueDate);
      data.append('expiryDate', formData.expiryDate);
      if (formData.issuingAuthority) data.append('issuingAuthority', formData.issuingAuthority);
      if (formData.type === 'INSURANCE') {
        if (formData.policyNumber || formData.documentNumber)
          data.append('policyNumber', formData.policyNumber || formData.documentNumber);
        if (formData.insuranceProvider) data.append('insuranceProvider', formData.insuranceProvider);
        if (formData.insuranceType) data.append('insuranceType', formData.insuranceType);
        if (formData.idv) data.append('idv', formData.idv);
        if (formData.premium) data.append('premium', formData.premium);
      }
      if (formData.notes) data.append('notes', formData.notes);
      if (file) data.append('file', file);

      await api.post(`/vehicles/${vehicleId}/documents`, data);
      toast.success('Document Added', `${formData.type} document uploaded and verified.`);
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Upload Compliance Document
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
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DocumentType })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              <option value="INSURANCE">Insurance Policy</option>
              <option value="FITNESS">Fitness Certificate</option>
              <option value="PUC">Smoke Test / PUC Certificate</option>
              <option value="RC">RC (Registration Certificate)</option>
              <option value="ROAD_TAX">Road Tax Token</option>
              <option value="PERMIT">Commercial Transport Permit</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Document / Certificate No. *
              </label>
              <input
                type="text"
                required
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="e.g. POL-992102"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issuing Authority / Agency
              </label>
              <input
                type="text"
                value={formData.issuingAuthority}
                onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                placeholder="e.g. KA01 RTO / HDFC"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issue Date *
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
                Expiry Date *
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

          {/* Insurance specific fields */}
          {formData.type === 'INSURANCE' && (
            <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
              <h5 className="font-bold text-indigo-900 dark:text-indigo-300 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Insurance Details</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={formData.insuranceProvider}
                    onChange={(e) =>
                      setFormData({ ...formData, insuranceProvider: e.target.value })
                    }
                    placeholder="e.g. HDFC ERGO / ICICI Lombard"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Insurance Policy Type
                  </label>
                  <select
                    value={formData.insuranceType}
                    onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Comprehensive">Comprehensive</option>
                    <option value="Zero Dep">Zero Dep (Bumper to Bumper)</option>
                    <option value="Third Party">Third Party Only</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Insured Declared Value (IDV ₹)
                  </label>
                  <input
                    type="number"
                    value={formData.idv}
                    onChange={(e) => setFormData({ ...formData, idv: e.target.value })}
                    placeholder="e.g. 1500000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Annual Premium Paid (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.premium}
                    onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                    placeholder="e.g. 32000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Scan / PDF Upload
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-slate-500 text-xs">
                {file ? file.name : 'Select or drag PDF, JPG, PNG document'}
              </p>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="doc-file-upload"
              />
              <label
                htmlFor="doc-file-upload"
                className="mt-2 inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg font-semibold cursor-pointer"
              >
                Browse File
              </label>
            </div>
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
