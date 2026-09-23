import { useCallback, useState } from 'react';
import { useFlowStore } from './useFlowStore';
import {
  exportFlowAsJson,
  exportFlowAsPng,
  exportFlowAsSvg,
  exportFlowAsText,
  readProjectFile,
} from '../services/export';
import { toMarkdown, toMermaid } from '../services/textExport';
import { useI18n } from '../i18n';
import { flowBounds } from '../utils/swimlanes';

export function useExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<void> | void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const title = () => useFlowStore.getState().projectTitle || 'flow';
  const bounds = () => {
    const { nodes, swimlanes, layoutDirection } = useFlowStore.getState();
    return flowBounds(nodes, swimlanes, layoutDirection);
  };

  return {
    busy,
    error,
    exportPng: () => run(() => exportFlowAsPng(bounds(), title())),
    exportSvg: () => run(() => exportFlowAsSvg(bounds(), title())),
    exportJson: () => run(() => exportFlowAsJson(useFlowStore.getState().toProject())),
    exportMermaid: () =>
      run(() => {
        const project = useFlowStore.getState().toProject();
        exportFlowAsText(toMermaid(project, useI18n.getState().language), title(), 'mmd');
      }),
    exportMarkdown: () =>
      run(() => {
        const project = useFlowStore.getState().toProject();
        exportFlowAsText(toMarkdown(project, useI18n.getState().language), title(), 'md');
      }),
    importJson: (file: File) =>
      run(async () => {
        const project = await readProjectFile(file);
        useFlowStore.getState().importProject(project);
      }),
  };
}
