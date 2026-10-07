import { useMemo, useState } from 'react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import { exportFlowAsText } from '../../services/export';
import {
  generateScenarios,
  stepText,
  suiteToMarkdown,
  ts,
  MAX_SCENARIOS,
} from '../../services/testScenarios';
import { exportScenariosAsXlsx } from '../../services/xlsxExport';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export function TestScenarioModal() {
  const t = useT();
  const lang = useI18n((s) => s.language);
  const open = useFlowStore((s) => s.testScenarioOpen);
  const setOpen = useFlowStore((s) => s.setTestScenarioOpen);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const title = useFlowStore((s) => s.projectTitle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suite = useMemo(
    () => (open ? generateScenarios({ nodes, edges, title }, lang) : null),
    [open, nodes, edges, title, lang],
  );

  if (!suite) return null;
  const covered = suite.branches.filter((b) => b.scenarioIds.length > 0).length;

  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t('testScenarios')}
      widthClass="max-w-6xl"
    >
      <p className="-mt-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
        {t('testScenariosHint')}
      </p>
      {suite.scenarios.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {t('testScenariosEmpty')}
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              {t('scenarioCount').replace('{n}', String(suite.scenarios.length))}
            </span>
            {suite.branches.length > 0 && (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                {t('branchCovered')
                  .replace('{c}', String(covered))
                  .replace('{t}', String(suite.branches.length))}
              </span>
            )}
            {suite.systems.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                🖥 {suite.systems.map((s) => s.system).join(', ')}
              </span>
            )}
            {suite.interfaces.length > 0 && (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
                🔗 {suite.interfaces.filter((i) => i.mapped).length} / {suite.interfaces.length}
              </span>
            )}
            {suite.truncated && (
              <span className="text-red-600 dark:text-red-300">
                {ts('truncated', lang).replace('{n}', String(MAX_SCENARIOS))}
              </span>
            )}
          </div>
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-border dark:border-slate-600">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  {(
                    [
                      'id',
                      'name',
                      'preconditions',
                      'steps',
                      'expected',
                      'systems',
                      'interfaces',
                    ] as const
                  ).map((k) => (
                    <th
                      key={k}
                      className="border-b border-border px-3 py-2 font-semibold dark:border-slate-600"
                    >
                      {ts(k, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suite.scenarios.map((sc) => (
                  <tr
                    key={sc.id}
                    className="align-top odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-800 dark:even:bg-slate-800/60"
                  >
                    <td className="whitespace-nowrap border-b border-border px-3 py-2 font-mono dark:border-slate-600">
                      {sc.id}
                    </td>
                    <td className="border-b border-border px-3 py-2 font-medium dark:border-slate-600">
                      {sc.name}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-slate-600 dark:border-slate-600 dark:text-slate-300">
                      {sc.preconditions.map((p) => (
                        <div key={p}>{p}</div>
                      ))}
                    </td>
                    <td className="border-b border-border px-3 py-2 dark:border-slate-600">
                      {sc.steps.map((st) => (
                        <div key={st.no}>{stepText(st, lang)}</div>
                      ))}
                    </td>
                    <td className="border-b border-border px-3 py-2 dark:border-slate-600">
                      {sc.expected}
                    </td>
                    <td className="border-b border-border px-3 py-2 dark:border-slate-600">
                      {sc.systems.join(', ')}
                    </td>
                    <td className="border-b border-border px-3 py-2 font-mono text-[11px] dark:border-slate-600">
                      {sc.interfaces.map((i) => (
                        <div
                          key={i}
                          className={i.includes('(') ? 'text-amber-700 dark:text-amber-300' : ''}
                        >
                          {i}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('close')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || suite.scenarios.length === 0}
          onClick={() =>
            run(() =>
              exportFlowAsText(
                suiteToMarkdown(suite, lang),
                `${title || 'flow'}-test-scenarios`,
                'md',
              ),
            )
          }
        >
          📝 {t('downloadMd')}
        </Button>
        <Button
          size="sm"
          disabled={busy || suite.scenarios.length === 0}
          onClick={() => run(() => exportScenariosAsXlsx(suite, lang))}
        >
          📗 {t('downloadXlsx')}
        </Button>
      </div>
    </Modal>
  );
}
