import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background-color flex items-center justify-center">
        <span className="material-symbols-outlined text-gold animate-spin text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?tab=login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
