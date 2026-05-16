'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import useStore from '@/store/useStore';

const WorkspaceList = ({ onSelect, onBack }) => {
  const { workspaces, addWorkspace, deleteWorkspace, fetchWorkspaces, loading } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleAdd = async () => {
    if (newName.trim()) {
      const id = await addWorkspace(newName.trim());
      if (id) {
        onSelect(id);
      }
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backBtn} aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h2 style={styles.title}>Your Workspaces</h2>
      </header>

      <div style={styles.list}>
        {workspaces.map((ws) => (
          <div 
            key={ws.id} 
            style={styles.item} 
            role="button"
            tabIndex={0}
            onClick={() => onSelect(ws.id)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(ws.id)}
          >
            <div style={styles.itemInfo}>
              <h3 style={styles.itemName}>{ws.name}</h3>
              <p style={styles.itemMeta}>Created {new Date(ws.created_at).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); }}
              style={styles.deleteBtn}
              aria-label={`Delete ${ws.name}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {isAdding ? (
          <div style={styles.addItem}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Workspace name..."
              style={styles.input}
              maxLength={100}
              aria-label="New workspace name"
            />
            <div style={styles.addActions}>
              <button onClick={handleAdd} style={styles.confirmBtn}>Create</button>
              <button onClick={() => setIsAdding(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} style={styles.addBtn}>
            <Plus size={20} /> New Workspace
          </button>
        )}
      </div>
      
      {workspaces.length === 0 && !isAdding && !loading && (
        <div style={styles.empty}>
          <p>No workspaces yet. Create your first one to get started!</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '80px 24px',
    maxWidth: '600px',
    margin: '0 auto',
    color: 'var(--text-color)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  backBtn: {
    color: 'var(--text-muted)',
    padding: '8px',
    marginLeft: '-12px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 700,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    backgroundColor: 'var(--surface-color)',
    padding: '20px',
    borderRadius: 'var(--border-radius)',
    border: '1px solid #222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  itemName: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemMeta: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  deleteBtn: {
    color: '#ef4444',
    padding: '8px',
    opacity: 0.6,
    transition: 'opacity 0.2s',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    borderRadius: 'var(--border-radius)',
    border: '2px dashed #333',
    color: 'var(--text-muted)',
    fontSize: '1rem',
    marginTop: '12px',
  },
  addItem: {
    backgroundColor: 'var(--surface-color)',
    padding: '20px',
    borderRadius: 'var(--border-radius)',
    border: '1px solid var(--accent-color)',
    marginTop: '12px',
  },
  input: {
    fontSize: '1.1rem',
    borderBottom: '1px solid #444',
    paddingBottom: '8px',
    marginBottom: '16px',
  },
  addActions: {
    display: 'flex',
    gap: '12px',
  },
  confirmBtn: {
    backgroundColor: 'var(--accent-color)',
    color: '#000',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 600,
  },
  cancelBtn: {
    color: 'var(--text-muted)',
    padding: '8px 16px',
  },
  empty: {
    textAlign: 'center',
    marginTop: '40px',
    color: 'var(--text-muted)',
  }
};

export default WorkspaceList;
