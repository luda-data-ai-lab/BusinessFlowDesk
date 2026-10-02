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
import { buildShareUrl, copyText } from '../services/share';
import { exportFlowAsPptx } from '../services/pptxExport';

export function useExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    exportPptx: () =>
      run(() =>
        exportFlowAsPptx(
          useFlowStore.getState().toProject(),
          bounds(),
          useI18n.getState().language,
        ),
      ),
    copied,
    shareLink: () =>
      run(async () => {
        const url = await buildShareUrl(useFlowStore.getState().toProject());
        if (url.length > 32_000) throw new Error('Flow too large for a share link');
        await copyText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }),
    importJson: (file: File) =>
      run(async () => {
        const project = await readProjectFile(file);
        useFlowStore.getState().importProject(project);
      }),
  };
}
