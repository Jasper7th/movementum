import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { getFriendlyAuthError } from '../domain/auth';
import { notificationService } from '../services/notificationService';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

interface AuthResult { ok: boolean; error?: string; requiresEmailConfirmation?: boolean }
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  hydrated: boolean;
  recoveringPassword: boolean;
  configured: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  finishPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const callbackUrl = 'momentum://auth/callback';
const resetUrl = 'momentum://auth/reset-password';

async function applyAuthUrl(url: string): Promise<boolean> {
  if (!supabase || !url.startsWith('momentum://auth/')) return false;
  const normalized = url.replace('#', '?');
  const parsed = new URL(normalized);
  const accessToken = parsed.searchParams.get('access_token');
  const refreshToken = parsed.searchParams.get('refresh_token');
  if (!accessToken || !refreshToken) return url.startsWith(resetUrl);
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
  return url.startsWith(resetUrl) || parsed.searchParams.get('type') === 'recovery';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(false);

  useEffect(() => {
    if (!supabase) { setHydrated(true); return; }
    const client = supabase;
    let active = true;
    void client.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setHydrated(true); } });
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true);
    });
    const appListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh();
    });
    void Linking.getInitialURL().then((url) => { if (url) void applyAuthUrl(url).then(setRecoveringPassword).catch(() => undefined); });
    const linkListener = Linking.addEventListener('url', ({ url }) => { void applyAuthUrl(url).then((recovery) => recovery && setRecoveringPassword(true)).catch(() => undefined); });
    return () => { active = false; listener.subscription.unsubscribe(); appListener.remove(); linkListener.remove(); };
  }, []);

  const unavailable = (): AuthResult => ({ ok: false, error: 'Supabase is not configured. Add the EXPO_PUBLIC_SUPABASE values and restart Movementum.' });
  const value: AuthContextValue = {
    session, user: session?.user ?? null, hydrated, recoveringPassword, configured: isSupabaseConfigured,
    signUp: async (email, password) => {
      if (!supabase) return unavailable();
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: callbackUrl } });
      return error ? { ok: false, error: getFriendlyAuthError(error) } : { ok: true, requiresEmailConfirmation: !data.session };
    },
    signIn: async (email, password) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { ok: false, error: getFriendlyAuthError(error) } : { ok: true };
    },
    signOut: async () => {
      await notificationService.cancelAllMomentumNotifications();
      if (!supabase) { setSession(null); return unavailable(); }
      const { error } = await supabase.auth.signOut();
      return error ? { ok: false, error: getFriendlyAuthError(error) } : { ok: true };
    },
    sendPasswordReset: async (email) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetUrl });
      return error ? { ok: false, error: getFriendlyAuthError(error) } : { ok: true };
    },
    updatePassword: async (password) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { ok: false, error: getFriendlyAuthError(error) } : { ok: true };
    },
    finishPasswordRecovery: () => setRecoveringPassword(false),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
