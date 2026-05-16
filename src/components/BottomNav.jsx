'use client';

import React from 'react';
import { LayoutGrid, MessageSquare, Settings as SettingsIcon, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'workspaces', label: 'Workspaces', icon: LayoutGrid },
    { id: 'graph', label: 'Graph', icon: GitBranch },
    { id: 'ask', label: 'Ask', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="nav-container">
      {activeTab === 'workspaces' && (
        <div style={styles.shortcutHint}>
          <kbd style={styles.kbd}>Shift</kbd>
          <span style={styles.plus}>+</span>
          <kbd style={styles.kbd}>N</kbd>
          <span style={styles.hintText}>New Node</span>
        </div>
      )}
      <motion.nav 
        className="bottom-nav"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      >
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <item.icon size={24} />
            <span>{item.label}</span>
          </motion.button>
        ))}
      </motion.nav>
    </div>
  );
};

const styles = {
  shortcutHint: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    marginBottom: '8px',
    pointerEvents: 'auto',
  },
  kbd: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  plus: {
    color: 'var(--text-muted)',
    fontSize: '0.7rem',
  },
  hintText: {
    color: 'var(--text-muted)',
    fontSize: '0.7rem',
    marginLeft: '6px',
  },
};

export default BottomNav;
