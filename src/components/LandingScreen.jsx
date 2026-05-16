'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';

const LandingScreen = ({ onOpenWorkspaces }) => {
  return (
    <div style={styles.container}>
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={styles.content}
      >
        <div style={styles.logoContainer}>
          <Layout size={64} color="var(--accent-color)" />
        </div>
        <h1 style={styles.title}>Knowde</h1>
        <p style={styles.subtitle}>
          A visual thinking canvas where ideas exist as nodes inside structured workspaces.
        </p>
        
        <button 
          onClick={onOpenWorkspaces}
          style={styles.button}
        >
          Open Workspace
        </button>
      </motion.div>
      
      <div style={styles.backgroundDots} aria-hidden="true" />
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  content: {
    textAlign: 'center',
    zIndex: 10,
    padding: '0 24px',
    maxWidth: '500px',
  },
  logoContainer: {
    marginBottom: '24px',
    display: 'inline-block',
  },
  title: {
    fontSize: '4rem',
    fontWeight: 800,
    letterSpacing: '-0.05em',
    marginBottom: '16px',
    background: 'linear-gradient(to bottom, #fff, #888)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    marginBottom: '40px',
  },
  button: {
    backgroundColor: 'var(--accent-color)',
    color: '#000',
    padding: '16px 32px',
    borderRadius: '30px',
    fontSize: '1.1rem',
    fontWeight: 600,
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
  },
  backgroundDots: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `radial-gradient(#222 1px, transparent 0)`,
    backgroundSize: '40px 40px',
    opacity: 0.6,
  }
};

export default LandingScreen;
