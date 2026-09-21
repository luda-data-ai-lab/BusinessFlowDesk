import { useCallback, useState } from 'react';
import { useFlowStore } from './useFlowStore';
import {
  exportFlowAsJson,
  exportFlowAsPng,
  exportFlowAsSvg,
  readProjectFile,
} from '../services/export';

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

  return {
    busy,
    error,
    exportPng: () => run(() => exportFlowAsPng(useFlowStore.getState().nodes, title())),
    exportSvg: () => run(() => exportFlowAsSvg(useFlowStore.getState().nodes, title())),
    exportJson: () => run(() => exportFlowAsJson(useFlowStore.getState().toProject())),
    importJson: (file: File) =>
      run(async () => {
        const project = await readProjectFile(file);
        useFlowStore.getState().importProject(project);
      }),
  };
}
