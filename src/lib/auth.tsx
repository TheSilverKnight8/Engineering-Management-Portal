import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

// preview:    no Supabase settings; only the curated content works
// loading:    checking the saved session
// signed-out: show sign in / create account
// needs-join: signed in, but has not entered the class join code yet
// ready:      in the class
export type AuthStatus = 'preview' | 'loading' | 'signed-out' | 'needs-join' | 'ready';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  /** True after opening a password-reset link, until a new password is set. */
  recovering: boolean;
  finishRecovery: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(!supabase);
  const [profile, setProfile] = useState<Profile | null>(null);
  // The user id the loaded profile belongs to, so a new sign-in never shows the
  // previous result for a moment.
  const [profileFor, setProfileFor] = useState<string | null | undefined>(undefined);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    // Do not call Supabase inside this callback; the profile loads in the effect below.
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
      setSessionLoaded(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const refreshProfile = useCallback(async () => {
    if (!supabase || !userId) {
      setProfile(null);
      setProfileFor(userId ?? null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
    setProfileFor(userId);
  }, [userId]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfile(null);
  }, []);

  let status: AuthStatus;
  if (!supabase) status = 'preview';
  else if (!sessionLoaded) status = 'loading';
  else if (!session) status = 'signed-out';
  else if (profileFor !== session.user.id) status = 'loading';
  else status = profile ? 'ready' : 'needs-join';

  const finishRecovery = useCallback(() => setRecovering(false), []);

  return (
    <AuthContext.Provider value={{ status, session, profile, recovering, finishRecovery, refreshProfile, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

/** The signed-in member's profile. Only use on screens that require sign-in. */
export function useMe(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('useMe used without a profile');
  return profile;
}
