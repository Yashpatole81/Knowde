'use client';

import React, { useRef } from 'react';
import useStore from '@/store/useStore';
import Node from '@/components/Node';

const Canvas = () => {
  const { nodes, activeWorkspaceId, addNode } = useStore();
  const canvasRef = useRef(null);

  const activeNodes = nodes.filter(node => node.workspace_id === activeWorkspaceId);

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      addNode();
    }
  };

  return (
    <div 
      ref={canvasRef}
      style={styles.canvas}
      onClick={handleCanvasClick}
      role="region"
      aria-label="Node canvas"
    >
      <div className="canvas-grid">
        {activeNodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </div>
      
      {activeNodes.length === 0 && (
        <div style={styles.emptyState}>
          <h2 style={styles.emptyText}>Create your first node</h2>
          <p style={styles.emptySubtext}>Click anywhere on the canvas or use the + button</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  canvas: {
    width: '100%',
    position: 'relative',
    backgroundColor: 'var(--bg-color)',
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  emptyText: {
    color: 'var(--text-color)',
    fontSize: '1.5rem',
    marginBottom: '8px',
  },
  emptySubtext: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
  }
};

export default Canvas;
