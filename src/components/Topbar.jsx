'use client';

import React from 'react';
import useStore from '@/store/useStore';
import { ChevronLeft } from 'lucide-react';

const Topbar = ({ onBack }) => {
  const { workspaces, activeWorkspaceId } = useStore();
  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);

  return (
    <div style={styles.topbar}>
      <div style={styles.left}>
        {activeWorkspaceId && (
          <button onClick={onBack} style={styles.backBtn} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 style={styles.title}>{activeWorkspace ? activeWorkspace.name : 'Knowde'}</h1>
      </div>
    </div>
  );
};

const styles = {
  topbar: {
    height: '60px',
    width: '100%',
    backgroundColor: 'var(--surface-color)',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'fixed',
    top: 0,
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    color: 'var(--text-muted)',
    padding: '4px',
    marginLeft: '-8px',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-color)',
  }
};

export default Topbar;
