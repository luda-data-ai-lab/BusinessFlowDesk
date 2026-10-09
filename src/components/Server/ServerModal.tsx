import { useCallback, useEffect, useState } from 'react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import {
  deleteServerFlow,
  fetchHistory,
  fetchHistoryItem,
  fetchServerCatalog,
  fetchServerFlow,
  fetchServerFlows,
  putServerCatalog,
  putServerFlow,
  type HistoryItem,
  type ServerFlowSummary,
} from '../../services/serverStore';
import { isAIFlowResponse, parseAIFlow } from '../../utils/flowParser';
import type { FlowProject } from '../../types/flow';
import type { RoleType } from '../../types/role';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

type Tab = 'flows' | 'catalog' | 'history';

export function ServerModal() {
  const t = useT();
  const open = useFlowStore((s) => s.serverMenuOpen);
  const setOpen = useFlowStore((s) => s.setServerMenuOpen);
  const projectId = useFlowStore((s) => s.projectId);
  const nodeCount = useFlowStore((s) => s.nodes.length);
  const toProject = useFlowStore((s) => s.toProject);
  const importProject = useFlowStore((s) => s.importProject);
  const importProjectKeepId = useFlowStore((s) => s.importProjectKeepId);
  const systems = useFlowStore((s) => s.systems);
  const interfaces = useFlowStore((s) => s.interfaces);
  const replaceCatalog = useFlowStore((s) => s.replaceCatalog);
  const currentRole = useFlowStore((s) => s.currentRole);

  const [tab, setTab] = useState<Tab>('flows');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [flows, setFlows] = useState<ServerFlowSummary[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await fetchServerFlows();
    setEnabled(res.enabled);
    setFlows(res.items);
    if (res.enabled) {
      try {
        setHistory(await fetchHistory(50));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    void refresh();
  }, [open, refresh]);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const msg = await fn();
      if (msg) setMessage(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const close = () => setOpen(false);
  const isCurrent = (id: string) => id === projectId;

  const saveCurrent = () =>
    run(async () => {
      await putServerFlow(toProject());
      setFlows((await fetchServerFlows()).items);
      return t('serverSaved');
    });

  const load = (id: string) =>
    run(async () => {
      importProjectKeepId(await fetchServerFlow(id));
      close();
      return null;
    });

  const remove = (id: string) =>
    run(async () => {
      if (!window.confirm(t('serverConfirmDelete'))) return null;
      await deleteServerFlow(id);
      setFlows((f) => f.filter((x) => x.id !== id));
      return null;
    });

  const pushCatalog = () =>
    run(async () => {
      await putServerCatalog({ systems, interfaces });
      return t('serverCatalogPushed');
    });

  const pullCatalog = () =>
    run(async () => {
      const remote = await fetchServerCatalog();
      if (!remote.systems.length && !remote.interfaces.length) return t('serverCatalogNone');
      if (!window.confirm(t('serverCatalogConfirmPull'))) return null;
      replaceCatalog(remote.systems, remote.interfaces);
      return t('serverCatalogPulled');
    });

  const openHistoryFlow = (item: HistoryItem) =>
    run(async () => {
      const detail = await fetchHistoryItem(item.id);
      const resp = detail.response as { flow?: unknown } | null;
      const req = detail.request as { role?: string } | null;
      if (!resp || !isAIFlowResponse(resp.flow)) throw new Error(t('historyEmpty'));
      const parsed = parseAIFlow(resp.flow);
      const project: FlowProject = {
        id: 'hist',
        title: parsed.title ?? item.title ?? '',
        role: (req?.role as RoleType | undefined) ?? currentRole,
        nodes: parsed.nodes,
        edges: parsed.edges,
        layoutDirection: 'TB',
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
        version: 1,
      };
      importProject(project);
      close();
      return t('historyLoaded');
    });

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        tab === id
          ? 'bg-primary text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal open={open} onClose={close} title={`☁ ${t('serverTitle')}`} widthClass="max-w-3xl">
      {enabled === null && <p className="text-sm text-slate-500">{t('loading')}</p>}
      {enabled === false && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {t('serverDisabled')}
        </div>
      )}
      {enabled && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1">
            {tabBtn('flows', `${t('serverFlows')} (${flows.length})`)}
            {tabBtn('catalog', t('serverCatalog'))}
            {tabBtn('history', `${t('history')} (${history.length})`)}
            <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={busy}>
              ↻ {t('refresh')}
            </Button>
          </div>

          {tab === 'flows' && (
            <div className="space-y-2">
              <Button size="sm" onClick={saveCurrent} disabled={busy || nodeCount === 0}>
                ☁ {t('serverSaveCurrent')}
              </Button>
              {flows.length === 0 ? (
                <p className="text-sm text-slate-500">{t('serverEmpty')}</p>
              ) : (
                <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border dark:divide-slate-700 dark:border-slate-700">
                  {flows.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`block truncate ${isCurrent(f.id) ? 'font-semibold text-primary' : 'text-slate-800 dark:text-slate-100'}`}
                        >
                          {f.title || t('untitled')}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {f.nodeCount} {t('nodes')} · {new Date(f.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => load(f.id)} disabled={busy}>
                        {t('serverLoad')}
                      </Button>
                      <button
                        type="button"
                        aria-label={t('serverDelete')}
                        title={t('serverDelete')}
                        onClick={() => remove(f.id)}
                        disabled={busy}
                        className="rounded p-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      >
                        🗑
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'catalog' && (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600 dark:text-slate-300">
                🖥 {systems.length} · 🔗 {interfaces.length}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={pushCatalog} disabled={busy}>
                  ⬆ {t('serverCatalogPush')}
                </Button>
                <Button size="sm" variant="ghost" onClick={pullCatalog} disabled={busy}>
                  ⬇ {t('serverCatalogPull')}
                </Button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">{t('historyEmpty')}</p>
              ) : (
                <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border dark:divide-slate-700 dark:border-slate-700">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          h.kind === 'generate'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                        }`}
                      >
                        {h.kind}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-slate-800 dark:text-slate-100">
                          {h.title || h.prompt || '—'}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {new Date(h.createdAt).toLocaleString()} · {h.status}
                          {h.mock ? ' · demo' : h.model ? ` · ${h.model}` : ''}
                          {h.error ? ` · ${h.error}` : ''}
                        </span>
                      </div>
                      {h.kind === 'generate' && h.status === 200 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openHistoryFlow(h)}
                          disabled={busy}
                        >
                          {t('historyOpenFlow')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {message && <p className="text-sm text-green-700 dark:text-green-300">{message}</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
