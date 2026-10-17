import React, { useState, useEffect } from 'react';
import { Project } from './types/document';
import { StorageService } from './services/storage';
import { readPendingBuffer } from './services/pendingBuffer';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import { EditorWorkspace } from './components/editor/EditorWorkspace';
import { EditorProvider } from './context/EditorContext';
import { createStarterProject } from './utils/defaults';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [recoveredFromBuffer, setRecoveredFromBuffer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Read URL hash if present
  useEffect(() => {
    const handleHashChange = () => {
      const match = window.location.hash.match(/#project=([a-zA-Z0-9_\-]+)/);
      if (match && match[1]) {
        setActiveProjectId(match[1]);
      } else {
        setActiveProjectId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load active project from storage
  useEffect(() => {
    if (!activeProjectId) {
      setCurrentProject(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    StorageService.getProject(activeProjectId)
      .then(proj => {
        if (!isMounted) return;
        if (proj) {
          // A crash buffer written on pagehide may be newer than the last autosave.
          const buffered = readPendingBuffer(activeProjectId);
          if (buffered && buffered.savedAt > (proj.updatedAt || 0)) {
            setCurrentProject(buffered.project);
            setRecoveredFromBuffer(true);
          } else {
            setCurrentProject(proj);
            setRecoveredFromBuffer(false);
          }
        } else {
          // If project was not found, return to dashboard
          window.location.hash = '';
          setActiveProjectId(null);
        }
      })
      .catch(err => {
        console.error('Failed to load project', err);
        if (isMounted) {
          window.location.hash = '';
          setActiveProjectId(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProjectId]);

  const handleOpenProject = (id: string) => {
    window.location.hash = `#project=${id}`;
    setActiveProjectId(id);
  };

  const handleBackToDashboard = () => {
    window.location.hash = '';
    setActiveProjectId(null);
    setCurrentProject(null);
  };

  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <Loader2 size={36} className="spin text-accent" />
        <span>Loading SiteBuilder Project...</span>
        <style>{`
          .app-loading-screen {
            width: 100vw;
            height: 100vh;
            background: var(--bg-workspace);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: var(--text-muted);
            font-size: 13px;
          }
          .text-accent {
            color: var(--accent);
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (activeProjectId && currentProject) {
    return (
      <EditorProvider
        key={currentProject.id}
        initialProject={currentProject}
        recoveredFromBuffer={recoveredFromBuffer}
        onClose={handleBackToDashboard}
      >
        <EditorWorkspace onBackToDashboard={handleBackToDashboard} />
      </EditorProvider>
    );
  }

  return <ProjectDashboard onOpenProject={handleOpenProject} />;
};

export default App;
