/**
 * Next.js Instrumentation file.
 * Runs once when the server starts.
 * 
 * Fixes: Node.js 22+ exposes a broken `localStorage` global when
 * --localstorage-file is not properly configured. Libraries like
 * zustand/framer-motion check for localStorage existence and crash.
 */
export function register() {
  if (typeof globalThis.localStorage !== 'undefined') {
    // Check if localStorage.getItem is broken
    if (typeof globalThis.localStorage.getItem !== 'function') {
      // Remove the broken localStorage so libraries fall back gracefully
      delete globalThis.localStorage;
    }
  }
}
