import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Estates from './pages/Estates';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EstateProvider } from './contexts/EstateContext';
import { ThemeProvider } from './contexts/ThemeContext';
import EstateSelector from './components/EstateSelector';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <EstateProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />
                        <EstateSelector />
                        <Dashboard />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />
                        <Profile />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/estates/*"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />
                        <Estates />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />
                        <EstateSelector />
                        <Admin />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />
                        <Settings />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />
                        <EstateSelector />
                        <Payments />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />
                        <EstateSelector />
                        <Notifications />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Toaster position="top-right" />
            </div>
          </Router>
        </EstateProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;