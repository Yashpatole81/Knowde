'use client';

import React, { useState, useEffect } from 'react';
import useStore from '@/store/useStore';
import Topbar from '@/components/Topbar';
import Canvas from '@/components/Canvas';
import FAB from '@/components/FAB';
import BottomNav from '@/components/BottomNav';
import LandingScreen from '@/components/LandingScreen';
import WorkspaceList from '@/components/WorkspaceList';
import AskView from '@/components/AskView';
import GraphView from '@/components/GraphView';
import Settings from '@/components/Settings';

function App() {
  const [view, setView] = useState('landing');
  const [activeTab, setActiveTab] = useState('workspaces');
  const { setActiveWorkspace, addNode, activeWorkspaceId, fetchWorkspaces } = useStore();

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleOpenWorkspaces = () => setView('list');
  
  const handleSelectWorkspace = (id) => {
    setActiveWorkspace(id);
    setView('main');
    setActiveTab('workspaces');
  };

  const handleBackToList = () => {
    setActiveWorkspace(null);
    setView('list');
  };

  const handleBackToLanding = () => setView('landing');

  // Keyboard shortcut: Shift+N to create a new node
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.shiftKey && e.key === 'N') {
        e.preventDefault();
        if (view === 'main' && activeWorkspaceId) {
          addNode();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [view, activeWorkspaceId, addNode]);

  if (view === 'landing') {
    return <LandingScreen onOpenWorkspaces={handleOpenWorkspaces} />;
  }

  if (view === 'list') {
    return <WorkspaceList onSelect={handleSelectWorkspace} onBack={handleBackToLanding} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'workspaces':
        return (
          <>
            <Canvas />
            <FAB />
          </>
        );
      case 'graph':
        return <GraphView />;
      case 'ask':
        return <AskView />;
      case 'settings':
        return <Settings />;
      default:
        return <Canvas />;
    }
  };

  return (
    <div className="app-container">
      <Topbar onBack={handleBackToList} />
      <main style={{ minHeight: '100vh' }}>
        {renderContent()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

const styles = {
  placeholderScreen: {
    padding: '120px 24px',
    textAlign: 'center',
    color: 'var(--text-color)',
  },
  placeholderTitle: {
    fontSize: '1.5rem',
    marginBottom: '12px',
  },
  placeholderText: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
  }
};

export default App;
