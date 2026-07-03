import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-critical/10 flex items-center justify-center mb-6">
            <AlertTriangle size={28} className="text-critical" />
          </div>
          <h2 className="text-xl font-heading font-medium text-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-secondary max-w-md mb-6">
            An unexpected error occurred. This has been logged. You can try recovering by clicking below.
          </p>
          {this.state.error && (
            <pre className="text-xs text-tertiary bg-elevated border border-borderLight rounded-lg p-4 mb-6 max-w-lg overflow-x-auto font-mono">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accentHover transition-colors shadow-card"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
