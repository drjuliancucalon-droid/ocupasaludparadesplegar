// src/components/ErrorBoundary.jsx — Catches render errors, shows fallback UI
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-lg mx-auto mt-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Error al cargar el módulo</h2>
            <p className="text-sm text-red-600 mb-4">
              {this.state.error?.message || 'Ocurrió un error inesperado'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" /> Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
