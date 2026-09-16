import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  calendar_connected: boolean;
  calendar_last_sync: string | null;
}

/**
 * Mobile keyboards capitalize the first letter and readily append a trailing
 * space, and Supabase stores addresses lowercased — so " Venkat@x.com " fails
 * as "Invalid login credentials" against a perfectly good account. Normalize
 * on the way in so signup and signin can never disagree about the address.
 */
export const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<{
    inWaitlist: boolean;
    status: 'not_found' | 'pending' | 'approved' | 'rejected';
    message: string;
  } | null>(null);
  const { toast } = useToast();

  // Check if Google provider is enabled
  useEffect(() => {
    // Check via environment variable or config
    // For now, we'll assume Google is NOT enabled by default
    // This can be updated if Google OAuth is configured
    // Force enable Google Auth since we are now Google-only
    // This avoids issues where the env var might be missing in Vercel
    setIsGoogleEnabled(true);
  }, []);

  // Fetch profile data
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  }, []);

  // Check waitlist status
  const checkWaitlistStatus = useCallback(async (email: string) => {
    try {
      const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://rivly-api.gnvenkatapathiraju.workers.dev';
      const response = await fetch(`${workerUrl}/api/waitlist/status?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        console.error('Failed to check waitlist status');
        return null;
      }

      const data = await response.json();
      setWaitlistStatus(data);
      return data;
    } catch (error) {
      console.error('Error checking waitlist status:', error);
      return null;
    }
  }, []);

  /**
   * The waitlist gate. Signs out anyone whose email isn't an approved waitlist
   * entry. Returns true when the user was blocked.
   *
   * This used to sign out silently, which made a rejected login look identical
   * to a broken one: the "Successfully signed in" toast fired, then the app
   * bounced straight back to /login with no explanation. Always say why.
   */
  const enforceWaitlistGate = useCallback(async (email: string | undefined): Promise<boolean> => {
    if (!email) return false;
    const status = await checkWaitlistStatus(email);
    // A null status means the check itself failed (worker down, offline).
    // Fail open — don't lock people out because of a network blip.
    if (!status) return false;
    if (status.status === 'approved') return false;

    console.warn(`[auth] Blocked sign-in: waitlist status "${status.status}"`);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
    toast({
      title:
        status.status === 'not_found'
          ? 'This email is not on the waitlist'
          : status.status === 'pending'
          ? 'Your access is still pending'
          : 'Access not approved',
      description: `${status.message} (signed in as ${email})`,
      variant: 'destructive',
    });
    return true;
  }, [checkWaitlistStatus, toast]);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Clear guest mode when a real user logs in
          setIsGuest(false);

          if (await enforceWaitlistGate(session.user.email)) return;

          // Defer profile fetch to avoid blocking
          setTimeout(async () => {
            const profile = await fetchProfile(session.user.id);
            setProfile(profile);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Clear guest mode if there's a real session
        setIsGuest(false);

        if (await enforceWaitlistGate(session.user.email)) return;

        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, enforceWaitlistGate]);

  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return { error };
    }

    toast({
      title: 'Account created',
      description: 'Welcome to Rivly!',
    });
    setLoading(false);
    return { data };
  }, [toast]);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return { error };
    }

    toast({
      title: 'Welcome back!',
      description: 'Successfully signed in.',
    });
    setLoading(false);
    return { data };
  }, [toast]);

  // Sign in with Magic Link (OTP)
  const signInWithMagicLink = useCallback(async (email: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return { error };
    }

    toast({
      title: 'Check your email',
      description: 'We sent you a sign-in link.',
    });
    setLoading(false);
    return { data };
  }, [toast]);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleEnabled) {
      // Don't show toast - let UI handle this with diagnostics sheet
      return { error: new Error('Google provider not enabled') };
    }

    // Check if we're running on a native platform (Android/iOS)
    const isNative = window.hasOwnProperty('Capacitor') && (window as any).Capacitor.getPlatform() !== 'web';
    const redirectTo = isNative 
      ? 'com.rivly.in://auth/callback' 
      : undefined;



    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });


    if (error) {
      // Handle provider not enabled error gracefully
      if (error.message.includes('provider') || error.message.includes('not enabled')) {
        toast({
          title: 'Sign-in method not available',
          description: 'Please use Email login instead.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      return { error };
    }

    return { data };
  }, [toast, isGoogleEnabled]);

  const [isGuest, setIsGuest] = useState(false);

  // Sign in as Guest
  const signInAsGuest = useCallback(async () => {
    setLoading(true);
    setIsGuest(true);
    
    // Create a dummy guest profile/user for local state compatibility
    // We don't save this to Supabase, just local state
    const guestUser: any = {
      id: 'guest-user',
      email: 'guest@rivly.app',
      user_metadata: { full_name: 'Guest' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    
    setUser(guestUser);
    setProfile({
      id: 'guest-profile',
      user_id: 'guest-user',
      name: 'Guest',
      avatar_url: null,
      calendar_connected: false,
      calendar_last_sync: null
    });
    
    setLoading(false);
    toast({
      title: 'Welcome Guest',
      description: 'You are now in guest mode.',
    });
  }, [toast]);

  // Sign out
  const signOut = useCallback(async () => {
    // If guest, just clear state
    if (isGuest) {
      setIsGuest(false);
      setUser(null);
      setProfile(null);
      setSession(null);
      toast({
        title: 'Signed out',
        description: 'Guest session ended.',
      });
      return {};
    }

    console.log("Starting forced signout...");

    // 1. Aggressively clear ALL Supabase auth tokens and Rivly local storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Local storage clear error", e);
    }

    // 2. CLEAR STATE IMMEDIATELY 
    setUser(null);
    setProfile(null);
    setSession(null);

    // 3. Fire-and-forget network signout so it NEVER blocks the UI
    supabase.auth.signOut().catch(() => {});

    // 4. Force a hard reload to the landing page immediately
    window.location.href = '/';
    
    return {};
  }, [isGuest]);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'name' | 'avatar_url'>>) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (isGuest) {
       // Mock update for guest
       setProfile(prev => prev ? ({ ...prev, ...updates }) : null);
       return { data: { ...profile, ...updates } };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setProfile(data as Profile);
    toast({
      title: 'Profile updated',
      description: 'Your changes have been saved.',
    });
    return { data };
  }, [user, toast, isGuest, profile]);

  // Sign in with Google ID Token (Native/Popup flow)
  const signInWithIdToken = useCallback(async (idToken: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return { error };
    }

    toast({
      title: 'Welcome!',
      description: 'Successfully signed in with Google.',
    });
    setLoading(false);
    return { data };
  }, [toast]);

  /**
   * Step 1 of recovery: email the user a link back to /reset-password.
   * Deliberately reports success even when the address is unknown — telling a
   * stranger which emails have accounts is an enumeration leak.
   */
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Could not send reset link', description: error.message, variant: 'destructive' });
      return { error };
    }
    toast({
      title: 'Check your email',
      description: 'If that address has an account, a reset link is on its way.',
    });
    return { data: true };
  }, [toast]);

  /** Step 2 of recovery: set the new password using the recovery session. */
  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: 'Could not update password', description: error.message, variant: 'destructive' });
      return { error };
    }
    toast({ title: 'Password updated', description: 'You are signed in.' });
    return { data: true };
  }, [toast]);

  return {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!user || isGuest, // Considered authenticated if user exists OR is guest
    isGuest,
    isGoogleEnabled,
    waitlistStatus,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithIdToken,
    signInAsGuest,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    checkWaitlistStatus,
    refetchProfile: () => user && !isGuest && fetchProfile(user.id).then(setProfile),
  };
}
