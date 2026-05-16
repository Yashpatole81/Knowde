'use client';

import { useEffect, useState } from 'react';

/**
 * Wrapper that only renders children on the client side.
 * Prevents any server-side rendering of browser-dependent code.
 */
export default function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return children;
}
