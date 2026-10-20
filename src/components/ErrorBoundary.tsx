import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-rose-500/30 rounded-2xl p-6 text-center text-white shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">
              काहीतरी अनपेक्षित त्रुटी आली / Unexpected Error
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-700/50 text-left overflow-auto max-h-32">
              {this.state.error?.message || 'An unknown error occurred while rendering the module.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                पुन्हा लोड करा / Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private get fallback(): ReactNode {
    return this.props.fallback;
  }
}
