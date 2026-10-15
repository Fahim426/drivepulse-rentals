import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { CustomerDetail, CustomerDocument } from '../../types/customer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { CustomerFormModal } from '../../components/customers/CustomerFormModal';
import { BlacklistModal } from '../../components/customers/BlacklistModal';
import { UploadCustomerDocModal } from '../../components/customers/UploadCustomerDocModal';
import {
  User,
  ArrowLeft,
  Phone,
  Star,
  AlertTriangle,
  Ban,
  FileCheck,
  CalendarCheck,
  Plus,
  Download,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs: overview, documents, bookings, payments
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);

  const fetchCustomer = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.get<CustomerDetail>(`/customers/${id}`);
      setCustomer(res);
    } catch (err: any) {
      toast.error('Failed to load customer', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleToggleVerify = async (docId: string) => {
    try {
      await api.patch(`/customers/documents/${docId}/verify`);
      toast.success('KYC Status Updated', 'Document verification updated.');
      fetchCustomer();
    } catch (err: any) {
      toast.error('Verification Failed', err.message);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/customers/documents/${docId}`);
      toast.success('Document Removed', 'Document deleted successfully.');
      fetchCustomer();
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

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Customer not found.</p>
        <Link to="/customers" className="text-indigo-600 text-xs font-semibold mt-2 inline-block">
          Return to directory
        </Link>
      </div>
    );
  }

  const dlDoc = customer.documents?.find((d) => d.docType === 'DRIVING_LICENCE');
  const isDlExpired = customer.isDlExpired;
  const bookings = customer.bookings || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {customer.fullName}
              </h1>
              {customer.isBlacklisted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                  <Ban className="w-3.5 h-3.5" /> Blacklisted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Eligible Renter
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {customer.occupation || 'Customer'} • Registered on{' '}
              {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Edit Profile
          </button>

          {hasRole('SUPER_ADMIN', 'MANAGER') && (
            <button
              onClick={() => setShowBlacklistModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                customer.isBlacklisted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
              }`}
            >
              {customer.isBlacklisted ? 'Remove Blacklist' : 'Blacklist'}
            </button>
          )}
        </div>
      </div>

      {/* Blacklist Warning Banner */}
      {customer.isBlacklisted && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <Ban className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-900 dark:text-rose-200">
              Customer Blacklisted from Fleet Rentals
            </h4>
            <p className="text-rose-700 dark:text-rose-300 mt-0.5">
              Reason: <span className="font-semibold">{customer.blacklistReason}</span>
            </p>
          </div>
        </div>
      )}

      {/* Licence Expiry Warning */}
      {isDlExpired && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Driving Licence Expired
            </h4>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              This customer&apos;s driving licence expired on{' '}
              {dlDoc?.expiryDate ? new Date(dlDoc.expiryDate).toLocaleDateString('en-IN') : 'an earlier date'}.
              An updated driving licence must be provided before creating any new rental booking.
            </p>
          </div>
        </div>
      )}

      {/* Quick KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Rentals</span>
          <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {bookings.length}
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">Completed & active</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Spent</span>
          <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            ₹{customer.totalSpent?.toLocaleString('en-IN') || 0}
          </h4>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Lifetime revenue</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding Balance</span>
          <h4
            className={`text-xl font-extrabold mt-1 ${
              (customer.outstandingBalance || 0) > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
            }`}
          >
            ₹{customer.outstandingBalance?.toLocaleString('en-IN') || 0}
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">Due on active bookings</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Customer Rating</span>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= customer.rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{customer.rating} of 5 Stars</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Profile & Contact', icon: User },
          { id: 'documents', label: `KYC Documents (${customer.documents?.length || 0})`, icon: FileCheck },
          { id: 'bookings', label: `Rental History (${bookings.length})`, icon: CalendarCheck },
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Contact Demographics</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">Primary Mobile:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {customer.phone}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">Alternate Phone:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {customer.alternatePhone || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">Email Address:</span>
                <span className="text-slate-800 dark:text-slate-200">{customer.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">Date of Birth:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {customer.dob ? new Date(customer.dob).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">Occupation / Company:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {customer.occupation || '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                  Residential Address
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{customer.address}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Emergency Contact */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Emergency Contact Person</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500">Contact Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {customer.emergencyContactName || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500">Emergency Phone:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {customer.emergencyContactPhone || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500">Relationship:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {customer.emergencyContactRelation || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Internal Staff Notes & Driving Record
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl">
                {customer.notes || 'No specific notes recorded for this customer.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KYC DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customer KYC & Verification Documents
              </h3>
              <p className="text-xs text-slate-400">
                Driving licence, national ID proofs (Aadhaar, Passport), and live selfie verification.
              </p>
            </div>
            <button
              onClick={() => setShowUploadDocModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customer.documents?.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No KYC documents uploaded yet.
              </div>
            ) : (
              customer.documents?.map((doc: CustomerDocument) => {
                const isDocExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();

                return (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {doc.docType.replace('_', ' ')}
                        </span>
                        {doc.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            UNVERIFIED
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        Doc #: {doc.documentNumber}
                      </p>

                      {doc.expiryDate && (
                        <div className="mt-2 text-xs">
                          <span className="text-slate-400">Validity Expiry: </span>
                          <span
                            className={`font-semibold ${
                              isDocExpired ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {new Date(doc.expiryDate).toLocaleDateString('en-IN')}
                            {isDocExpired && ' (EXPIRED)'}
                          </span>
                        </div>
                      )}
                    </div>

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
                        <span className="text-[11px] text-slate-400 italic">No file</span>
                      )}

                      <div className="flex items-center gap-2">
                        {hasRole('SUPER_ADMIN', 'MANAGER') && (
                          <button
                            onClick={() => handleToggleVerify(doc.id)}
                            className="text-xs text-slate-500 hover:text-indigo-600 font-semibold"
                          >
                            {doc.isVerified ? 'Mark Unverified' : 'Mark Verified'}
                          </button>
                        )}
                        {hasRole('SUPER_ADMIN', 'MANAGER') && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
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

      {/* TAB 3: RENTAL HISTORY */}
      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Rental History for {customer.fullName}
            </h3>
            <span className="text-xs text-slate-500">Total: {bookings.length} Bookings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Vehicle</th>
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
                      No rental bookings recorded for this customer yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {b.bookingNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {b.vehicle?.make} {b.vehicle?.model}
                        <p className="text-[10px] font-mono text-slate-400 font-normal">
                          {b.vehicle?.registrationNumber}
                        </p>
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

      {/* Modals */}
      {showEditModal && (
        <CustomerFormModal
          isOpen={showEditModal}
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchCustomer}
        />
      )}

      {showBlacklistModal && (
        <BlacklistModal
          isOpen={showBlacklistModal}
          customer={customer}
          onClose={() => setShowBlacklistModal(false)}
          onSuccess={fetchCustomer}
        />
      )}

      {showUploadDocModal && (
        <UploadCustomerDocModal
          isOpen={showUploadDocModal}
          customerId={customer.id}
          onClose={() => setShowUploadDocModal(false)}
          onSuccess={fetchCustomer}
        />
      )}
    </div>
  );
};
