// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import RiderDashboard from './pages/rider/RiderDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// ProtectedRoute: checks isAuthenticated + role
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to correct dashboard if trying to access wrong one
    const routes = { Rider: '/dashboard/rider', Driver: '/dashboard/driver', Admin: '/dashboard/admin' };
    return <Navigate to={routes[user?.role] || '/'} replace />;
  }
  
  return children;
}

// PublicRoute: redirects to dashboard if already authed
function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    const routes = { Rider: '/dashboard/rider', Driver: '/dashboard/driver', Admin: '/dashboard/admin' };
    return <Navigate to={routes[user?.role] || '/'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: { background: '#0F0F1A', color: '#F0EDE8', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#F5A623', secondary: '#0F0F1A' } }
        }} 
      />
      
      <Routes>
        <Route path="/" element={<Landing />} />
        
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route path="/dashboard/rider/*" element={
          <ProtectedRoute allowedRoles={['Rider']}>
            <RiderDashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/driver/*" element={
          <ProtectedRoute allowedRoles={['Driver']}>
            <DriverDashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/admin/*" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
