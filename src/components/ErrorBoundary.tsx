import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time crashes anywhere below it and shows a recovery screen
 * instead of React unmounting the tree and leaving a blank white page.
 *
 * "Try again" clears the error and re-renders in place, which recovers from
 * transient faults (a malformed record, a a failed lazy chunk) without losing
 * the user's session. "Reload app" is the harder reset.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-dvh w-full bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 shadow-xl flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-gray-900">Something went wrong</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              The screen failed to load. Your saved bookings and settings are
              safe — this only affects the current view.
            </p>
          </div>

          {this.state.error?.message && (
            <p className="w-full text-[11px] font-mono bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-600 break-words text-left">
              {this.state.error.message}
            </p>
          )}

          <div className="flex items-center gap-2 w-full pt-1">
            <button
              onClick={this.handleRetry}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
