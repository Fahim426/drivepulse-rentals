import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Customer } from '../../types/customer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { CustomerFormModal } from '../../components/customers/CustomerFormModal';
import { BlacklistModal } from '../../components/customers/BlacklistModal';
import {
  UserPlus,
  Search,
  Star,
  ShieldAlert,
  Eye,
  Edit2,
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const CustomerListPage: React.FC = () => {
  const { hasRole } = useAuth();
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blacklistFilter, setBlacklistFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [blacklistingCustomer, setBlacklistingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(blacklistFilter === 'BLACKLISTED' && { isBlacklisted: 'true' }),
        ...(blacklistFilter === 'ACTIVE' && { isBlacklisted: 'false' }),
        ...(ratingFilter !== 'ALL' && { rating: ratingFilter }),
      });

      const res = await api.get<{ customers: Customer[] }>(`/customers?${params.toString()}`);
      setCustomers(res.customers);
    } catch (err: any) {
      toast.error('Failed to load customers', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, blacklistFilter, ratingFilter]);

  const handleDeleteCustomer = async (c: Customer) => {
    if (!window.confirm(`Are you sure you want to delete customer ${c.fullName}?`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      toast.success('Customer Deleted', `${c.fullName} removed.`);
      fetchCustomers();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const getLicenceBadge = (customer: Customer) => {
    const dl = customer.drivingLicence;
    if (!dl) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800">
          Not Uploaded
        </span>
      );
    }

    if (!dl.expiryDate) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
          Uploaded (No Expiry)
        </span>
      );
    }

    const expDate = new Date(dl.expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          <ShieldAlert className="w-3 h-3" />
          <span>DL Expired ({Math.abs(diffDays)}d ago)</span>
        </span>
      );
    }

    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          <AlertTriangle className="w-3 h-3" />
          <span>Expires in {diffDays}d</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 className="w-3 h-3" />
        <span>Valid ({expDate.getFullYear()})</span>
      </span>
    );
  };

  const totalBlacklisted = customers.filter((c) => c.isBlacklisted).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Customer Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain customer demographics, driving licence compliance, and rental history.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Customer</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name, phone, or email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={blacklistFilter}
            onChange={(e) => setBlacklistFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
          >
            <option value="ALL">All Customers</option>
            <option value="ACTIVE">Eligible Only (Non-Blacklisted)</option>
            <option value="BLACKLISTED">Blacklisted Only ({totalBlacklisted})</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-900 dark:text-white">{customers.length}</span>{' '}
          registered customers
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Driving Licence</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Rentals & Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                          {c.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{c.fullName}</p>
                          <p className="text-[11px] text-slate-400">{c.occupation || 'Customer'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                        {c.phone}
                      </p>
                      <p className="text-[11px] text-slate-400">{c.email || '—'}</p>
                    </td>

                    <td className="py-3.5 px-4">{getLicenceBadge(c)}</td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{c.rating}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {c._count?.bookings || 0} booking(s)
                      </p>
                      {c.outstandingBalance && c.outstandingBalance > 0 ? (
                        <p className="text-[11px] text-rose-600 font-bold">
                          Due: ₹{c.outstandingBalance.toLocaleString('en-IN')}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-medium">No pending dues</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.isBlacklisted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          <Ban className="w-3 h-3" /> Blacklisted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/customers/${c.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => {
                            setEditingCustomer(c);
                            setShowAddModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {hasRole('SUPER_ADMIN', 'MANAGER') && (
                          <button
                            onClick={() => setBlacklistingCustomer(c)}
                            className={`p-1.5 rounded-lg transition ${
                              c.isBlacklisted
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800'
                            }`}
                            title={c.isBlacklisted ? 'Remove Blacklist' : 'Blacklist Customer'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        {hasRole('SUPER_ADMIN') && (
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <CustomerFormModal
          isOpen={showAddModal}
          customer={editingCustomer}
          onClose={() => {
            setShowAddModal(false);
            setEditingCustomer(null);
          }}
          onSuccess={fetchCustomers}
        />
      )}

      {/* Blacklist Modal */}
      {blacklistingCustomer && (
        <BlacklistModal
          isOpen={!!blacklistingCustomer}
          customer={blacklistingCustomer}
          onClose={() => setBlacklistingCustomer(null)}
          onSuccess={fetchCustomers}
        />
      )}
    </div>
  );
};
