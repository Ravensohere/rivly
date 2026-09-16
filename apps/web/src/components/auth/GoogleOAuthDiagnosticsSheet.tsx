/**
 * Google OAuth Diagnostics Sheet
 * 
 * Shows actionable setup instructions when OAuth is misconfigured
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, CheckCircle2, AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { runAuthDiagnostics, AuthDiagnostics } from '@/lib/authDiagnostics';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GoogleOAuthDiagnosticsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleOAuthDiagnosticsSheet({ open, onOpenChange }: GoogleOAuthDiagnosticsSheetProps) {
  const diagnostics = runAuthDiagnostics();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    urls: true,
    steps: false,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy manually',
        variant: 'destructive',
      });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85dvh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Google Sign-in Setup
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="pb-8 space-y-5">
          {/* Status Overview */}
          <div className="p-4 rounded-xl bg-muted/30 space-y-3">
            <StatusRow 
              label="Supabase configured" 
              ok={diagnostics.supabaseConfigured} 
            />
            <StatusRow 
              label="Google OAuth enabled" 
              ok={diagnostics.googleOAuthEnabled} 
            />
            <StatusRow 
              label="Running on allowed origin" 
              ok={!!diagnostics.currentOrigin} 
            />
          </div>

          {diagnostics.issues.length > 0 && (
            <div className="p-4 rounded-xl bg-destructive/10 space-y-2">
              <p className="text-sm font-medium text-destructive">Issues found:</p>
              {diagnostics.issues.map((issue, i) => (
                <p key={i} className="text-xs text-destructive/80">• {issue}</p>
              ))}
            </div>
          )}

          {/* Required URLs Section */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleSection('urls')}
              className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium text-foreground">Required URLs</span>
              {expandedSections.urls ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            
            {expandedSections.urls && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 pt-0 space-y-4"
              >
                <UrlRow
                  label="Supabase Callback (add to Google Cloud Console)"
                  url={diagnostics.redirectUrls.supabaseCallback}
                  onCopy={copyToClipboard}
                />
                <UrlRow
                  label="App Auth Callback"
                  url={diagnostics.redirectUrls.appCallback}
                  onCopy={copyToClipboard}
                />
                <UrlRow
                  label="Calendar Callback"
                  url={diagnostics.redirectUrls.calendarCallback}
                  onCopy={copyToClipboard}
                />
                <UrlRow
                  label="Site URL"
                  url={diagnostics.redirectUrls.siteUrl}
                  onCopy={copyToClipboard}
                />
                <UrlRow
                  label="Current Origin"
                  url={diagnostics.currentOrigin}
                  onCopy={copyToClipboard}
                />
              </motion.div>
            )}
          </div>

          {/* Setup Steps Section */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleSection('steps')}
              className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium text-foreground">Setup Steps</span>
              {expandedSections.steps ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            
            {expandedSections.steps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="p-4 pt-0 space-y-3"
              >
                <SetupStep 
                  number={1}
                  title="Google Cloud Console"
                  description="Create OAuth 2.0 credentials and add the Supabase callback URL as an authorized redirect URI."
                />
                <SetupStep 
                  number={2}
                  title="Supabase Dashboard"
                  description="Enable Google provider and add your Client ID and Client Secret."
                />
                <SetupStep 
                  number={3}
                  title="Set Environment Variable"
                  description="Add VITE_GOOGLE_AUTH_ENABLED=true to enable the Google button."
                />
              </motion.div>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <span className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-full',
        ok 
          ? 'bg-green-500/10 text-green-600' 
          : 'bg-amber-500/10 text-amber-600'
      )}>
        {ok ? 'OK' : 'Not ready'}
      </span>
    </div>
  );
}

function UrlRow({ 
  label, 
  url, 
  onCopy 
}: { 
  label: string; 
  url: string; 
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-muted/50 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap text-foreground">
          {url}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onCopy(url, label)}
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function SetupStep({ 
  number, 
  title, 
  description 
}: { 
  number: number; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-medium text-primary">{number}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
