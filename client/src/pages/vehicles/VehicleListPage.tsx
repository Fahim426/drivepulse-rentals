import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Vehicle } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { VehicleFormModal } from '../../components/vehicles/VehicleFormModal';
import { ComplianceAlertsModal } from '../../components/vehicles/ComplianceAlertsModal';
import {
  Plus,
  Search,
  Grid,
  List,
  ShieldAlert,
  AlertTriangle,
  Fuel,
  Gauge,
  Users,
  Settings,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export const VehicleListPage: React.FC = () => {
  const { hasRole } = useAuth();
  const toast = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fuelFilter, setFuelFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(fuelFilter !== 'ALL' && { fuelType: fuelFilter }),
        ...(categoryFilter !== 'ALL' && { type: categoryFilter }),
      });

      const res = await api.get<{ vehicles: Vehicle[] }>(`/vehicles?${params.toString()}`);
      setVehicles(res.vehicles);
    } catch (err: any) {
      toast.error('Failed to load fleet', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, statusFilter, fuelFilter, categoryFilter]);

  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove ${v.make} ${v.model} (${v.registrationNumber}) from active fleet?`)) {
      return;
    }
    try {
      await api.delete(`/vehicles/${v.id}`);
      toast.success('Vehicle Deleted', `${v.registrationNumber} has been removed.`);
      fetchVehicles();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            AVAILABLE
          </span>
        );
      case 'RENTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            RENTED
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            MAINTENANCE
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300">
            INACTIVE
          </span>
        );
    }
  };

  const getCategoryBadge = (type?: string) => {
    switch (type) {
      case 'BIKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-sm">
            🏍️ Bike
          </span>
        );
      case 'SCOOTER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm">
            🛵 Scooter
          </span>
        );
      case 'CAR':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm">
            🚗 Car
          </span>
        );
    }
  };

  const blockedCount = vehicles.filter((v) => v.compliance?.isBlocked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Fleet Vehicle Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your rental inventory, technical specifications, rates, and compliance certificates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Compliance Alerts Drawer Trigger */}
          <button
            onClick={() => setShowComplianceModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm relative"
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Compliance Alerts</span>
            {blockedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                {blockedCount} Blocked
              </span>
            )}
          </button>

          {/* Add Vehicle Button (Super Admin & Manager) */}
          {hasRole('SUPER_ADMIN', 'MANAGER') && (
            <button
              onClick={() => {
                setEditingVehicle(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs: All, Cars, Bikes, Scooters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', label: 'All Fleet' },
          { id: 'CAR', label: '🚗 Cars' },
          { id: 'BIKE', label: '🏍️ Bikes' },
          { id: 'SCOOTER', label: '🛵 Scooters' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 shadow-sm ${
              categoryFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search registration, make, model..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="RENTED">Rented</option>
            <option value="MAINTENANCE">In Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
          >
            <option value="ALL">All Fuels</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
            <option value="Hybrid">Hybrid</option>
            <option value="CNG">CNG</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading fleet vehicles...
            </div>
          ) : vehicles.length === 0 ? (
            <div className="col-span-full py-16 px-4 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm">
                🚗
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No vehicles in fleet yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {search || statusFilter !== 'ALL' || fuelFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'No vehicles match your active search filters. Try clearing filters.'
                  : 'Your fleet is currently empty. Add your cars, bikes, or scooters manually to begin managing rentals.'}
              </p>
              {!search && statusFilter === 'ALL' && fuelFilter === 'ALL' && categoryFilter === 'ALL' && (
                <button
                  onClick={() => {
                    setEditingVehicle(null);
                    setShowAddModal(true);
                  }}
                  className="mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-indigo-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Vehicle</span>
                </button>
              )}
            </div>
          ) : (
            vehicles.map((v) => {
              const defaultPhoto =
                v.photos?.[0] ||
                'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80';
              const isBlocked = v.compliance?.isBlocked;

              return (
                <div
                  key={v.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group"
                >
                  {/* Photo & Status Overlay */}
                  <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={defaultPhoto}
                      alt={`${v.make} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(v.status)}
                      {getCategoryBadge(v.type)}
                    </div>

                    {/* Compliance Alert Ribbon */}
                    {isBlocked ? (
                      <div className="absolute bottom-3 left-3 right-3 py-1 px-2.5 rounded-xl bg-rose-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Booking Blocked: {v.compliance?.reasons[0]}
                        </span>
                      </div>
                    ) : v.compliance?.expiringSoonDocsCount ? (
                      <div className="absolute bottom-3 left-3 right-3 py-1 px-2.5 rounded-xl bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{v.compliance.expiringSoonDocsCount} document(s) expiring soon</span>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 right-3 p-1 rounded-full bg-emerald-500 text-white shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                            {v.make} {v.model}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {v.variant || 'Standard'} • {v.year} • {v.color}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-extrabold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {v.registrationNumber}
                        </span>
                      </div>

                      {/* Specs Tags */}
                      <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                          <Fuel className="w-3 h-3 text-indigo-500" />
                          {v.fuelType}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                          <Settings className="w-3 h-3 text-indigo-500" />
                          {v.transmission}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                          <Users className="w-3 h-3 text-indigo-500" />
                          {v.seats} Seats
                        </span>
                      </div>
                    </div>

                    {/* Rates & Actions Footer */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Rental Tariff
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-extrabold text-[11px]">
                            Custom
                          </span>
                          <span className="text-[11px] text-slate-500">Rent by People</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/vehicles/${v.id}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </Link>

                        {hasRole('SUPER_ADMIN', 'MANAGER') && (
                          <button
                            onClick={() => {
                              setEditingVehicle(v);
                              setShowAddModal(true);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Vehicle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {hasRole('SUPER_ADMIN') && (
                          <button
                            onClick={() => handleDeleteVehicle(v)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Specs</th>
                  <th className="py-3 px-4">Tariff Policy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading fleet...
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No vehicles registered yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click "Add Vehicle" to register your cars, bikes, or scooters manually.
                      </p>
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{v.make} {v.model}</span>
                          {getCategoryBadge(v.type)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal">{v.variant || 'Standard'}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {v.registrationNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {v.fuelType} • {v.transmission} • {v.seats} Seats
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Rent Based on People
                        </span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(v.status)}</td>
                      <td className="py-3 px-4">
                        {v.compliance?.isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            <ShieldAlert className="w-3 h-3" /> Blocked (Expired Docs)
                          </span>
                        ) : v.compliance?.expiringSoonDocsCount ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" /> Expiring Soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> All Docs Valid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/vehicles/${v.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View Vehicle"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {hasRole('SUPER_ADMIN', 'MANAGER') && (
                            <button
                              onClick={() => {
                                setEditingVehicle(v);
                                setShowAddModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Vehicle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {hasRole('SUPER_ADMIN') && (
                            <button
                              onClick={() => handleDeleteVehicle(v)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Delete Vehicle"
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
      )}

      {/* Vehicle Form Modal */}
      {showAddModal && (
        <VehicleFormModal
          isOpen={showAddModal}
          vehicle={editingVehicle}
          onClose={() => {
            setShowAddModal(false);
            setEditingVehicle(null);
          }}
          onSuccess={fetchVehicles}
        />
      )}

      {/* Compliance Alerts Modal */}
      {showComplianceModal && (
        <ComplianceAlertsModal
          isOpen={showComplianceModal}
          onClose={() => setShowComplianceModal(false)}
        />
      )}
    </div>
  );
};
