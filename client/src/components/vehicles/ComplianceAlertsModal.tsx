import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ComplianceAlertsResponse } from '../../types/vehicle';
import { useToast } from '../common/Toast';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface ComplianceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComplianceAlertsModal: React.FC<ComplianceAlertsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<ComplianceAlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expired' | '7days' | '15days' | '30days'>('expired');

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<ComplianceAlertsResponse>('/vehicles/compliance/alerts');
      setData(res);
      // Auto-select first tab with data
      if (res.summary.expiredCount > 0) {
        setActiveTab('expired');
      } else if (res.summary.expiring7DaysCount > 0) {
        setActiveTab('7days');
      } else if (res.summary.expiring15DaysCount > 0) {
        setActiveTab('15days');
      } else {
        setActiveTab('30days');
      }
    } catch (err: any) {
      toast.error('Failed to load compliance alerts', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getListForTab = () => {
    if (!data) return [];
    switch (activeTab) {
      case 'expired':
        return data.expired;
      case '7days':
        return data.expiring7Days;
      case '15days':
        return data.expiring15Days;
      case '30days':
        return data.expiring30Days;
    }
  };

  const currentList = getListForTab();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Fleet Compliance & Document Expiry Alerts
              </h3>
              <p className="text-xs text-slate-400">
                Track regulatory document expiries across your active fleet to prevent impoundment and illegal bookings.
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

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 my-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('expired')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'expired'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Expired Documents</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-700/30 text-white">
              {data?.summary.expiredCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('7days')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === '7days'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Expiring in 7 Days</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-700/30 text-white">
              {data?.summary.expiring7DaysCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('15days')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === '15days'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring in 15 Days</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-700/30 text-white">
              {data?.summary.expiring15DaysCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('30days')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === '30days'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring in 30 Days</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700/30 text-white">
              {data?.summary.expiring30DaysCount || 0}
            </span>
          </button>
        </div>

        {/* Content Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Doc Type</th>
                  <th className="py-2.5 px-3">Doc Number</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Checking fleet compliance...
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No documents in this compliance threshold category.
                    </td>
                  </tr>
                ) : (
                  currentList.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {item.registrationNumber}
                        </span>
                        <p className="text-[10px] text-slate-400">{item.vehicleName}</p>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {item.type}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {item.documentNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {new Date(item.expiryDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.daysRemaining < 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            Expired ({Math.abs(item.daysRemaining)}d ago)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            {item.daysRemaining} days left
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/vehicles/${item.vehicleId}?tab=documents`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
