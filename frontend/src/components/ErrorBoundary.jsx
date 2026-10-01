import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl font-bold shadow-inner">
              ⚠️
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              An unexpected error occurred. You can refresh the application or return to the main dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                Refresh Application
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                Return to Home
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 overflow-auto max-h-48">
                <summary className="font-semibold text-slate-700 cursor-pointer select-none">
                  Technical Error Details
                </summary>
                <p className="mt-2 font-mono text-rose-700 break-words whitespace-pre-wrap">
                  {this.state.error?.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 font-mono text-[11px] text-slate-500 whitespace-pre-wrap overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
