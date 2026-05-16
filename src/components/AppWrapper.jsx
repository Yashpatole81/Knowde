'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import App from '@/components/App';

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
