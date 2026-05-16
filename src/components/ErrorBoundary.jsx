'use client';

import React from 'react';

/**
 * Error Boundary component to catch rendering errors gracefully.
 * Prevents the entire app from crashing and avoids exposing
 * stack traces to end users in production.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.text}>
              An unexpected error occurred. Please try again.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={styles.errorDetail}>
                {this.state.error.message}
              </pre>
            )}
            <button onClick={this.handleReset} style={styles.button}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: '24px',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: '12px',
    border: '1px solid #333',
    padding: '32px',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: {
    color: '#e5e7eb',
    fontSize: '1.3rem',
    fontWeight: 600,
    marginBottom: '12px',
  },
  text: {
    color: '#9ca3af',
    fontSize: '0.95rem',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  errorDetail: {
    backgroundColor: '#1a1a1a',
    color: '#ef4444',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    textAlign: 'left',
    overflow: 'auto',
    maxHeight: '120px',
    marginBottom: '20px',
  },
  button: {
    backgroundColor: '#10b981',
    color: '#000',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
};

export default ErrorBoundary;
