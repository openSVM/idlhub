import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-container">
            <h1 className="error-title">// Something Went Wrong</h1>
            <p className="error-message">
              An unexpected error occurred. Please try refreshing the page.
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre className="error-stack">
                  <code>
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </code>
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button
                className="error-btn primary"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button
                className="error-btn secondary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button
                className="error-btn secondary"
                onClick={() => window.history.back()}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
