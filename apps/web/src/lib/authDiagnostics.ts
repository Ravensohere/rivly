/**
 * Auth Diagnostics - Runtime checks for OAuth configuration
 * 
 * Provides actionable feedback when Google OAuth is misconfigured
 */

export interface AuthDiagnostics {
  supabaseConfigured: boolean;
  googleOAuthEnabled: boolean;
  currentOrigin: string;
  projectRef: string;
  issues: string[];
  redirectUrls: {
    supabaseCallback: string;
    appCallback: string;
    calendarCallback: string;
    siteUrl: string;
  };
}

export function runAuthDiagnostics(): AuthDiagnostics {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
  const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true';
  
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || projectId;
  
  const issues: string[] = [];
  
  if (!supabaseUrl) {
    issues.push('Missing VITE_SUPABASE_URL environment variable');
  }
  
  if (!supabaseKey) {
    issues.push('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable');
  }
  
  if (!googleEnabled) {
    issues.push('Google OAuth not enabled (VITE_GOOGLE_AUTH_ENABLED != true)');
  }
  
  return {
    supabaseConfigured: !!supabaseUrl && !!supabaseKey,
    googleOAuthEnabled: googleEnabled,
    currentOrigin: origin,
    projectRef,
    issues,
    redirectUrls: {
      supabaseCallback: projectRef 
        ? `https://${projectRef}.supabase.co/auth/v1/callback`
        : 'https://<project-ref>.supabase.co/auth/v1/callback',
      appCallback: `${origin}/auth/callback`,
      calendarCallback: `${origin}/calendar/callback`,
      siteUrl: origin,
    },
  };
}

export function isGoogleOAuthReady(): boolean {
  const diagnostics = runAuthDiagnostics();
  return diagnostics.supabaseConfigured && diagnostics.googleOAuthEnabled && diagnostics.issues.length === 0;
}
