import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trips from './pages/Trips';
import Services from './pages/Services';
import Companies from './pages/Companies';
import Drivers from './pages/Drivers';
import Vehicles from './pages/Vehicles';
import Contracts from './pages/Contracts';
import Financial from './pages/Financial';
import Collaborators from './pages/Collaborators';
import DriverLink from './pages/DriverLink';

const ProtectedRoute = ({ children, pageId }: { children: React.ReactNode, pageId: string }) => {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Admin has access to everything
  if (user.role === 'admin') {
    return <Layout>{children}</Layout>;
  }

  // Collaborators check specific pageId in permissions
  if (user.permissions.includes(pageId)) {
    return <Layout>{children}</Layout>;
  }

  // If no access, redirect to first allowed page or login
  const firstAllowed = user.permissions[0];
  if (firstAllowed) {
    const path = firstAllowed === 'dashboard' ? '/' : `/${firstAllowed}`;
    return <Navigate to={path} replace />;
  }

  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/servico/:token" element={<DriverLink />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute pageId="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/corridas" element={<ProtectedRoute pageId="trips"><Trips /></ProtectedRoute>} />
        <Route path="/servicos" element={<ProtectedRoute pageId="services"><Services /></ProtectedRoute>} />
        <Route path="/empresas" element={<ProtectedRoute pageId="companies"><Companies /></ProtectedRoute>} />
        <Route path="/motoristas" element={<ProtectedRoute pageId="drivers"><Drivers /></ProtectedRoute>} />
        <Route path="/carros" element={<ProtectedRoute pageId="vehicles"><Vehicles /></ProtectedRoute>} />
        <Route path="/contratos" element={<ProtectedRoute pageId="contracts"><Contracts /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute pageId="finance"><Financial /></ProtectedRoute>} />
        <Route path="/colaboradores" element={<ProtectedRoute pageId="admin"><Collaborators /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
