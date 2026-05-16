'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import useStore from '@/store/useStore';

const mobileStyles = `
@media (max-width: 767px) {
  .fab-container {
    bottom: calc(85px + env(safe-area-inset-bottom)) !important;
  }
}
`;

const FAB = () => {
  const addNode = useStore((state) => state.addNode);

  return (
    <>
      <style>{mobileStyles}</style>
      <button 
        onClick={() => addNode()}
        style={styles.fab}
        className="fab-container"
        title="Create New Node"
        aria-label="Create new node"
      >
        <Plus size={18} color="#000" strokeWidth={2.5} />
      </button>
    </>
  );
};

const styles = {
  fab: {
    position: 'fixed',
    bottom: 'calc(32px + env(safe-area-inset-bottom))',
    right: '32px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

export default FAB;
