'use client';

import dynamic from 'next/dynamic';

// Completely disable SSR for the entire app shell.
// Zustand, framer-motion, and react-zoom-pan-pinch all require browser APIs.
const AppWrapper = dynamic(() => import('@/components/AppWrapper'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ color: '#9ca3af', fontSize: '1rem' }}>Loading...</div>
    </div>
  ),
});

export default function Home() {
  return <AppWrapper />;
}
