import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute, Splash } from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Overview = lazy(() => import('./pages/Overview'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Goals = lazy(() => import('./pages/Goals'));
const Scheduled = lazy(() => import('./pages/Scheduled'));
const Income = lazy(() => import('./pages/Income'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

export default function App() {
  return (
    <Suspense fallback={<Splash />}>
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="goals" element={<Goals />} />
          <Route path="scheduled" element={<Scheduled />} />
          <Route path="income" element={<Income />} />
          <Route path="reports" element={<Reports />} />
          <Route path="insights" element={<Navigate to="/reports" replace />} />
          <Route path="analytics" element={<Navigate to="/reports" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="/register" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
  );
}
