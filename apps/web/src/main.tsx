import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-lg w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-xl flex items-center justify-center mx-auto text-2xl font-bold font-mono">
              ⚠
            </div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">
              Erro de Renderização
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Ocorreu uma inconsistência temporária ao carregar este módulo ou alternar o perfil de prefeitura.
            </p>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-rose-300 bg-slate-950/80 p-3 rounded border border-slate-800 text-left overflow-x-auto max-h-48">
                {this.state.error.message || String(this.state.error)}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer shadow-md"
            >
              Recarregar Painel
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

