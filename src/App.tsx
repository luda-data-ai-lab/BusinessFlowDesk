import { useEffect, useState } from 'react';
import { FlowCanvas } from './components/Canvas/FlowCanvas';
import { Header } from './components/Header/Header';
import { RoleSelectModal } from './components/Onboarding/RoleSelectModal';
import { PromptInput } from './components/PromptBar/PromptInput';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TemplateGalleryModal } from './components/Templates/TemplateGalleryModal';
import { useBreakpoint } from './hooks/useMediaQuery';
import { useUndoRedo } from './hooks/useUndoRedo';
import { t as translate, useI18n, useT } from './i18n';
import { useFlowStore } from './hooks/useFlowStore';
import { clearShareHash, hasShareHash, readShareHash } from './services/share';

export default function App() {
  const t = useT();
  const { isMobile, isTablet } = useBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const readOnly = isMobile;
  useUndoRedo(!readOnly);

  useEffect(() => {
    const load = async () => {
      if (!hasShareHash()) return;
      const store = useFlowStore.getState();
      try {
        const project = await readShareHash();
        if (project) {
          store.importProject(project);
          useFlowStore.setState({ notice: 'shared', needsOnboarding: false });
        }
      } catch {
        useFlowStore.setState({
          error: translate('sharedInvalid', useI18n.getState().language),
        });
      } finally {
        clearShareHash();
      }
    };
    void load();
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
  }, []);
  const sidebarCollapsed = isMobile || (isTablet && !sidebarOpen) || (!isTablet && !sidebarOpen);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
      <Header
        onToggleSidebar={isMobile ? undefined : () => setSidebarOpen((o) => !o)}
        sidebarCollapsed={sidebarCollapsed}
        readOnly={readOnly}
      />
      <div className="flex min-h-0 flex-1">
        {!isMobile && (
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarOpen((o) => !o)} />
        )}
        <main className="relative min-w-0 flex-1">
          <FlowCanvas readOnly={readOnly} />
          {readOnly && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-white">
              {t('mobileViewer')}
            </div>
          )}
        </main>
      </div>
      {!readOnly && <PromptInput />}
      <RoleSelectModal />
      {!readOnly && <TemplateGalleryModal />}
    </div>
  );
}
