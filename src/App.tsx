import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Project } from './types/document';
import { StorageService } from './services/storage';
import { readPendingBuffer } from './services/pendingBuffer';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import { EditorProvider } from './context/EditorContext';
import { createStarterProject } from './utils/defaults';
import { Loader2 } from 'lucide-react';

// The editor (toolbar, sidebar, canvas, inspector, preview) is split into its
// own chunk so the dashboard loads instantly on slow connections.
const EditorWorkspace = lazy(() =>
  import('./components/editor/EditorWorkspace').then(module => ({ default: module.EditorWorkspace }))
);

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
    return <LoadingScreen label="Loading SiteBuilder Project..." />;
  }

  if (activeProjectId && currentProject) {
    return (
      <EditorProvider
        key={currentProject.id}
        initialProject={currentProject}
        recoveredFromBuffer={recoveredFromBuffer}
        onClose={handleBackToDashboard}
      >
        <Suspense fallback={<LoadingScreen label="Opening editor..." />}>
          <EditorWorkspace onBackToDashboard={handleBackToDashboard} />
        </Suspense>
      </EditorProvider>
    );
  }

  return <ProjectDashboard onOpenProject={handleOpenProject} />;
};

const LoadingScreen: React.FC<{ label: string }> = ({ label }) => (
  <div className="app-loading-screen">
    <Loader2 size={36} className="spin text-accent" />
    <span>{label}</span>
    <style>{`
      .app-loading-screen {
        width: 100vw;
        height: 100vh;
        height: 100dvh;
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
    `}</style>
  </div>
);

export default App;
