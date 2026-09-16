/**
 * Error Boundary for catching React errors
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { isChunkLoadError, recoverFromStaleChunk } from '@/lib/chunkReload';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);

    // A failed dynamic import after a new deploy means we're holding a stale
    // chunk reference — reload once to recover instead of showing the error UI.
    if (isChunkLoadError(error)) {
      recoverFromStaleChunk();
      return;
    }

    // Log to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card rounded-2xl border border-border p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.handleRetry} className="w-full">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reload App
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
