import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/Toast';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StaffUsersPage } from './pages/users/StaffUsersPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { VehicleListPage } from './pages/vehicles/VehicleListPage';
import { VehicleDetailPage } from './pages/vehicles/VehicleDetailPage';
import { CustomerListPage } from './pages/customers/CustomerListPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { BookingListPage } from './pages/bookings/BookingListPage';
import { CreateBookingPage } from './pages/bookings/CreateBookingPage';
import { BookingDetailPage } from './pages/bookings/BookingDetailPage';
import { PaymentListPage } from './pages/payments/PaymentListPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected Routes wrapped in AppLayout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />

                {/* Staff User Management - Super Admin Only */}
                <Route
                  path="users"
                  element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                      <StaffUsersPage />
                    </ProtectedRoute>
                  }
                />

                {/* Audit Logs - Super Admin & Manager */}
                <Route
                  path="audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="unauthorized" element={<UnauthorizedPage />} />

                {/* Vehicle Fleet Management */}
                <Route path="vehicles" element={<VehicleListPage />} />
                <Route path="vehicles/:id" element={<VehicleDetailPage />} />
                {/* Customer Management */}
                <Route path="customers" element={<CustomerListPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                {/* Booking & Rental Management */}
                <Route path="bookings" element={<BookingListPage />} />
                <Route path="bookings/new" element={<CreateBookingPage />} />
                <Route path="bookings/:id" element={<BookingDetailPage />} />
                {/* Payments & Invoicing */}
                <Route path="payments/*" element={<PaymentListPage />} />
                {/* Reports & Business Analytics */}
                <Route path="reports/*" element={<ReportsPage />} />
                {/* Business Settings & Master Policies */}
                <Route
                  path="settings/*"
                  element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
