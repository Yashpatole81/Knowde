'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Trash2, Edit2 } from 'lucide-react';
import useStore from '@/store/useStore';

const Node = ({ node }) => {
  const { updateNode, deleteNode } = useStore();
  const [editingField, setEditingField] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const cardRef = useRef(null);
  
  const [title, setTitle] = useState(node.title);
  const [content, setContent] = useState(node.content);

  // Sync local state when node prop changes (e.g., after refetch)
  useEffect(() => {
    setTitle(node.title);
    setContent(node.content);
  }, [node.title, node.content]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        if (editingField) {
          setEditingField(null);
          if (title !== node.title || content !== node.content) {
            updateNode(node.id, { title, content });
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [title, content, node.id, node.title, node.content, editingField, updateNode]);

  const handleBlur = () => {
    setEditingField(null);
    if (title !== node.title || content !== node.content) {
      updateNode(node.id, { title, content });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setTitle(node.title);
      setContent(node.content);
      setEditingField(null);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...styles.node,
        borderColor: node.color || '#333',
        boxShadow: node.color 
          ? `0 4px 12px rgba(0,0,0,0.2), 0 0 15px ${node.color}22` 
          : styles.node.boxShadow
      }}
      className="node-card"
    >
      <div style={styles.header}>
        {editingField === 'title' ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={styles.titleInput}
            maxLength={200}
            aria-label="Node title"
          />
        ) : (
          <button 
            onClick={() => setEditingField('title')} 
            style={styles.titleBtn}
            aria-label="Edit title"
          >
            <h3 style={styles.title}>{title}</h3>
          </button>
        )}
        
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            style={styles.menuBtn}
            aria-label="Node options"
          >
            <MoreVertical size={18} />
          </button>
          
          {showMenu && (
            <div ref={menuRef} style={styles.dropdown}>
              <button 
                onClick={() => { setEditingField('title'); setShowMenu(false); }}
                style={styles.dropdownItem}
              >
                <Edit2 size={14} /> Rename
              </button>
              <button 
                onClick={() => deleteNode(node.id)}
                style={{ ...styles.dropdownItem, color: '#ef4444' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <button 
        style={styles.contentArea} 
        onClick={() => editingField !== 'title' && setEditingField('content')}
        aria-label="Edit content"
      >
        {editingField === 'content' ? (
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={styles.contentTextarea}
            placeholder="Type something..."
            maxLength={50000}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p style={styles.content}>
            {content || <span style={{ color: 'var(--text-muted)' }}>Empty node...</span>}
          </p>
        )}
      </button>

      <div style={styles.footer}>
        <span style={{ ...styles.tagId, color: node.color || 'var(--text-muted)' }}>{node.tag_id}</span>
      </div>
    </motion.div>
  );
};

const styles = {
  node: {
    position: 'relative',
    width: '100%',
    backgroundColor: 'var(--surface-color)',
    borderRadius: 'var(--border-radius)',
    border: '1px solid #333',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform var(--transition-speed)',
    height: 'fit-content',
    minHeight: '180px',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text-color)',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  titleBtn: {
    flex: 1,
    textAlign: 'left',
    padding: 0,
    cursor: 'text',
  },
  titleInput: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text-color)',
    flex: 1,
    borderBottom: '1px solid var(--accent-color)',
  },
  menuBtn: {
    color: 'var(--text-muted)',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background var(--transition-speed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    padding: '16px',
    minHeight: '80px',
    textAlign: 'left',
    width: '100%',
    cursor: 'text',
  },
  content: {
    fontSize: '0.9rem',
    lineHeight: '1.5',
    color: 'var(--text-color)',
    whiteSpace: 'pre-wrap',
  },
  contentTextarea: {
    fontSize: '0.9rem',
    lineHeight: '1.5',
    minHeight: '80px',
  },
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid #222',
  },
  tagId: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
    textTransform: 'lowercase',
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '4px',
    width: '120px',
    zIndex: 10,
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    width: '100%',
    textAlign: 'left',
    borderRadius: '4px',
    transition: 'background 0.1s',
  }
};

export default Node;
