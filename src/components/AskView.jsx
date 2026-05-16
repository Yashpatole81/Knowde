'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Info, X, Send, Loader2 } from 'lucide-react';
import useStore from '@/store/useStore';

const NodePreview = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.backdrop}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
        style={{ 
          ...styles.previewCard, 
          borderColor: node.color ? `${node.color}88` : '#444',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.previewHeader}>
          <h3 style={styles.previewTitle}>{node.title}</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close preview">
            <X size={18} />
          </button>
        </div>
        <div style={styles.previewContent}>
          <p style={styles.previewText}>{node.content || 'No content provided.'}</p>
        </div>
        <div style={styles.previewFooter}>
          <span style={{ ...styles.previewTag, color: node.color || 'var(--accent-color)' }}>{node.tag_id}</span>
        </div>
      </motion.div>
    </>
  );
};

const AskView = () => {
  const { nodes, activeWorkspaceId, selectedNodeId, setSelectedNodeId, chatMessages, addChatMessage } = useStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const activeNodes = useMemo(() => 
    nodes.filter(node => node.workspace_id === activeWorkspaceId),
    [nodes, activeWorkspaceId]
  );

  const selectedNode = useMemo(() => 
    activeNodes.find(n => n.id === selectedNodeId),
    [activeNodes, selectedNodeId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading || !activeWorkspaceId) return;

    const userMessage = query.trim();
    setQuery('');
    addChatMessage({ role: 'user', content: userMessage });
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          workspace_id: activeWorkspaceId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      addChatMessage({
        role: 'assistant',
        content: data.answer,
        relevant_nodes: data.relevant_nodes || [],
      });
    } catch (err) {
      addChatMessage({
        role: 'assistant',
        content: `Error: ${err.message}`,
        relevant_nodes: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (nodeId) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <div style={styles.container}>
      {/* Chat Messages */}
      <div style={styles.chatArea}>
        {chatMessages.length === 0 ? (
          <div style={styles.emptyState}>
            <Info size={48} color="#333" />
            <h3 style={styles.emptyTitle}>Ask your workspace</h3>
            <p style={styles.emptyText}>
              Ask questions about your nodes and get AI-powered answers based on your knowledge.
            </p>
            {activeNodes.length === 0 && (
              <p style={styles.emptyHint}>Add some nodes with content first.</p>
            )}
          </div>
        ) : (
          <div style={styles.messageList}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}>
                <div style={styles.messageContent}>
                  <p style={styles.messageText}>{msg.content}</p>
                  {msg.relevant_nodes && msg.relevant_nodes.length > 0 && (
                    <div style={styles.relevantNodes}>
                      <span style={styles.relevantLabel}>Related nodes:</span>
                      <div style={styles.nodeChips}>
                        {msg.relevant_nodes.map(node => (
                          <button
                            key={node.id}
                            onClick={() => handleNodeClick(node.id)}
                            style={styles.nodeChip}
                          >
                            {node.title}
                            <span style={styles.scoreChip}>{Math.round(node.score * 100)}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ ...styles.message, ...styles.assistantMessage }}>
                <div style={styles.messageContent}>
                  <Loader2 size={18} color="var(--accent-color)" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleAsk} style={styles.inputArea}>
        <div style={styles.searchBar}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask something about this workspace..."
            style={styles.input}
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            style={{
              ...styles.sendBtn,
              opacity: loading || !query.trim() ? 0.4 : 1,
            }}
            aria-label="Send question"
          >
            <Send size={18} />
          </button>
        </div>
      </form>

      {/* Node Preview Modal */}
      <AnimatePresence>
        {selectedNode && (
          <NodePreview 
            node={selectedNode} 
            onClose={() => setSelectedNodeId(null)} 
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    width: '100%',
    backgroundColor: 'var(--bg-color)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '80px 24px 0',
    paddingBottom: 'calc(160px + env(safe-area-inset-bottom))',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '12px',
  },
  emptyTitle: {
    fontSize: '1.3rem',
    color: 'var(--text-color)',
    fontWeight: 600,
  },
  emptyText: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    maxWidth: '400px',
    lineHeight: 1.5,
  },
  emptyHint: {
    fontSize: '0.85rem',
    color: '#555',
    marginTop: '8px',
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '700px',
    margin: '0 auto',
    paddingBottom: '10px',
  },
  message: {
    display: 'flex',
    width: '100%',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    maxWidth: '85%',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid #222',
  },
  messageText: {
    fontSize: '0.9rem',
    lineHeight: 1.6,
    color: 'var(--text-color)',
    whiteSpace: 'pre-wrap',
  },
  relevantNodes: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #333',
  },
  relevantLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '8px',
  },
  nodeChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  nodeChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: 'var(--accent-color)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  scoreChip: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '1px 4px',
    borderRadius: '4px',
  },
  inputArea: {
    padding: '16px 24px',
    paddingBottom: 'calc(90px + env(safe-area-inset-bottom))',
    backgroundColor: 'transparent',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  searchBar: {
    backgroundColor: 'var(--surface-color)',
    borderRadius: '24px',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #333',
    maxWidth: '700px',
    margin: '0 auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  input: {
    fontSize: '0.95rem',
    flex: 1,
    color: '#fff',
  },
  sendBtn: {
    color: 'var(--accent-color)',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'opacity 0.2s',
  },
  previewCard: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '90%',
    maxWidth: '450px',
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
    backdropFilter: 'blur(15px)',
    borderRadius: '20px',
    border: '1px solid #444',
    zIndex: 1001,
    boxShadow: '0 30px 60px rgba(0,0,0,0.9)',
    display: 'flex',
    flexDirection: 'column',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(2px)',
    zIndex: 1000,
  },
  previewHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-color)',
  },
  closeBtn: {
    color: 'var(--text-muted)',
    padding: '4px',
  },
  previewContent: {
    padding: '20px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  previewText: {
    fontSize: '0.95rem',
    lineHeight: 1.6,
    color: '#ccc',
  },
  previewFooter: {
    padding: '12px 20px',
    borderTop: '1px solid #333',
  },
  previewTag: {
    fontSize: '0.75rem',
    color: 'var(--accent-color)',
    fontFamily: 'monospace',
  },
};

export default AskView;
