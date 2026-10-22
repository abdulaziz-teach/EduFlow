import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import i18n from '../i18n/i18n';
import Button from './ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('EduFlow UI Runtime Error caught by ErrorBoundary:', error, errorInfo);
    // Auto-recover from dynamic module import caching issues after build updates
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /loading chunk|failed to fetch dynamically imported module/i.test(error?.message || '');

    if (isChunkError && !sessionStorage.getItem('eduflow_chunk_reloaded')) {
      sessionStorage.setItem('eduflow_chunk_reloaded', '1');
      window.location.reload();
    }
  }

  handleReset = () => {
    sessionStorage.removeItem('eduflow_chunk_reloaded');
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark text-text flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-subtle rounded-2xl p-8 text-center shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-2xl font-bold text-text mb-2">
              {i18n.t('common.somethingWentWrong')}
            </h1>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              {i18n.t('common.error')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                {i18n.t('common.tryAgain')}
              </button>

              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text font-medium text-sm border border-subtle transition-colors"
              >
                <Home className="w-4 h-4" />
                {i18n.t('common.backHome')}
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
