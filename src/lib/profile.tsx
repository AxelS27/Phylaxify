import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setProfile(data);
    setError(null);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, loading, error, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'username' | 'filter_enabled' | 'model_tier' | 'sensitivity' | 'filter_message' | 'filter_name'>>,
) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  return { error: error?.message ?? null };
}
