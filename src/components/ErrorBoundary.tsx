import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitleKh?: string;
  fallbackTitleEn?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AMS ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });

    const msg = (error?.message || '').toLowerCase();
    const isQuota = msg.includes('quota') || msg.includes('exceeded') || error.name === 'QuotaExceededError';

    if (isQuota) {
      try {
        console.warn('[ErrorBoundary] QuotaExceededError detected. Auto-purging bloated caches...');
        const keysToClear = [
          'attend_records',
          'attend_staff_alerts',
          'attend_audit_logs',
          'attend_transfers',
          'attend_leaves',
          'hrms_backup_snapshots',
        ];
        keysToClear.forEach((k) => {
          try { localStorage.removeItem(k); } catch (_) {}
        });

        // Auto-heal once seamlessly without trapping the user
        const autoHealed = sessionStorage.getItem('quota_auto_healed');
        if (!autoHealed) {
          sessionStorage.setItem('quota_auto_healed', '1');
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      } catch (_) {}
    }
  }

  private handleReload = () => {
    try {
      // Clear heavy cache to ensure safe reload
      ['attend_records', 'attend_staff_alerts', 'attend_audit_logs'].forEach((k) => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    } catch (_) {}
    window.location.reload();
  };

  private handleResetCacheAndReload = () => {
    try {
      // Clear local cache keys except user credentials if possible
      const keysToClear = [
        'attend_records',
        'attend_leaves',
        'attend_transfers',
        'attend_shifts',
        'attend_staff_alerts',
        'attend_audit_logs',
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleFullReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {this.props.fallbackTitleKh || 'ប្រព័ន្ធកំពុងស្ដារឡើងវិញ (Auto-Recovery)'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {this.props.fallbackTitleEn || 'An unexpected display glitch occurred. No attendance data was lost.'}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-[11px] font-mono text-rose-300/80 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ផ្ទុកឡើងវិញ (Reload Application)</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600/60 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>សម្អាតទិន្នន័យបណ្តោះអាសន្ន & ផ្ទុកឡើងវិញ (Quick Repair)</span>
              </button>

              <button
                type="button"
                onClick={this.handleFullReset}
                className="w-full py-2 px-3 text-slate-400 hover:text-slate-300 font-medium text-[11px] transition flex items-center justify-center space-x-1.5"
              >
                <Home className="w-3 h-3" />
                <span>ត្រឡប់ទៅទំព័រដើម (Reset to Home)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
