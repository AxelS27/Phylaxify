import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ProfileProvider } from './lib/profile';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Offerings } from './pages/Offerings';
import { AegisList } from './pages/AegisList';
import { Settings } from './pages/Settings';
import { TestLab } from './pages/TestLab';
import { Reports } from './pages/Reports';
import { Upgrade } from './pages/Upgrade';
import { Overlay } from './pages/Overlay';

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth?tab=login" replace />} />
            <Route path="/register" element={<Navigate to="/auth?tab=register" replace />} />
            <Route path="/overlay" element={<Overlay />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/offerings"
              element={
                <ProtectedRoute>
                  <Offerings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aegis-list"
              element={
                <ProtectedRoute>
                  <AegisList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-lab"
              element={
                <ProtectedRoute>
                  <TestLab />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upgrade"
              element={
                <ProtectedRoute>
                  <Upgrade />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ProfileProvider>
    </AuthProvider>
  );
}
