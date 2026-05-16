import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

// --- Security: Input validation helpers ---
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50000;
const MAX_WORKSPACE_NAME_LENGTH = 100;

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

// --- Store ---
const useStore = create((set, get) => ({
  // State
  workspaces: [],
  activeWorkspaceId: null,
  nodes: [],
  selectedNodeId: null,
  loading: false,
  error: null,

  // Graph state (persists across tab switches)
  graphData: null,
  graphPositions: {},
  graphLoading: false,

  // Ask/Chat state (persists across tab switches)
  chatMessages: [],

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Graph actions
  setGraphData: (data) => set({ graphData: data }),
  setGraphPositions: (positions) => set({ graphPositions: positions }),
  setGraphLoading: (loading) => set({ graphLoading: loading }),
  clearGraph: () => set({ graphData: null, graphPositions: {} }),

  // Chat actions
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  // ==========================================
  // WORKSPACE ACTIONS (synced with Supabase)
  // ==========================================

  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const data = await res.json();
      set({ workspaces: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  addWorkspace: async (name = 'New Workspace') => {
    const safeName = sanitizeString(name, MAX_WORKSPACE_NAME_LENGTH) || 'New Workspace';

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: safeName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create workspace');
      }

      const workspace = await res.json();

      set((state) => ({
        workspaces: [workspace, ...state.workspaces],
        activeWorkspaceId: workspace.id,
      }));

      // Auto-create a default node
      await get().addNode({
        title: 'Welcome to your new Workspace',
        content: 'Every workspace starts with a default node. You can rename or delete this anytime.',
      });

      return workspace.id;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  updateWorkspace: async (id, updates) => {
    const safeUpdates = {};
    if (updates.name !== undefined) {
      safeUpdates.name = sanitizeString(updates.name, MAX_WORKSPACE_NAME_LENGTH);
    }
    if (Object.keys(safeUpdates).length === 0) return;

    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeUpdates),
      });

      if (!res.ok) throw new Error('Failed to update workspace');

      const updated = await res.json();
      set((state) => ({
        workspaces: state.workspaces.map((ws) =>
          ws.id === id ? updated : ws
        ),
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  deleteWorkspace: async (id) => {
    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete workspace');

      set((state) => ({
        workspaces: state.workspaces.filter((ws) => ws.id !== id),
        nodes: state.nodes.filter((node) => node.workspace_id !== id),
        activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id, nodes: [], graphData: null, graphPositions: {}, chatMessages: [] });
    if (id) {
      get().fetchNodes(id);
    }
  },

  // ==========================================
  // NODE ACTIONS (synced with Supabase)
  // ==========================================

  fetchNodes: async (workspaceId) => {
    try {
      const res = await fetch(`/api/nodes?workspace_id=${workspaceId}`);
      if (!res.ok) throw new Error('Failed to fetch nodes');
      const data = await res.json();
      set({ nodes: data });
    } catch (err) {
      set({ error: err.message });
    }
  },

  addNode: async (data = {}) => {
    const state = get();
    if (!state.activeWorkspaceId) return;

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: state.activeWorkspaceId,
          title: sanitizeString(data.title || 'New Node', MAX_TITLE_LENGTH),
          content: sanitizeString(data.content || '', MAX_CONTENT_LENGTH),
          color: data.color,
          position_x: data.position?.x || 0,
          position_y: data.position?.y || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create node');
      }

      const node = await res.json();
      set((s) => ({ nodes: [...s.nodes, node] }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  updateNode: async (id, updates) => {
    const safeUpdates = {};
    if (updates.title !== undefined) {
      safeUpdates.title = sanitizeString(updates.title, MAX_TITLE_LENGTH);
    }
    if (updates.content !== undefined) {
      safeUpdates.content = sanitizeString(updates.content, MAX_CONTENT_LENGTH);
    }
    if (updates.color !== undefined) {
      safeUpdates.color = updates.color;
    }
    if (updates.position_x !== undefined) {
      safeUpdates.position_x = updates.position_x;
    }
    if (updates.position_y !== undefined) {
      safeUpdates.position_y = updates.position_y;
    }

    if (Object.keys(safeUpdates).length === 0) return;

    // Optimistic update
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...safeUpdates } : node
      ),
    }));

    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeUpdates),
      });

      if (!res.ok) throw new Error('Failed to update node');
    } catch (err) {
      // Revert on failure — refetch
      const state = get();
      if (state.activeWorkspaceId) {
        get().fetchNodes(state.activeWorkspaceId);
      }
      set({ error: err.message });
    }
  },

  deleteNode: async (id) => {
    // Optimistic delete
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
    }));

    try {
      const res = await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete node');
    } catch (err) {
      // Revert on failure
      const state = get();
      if (state.activeWorkspaceId) {
        get().fetchNodes(state.activeWorkspaceId);
      }
      set({ error: err.message });
    }
  },

  // ==========================================
  // AUTH ACTIONS
  // ==========================================

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ workspaces: [], nodes: [], activeWorkspaceId: null });
    window.location.href = '/login';
  },
}));

export default useStore;
