'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Loader2, Crown } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import useStore from '@/store/useStore';

/**
 * Force-directed layout with community awareness.
 * Nodes in the same community cluster together.
 */
function forceLayout(nodes, edges, communities, width, height) {
  const positions = {};
  const nodeCount = nodes.length;
  if (nodeCount === 0) return positions;

  // Position communities in separate regions
  const communityCount = communities.length;
  const communityPositions = {};
  
  communities.forEach((community, i) => {
    const angle = (i / Math.max(communityCount, 1)) * 2 * Math.PI;
    const radius = Math.min(width, height) * 0.25;
    communityPositions[community.id] = {
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
    };
  });

  // Initialize node positions near their community center
  nodes.forEach((node, i) => {
    const communityCenter = communityPositions[node.community_id];
    if (communityCenter) {
      const jitter = 60;
      positions[node.id] = {
        x: communityCenter.x + (Math.random() - 0.5) * jitter,
        y: communityCenter.y + (Math.random() - 0.5) * jitter,
        vx: 0, vy: 0,
      };
    } else {
      // Isolated nodes go to periphery
      const angle = (i / nodeCount) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.4;
      positions[node.id] = {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        vx: 0, vy: 0,
      };
    }
  });

  // Simulation
  const iterations = 150;
  const repulsion = 4000;
  const attraction = 0.006;
  const communityAttraction = 0.002;
  const damping = 0.88;
  const centerGravity = 0.005;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = positions[nodes[i].id];
        const b = positions[nodes[j].id];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Edge attraction
    for (const edge of edges) {
      const a = positions[edge.source];
      const b = positions[edge.target];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const strength = attraction * edge.weight * 2;
      a.vx += (dx / dist) * dist * strength;
      a.vy += (dy / dist) * dist * strength;
      b.vx -= (dx / dist) * dist * strength;
      b.vy -= (dy / dist) * dist * strength;
    }

    // Community gravity — pull nodes toward their community center
    for (const node of nodes) {
      const p = positions[node.id];
      if (!p) continue;
      const center = communityPositions[node.community_id];
      if (center) {
        p.vx += (center.x - p.x) * communityAttraction;
        p.vy += (center.y - p.y) * communityAttraction;
      }
    }

    // Center gravity
    for (const node of nodes) {
      const p = positions[node.id];
      if (!p) continue;
      p.vx += (width / 2 - p.x) * centerGravity;
      p.vy += (height / 2 - p.y) * centerGravity;
    }

    // Apply
    for (const node of nodes) {
      const p = positions[node.id];
      if (!p) continue;
      p.vx *= damping; p.vy *= damping;
      p.x += p.vx; p.y += p.vy;
      p.x = Math.max(60, Math.min(width - 60, p.x));
      p.y = Math.max(60, Math.min(height - 60, p.y));
    }
  }

  const result = {};
  for (const node of nodes) {
    if (positions[node.id]) {
      result[node.id] = { x: positions[node.id].x, y: positions[node.id].y };
    }
  }
  return result;
}

const GraphView = () => {
  const { activeWorkspaceId, graphData, graphPositions, graphLoading, setGraphData, setGraphPositions, setGraphLoading } = useStore();
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const GRAPH_WIDTH = 1200;
  const GRAPH_HEIGHT = 900;

  const fetchGraph = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setGraphLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/graph`);
      if (!res.ok) throw new Error('Failed to fetch graph');
      const data = await res.json();
      setGraphData(data);

      if (data.nodes.length > 0) {
        const layout = forceLayout(data.nodes, data.edges, data.communities, GRAPH_WIDTH, GRAPH_HEIGHT);
        setGraphPositions(layout);
      }
    } catch (err) {
      console.error('Graph fetch error:', err);
    } finally {
      setGraphLoading(false);
    }
  }, [activeWorkspaceId, setGraphData, setGraphPositions, setGraphLoading]);

  // Only fetch on first mount if no data exists
  useEffect(() => {
    if (!graphData && activeWorkspaceId) {
      fetchGraph();
    }
  }, [graphData, activeWorkspaceId, fetchGraph]);

  const getEdgeColor = (confidence) => {
    switch (confidence) {
      case 'strong': return 'rgba(16, 185, 129, 0.6)';
      case 'medium': return 'rgba(16, 185, 129, 0.25)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  };

  const getEdgeWidth = (confidence) => {
    switch (confidence) {
      case 'strong': return 1.2;
      case 'medium': return 0.7;
      default: return 0.4;
    }
  };

  // Node radius based on importance (god nodes are bigger)
  const getNodeRadius = (node) => {
    if (node.is_god_node) return 10;
    if (node.degree >= 3) return 7;
    if (node.degree >= 1) return 5;
    return 4; // isolated
  };

  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  if (graphLoading && !graphData) {
    return (
      <div style={styles.container}>
        <div style={styles.centerState}>
          <Loader2 size={28} color="var(--accent-color)" className="spin" />
          <p style={styles.stateText}>Building knowledge graph...</p>
        </div>
        <style>{spinStyle}</style>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.centerState}>
          <p style={styles.stateText}>No nodes to visualize.</p>
          <p style={styles.stateHint}>Add content to your nodes and the graph will form.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Stats + God Nodes bar */}
      <div style={styles.topBar}>
        <div style={styles.statsRow}>
          <span style={styles.stat}>{graphData.stats.total_nodes} nodes</span>
          <span style={styles.dot}>·</span>
          <span style={styles.stat}>{graphData.stats.visible_edges} edges</span>
          <span style={styles.dot}>·</span>
          <span style={styles.stat}>{graphData.stats.total_communities} clusters</span>
          <button onClick={fetchGraph} style={styles.refreshBtn} aria-label="Refresh">
            {graphLoading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
          </button>
        </div>
        {graphData.godNodes.length > 0 && (
          <div style={styles.godRow}>
            <Crown size={12} color="#f59e0b" />
            <span style={styles.godLabel}>Hub nodes:</span>
            {graphData.godNodes.map(g => (
              <span key={g.id} style={styles.godChip}>{g.title}</span>
            ))}
          </div>
        )}
      </div>

      {/* Graph */}
      <div style={styles.graphContainer}>
        <TransformWrapper
          initialScale={0.9}
          minScale={0.3}
          maxScale={3}
          centerOnInit={true}
          wheel={{ step: 0.08 }}
          panning={{ velocityDisabled: true }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT }}
          >
            <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} style={{ display: 'block' }}>
              {/* Edges */}
              {graphData.edges.map((edge, i) => {
                const source = graphPositions[edge.source];
                const target = graphPositions[edge.target];
                if (!source || !target) return null;
                return (
                  <line
                    key={`e-${i}`}
                    x1={source.x} y1={source.y}
                    x2={target.x} y2={target.y}
                    stroke={getEdgeColor(edge.confidence)}
                    strokeWidth={getEdgeWidth(edge.confidence)}
                  />
                );
              })}

              {/* Nodes */}
              {graphData.nodes.map((node) => {
                const pos = graphPositions[node.id];
                if (!pos) return null;
                const radius = getNodeRadius(node);
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode === node.id;

                return (
                  <g
                    key={node.id}
                    onClick={(e) => handleNodeClick(e, node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Selection ring */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={radius + 4}
                        fill="none"
                        stroke={node.color || '#10b981'}
                        strokeWidth={1.5}
                        opacity={0.7}
                      />
                    )}
                    {/* God node glow */}
                    {node.is_god_node && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={radius + 8}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={0.5}
                        opacity={0.4}
                        strokeDasharray="3 2"
                      />
                    )}
                    {/* Node circle */}
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={radius}
                      fill={node.has_embedding ? (node.color || '#10b981') : 'var(--text-muted)'}
                      stroke={isSelected ? 'var(--text-color)' : 'none'}
                      strokeWidth={1.5}
                      opacity={node.has_embedding ? 0.9 : 0.35}
                    />
                    {/* Label */}
                    <text
                      x={pos.x} y={pos.y + radius + 14}
                      textAnchor="middle"
                      fill={isSelected || isHovered ? 'var(--text-color)' : 'var(--text-muted)'}
                      fontSize="10"
                      fontWeight={isSelected ? '600' : '400'}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.title.length > 18 ? node.title.slice(0, 16) + '…' : node.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* Node Detail Modal */}
      <AnimatePresence>
        {selectedNode && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={styles.backdrop}
              onClick={() => setSelectedNode(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, x: '-50%', y: '-45%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.92, x: '-50%', y: '-45%' }}
              style={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={styles.modalTitle}>{selectedNode.title}</h3>
                    {selectedNode.is_god_node && <Crown size={14} color="#f59e0b" />}
                  </div>
                  <span style={styles.modalTag}>{selectedNode.tag_id}</span>
                </div>
                <button onClick={() => setSelectedNode(null)} style={styles.closeBtn}>
                  <X size={16} />
                </button>
              </div>
              <div style={styles.modalBody}>
                <p style={styles.modalContent}>
                  {selectedNode.content_preview || 'No content yet.'}
                  {selectedNode.content_preview?.length >= 150 && '…'}
                </p>
                <div style={styles.modalChips}>
                  <span style={styles.chip}>{selectedNode.degree} connections</span>
                  {selectedNode.community_id !== null && (
                    <span style={styles.chip}>Cluster {selectedNode.community_id}</span>
                  )}
                  <span style={{
                    ...styles.chip,
                    borderColor: selectedNode.has_embedding ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
                    color: selectedNode.has_embedding ? '#10b981' : '#f59e0b',
                  }}>
                    {selectedNode.has_embedding ? 'Embedded' : 'No embedding'}
                  </span>
                  {selectedNode.is_god_node && (
                    <span style={{ ...styles.chip, borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                      Hub node
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{spinStyle}</style>
    </div>
  );
};

const spinStyle = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`;

const styles = {
  container: {
    width: '100%',
    height: 'calc(100vh - 60px)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-color)',
    position: 'relative',
    paddingTop: '60px',
  },
  centerState: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  stateText: { color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '10px' },
  stateHint: { color: '#444', fontSize: '0.8rem', marginTop: '6px' },
  topBar: {
    padding: '8px 16px',
    backgroundColor: 'var(--surface-color)',
    borderBottom: '1px solid var(--text-muted, #1a1a1a)',
    opacity: 0.95,
    flexShrink: 0,
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '0.72rem',
  },
  stat: { color: 'var(--text-muted)' },
  dot: { color: '#333' },
  refreshBtn: {
    color: 'var(--text-muted)',
    padding: '3px',
    marginLeft: '6px',
    display: 'flex',
    alignItems: 'center',
  },
  godRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '6px',
    fontSize: '0.68rem',
  },
  godLabel: { color: '#f59e0b', fontWeight: 500 },
  godChip: {
    padding: '1px 7px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    fontSize: '0.65rem',
  },
  graphContainer: { flex: 1, overflow: 'hidden' },
  backdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    width: '88%',
    maxWidth: '380px',
    backgroundColor: 'var(--surface-color)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    border: '1px solid var(--text-muted)',
    zIndex: 1001,
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  modalHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid var(--text-muted)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color)' },
  modalTag: { fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' },
  closeBtn: { color: 'var(--text-muted)', padding: '3px' },
  modalBody: { padding: '14px 16px' },
  modalContent: { fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-muted)', marginBottom: '12px' },
  modalChips: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  chip: {
    fontSize: '0.65rem',
    padding: '2px 8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: 'var(--text-muted)',
    border: '1px solid #222',
  },
};

export default GraphView;
