import { useState } from 'react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import type { FindingSeverity, ImprovementKind } from '../../types/diagnose';
import { EFFORT_KEY, KIND_KEY, SEV_KEY } from '../../services/diagnosisExport';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { diagnosisToMarkdown } from '../../services/diagnosisExport';

const SEV_CLASS: Record<FindingSeverity, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};
const KIND_CLASS: Record<ImprovementKind, string> = {
  'ai-agent': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  automation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  process: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  system: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  control: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

export function DiagnoseModal() {
  const t = useT();
  const lang = useI18n((s) => s.language);
  const open = useFlowStore((s) => s.diagnoseOpen);
  const setOpen = useFlowStore((s) => s.setDiagnoseOpen);
  const nodes = useFlowStore((s) => s.nodes);
  const selectedIds = useFlowStore((s) => s.selectedNodeIds);
  const scope = useFlowStore((s) => s.diagnosisScope);
  const diagnosis = useFlowStore((s) => s.diagnosis);
  const mock = useFlowStore((s) => s.diagnosisMock);
  const busy = useFlowStore((s) => s.isDiagnosing);
  const error = useFlowStore((s) => s.diagnoseError);
  const run = useFlowStore((s) => s.runDiagnosis);
  const selectNode = useFlowStore((s) => s.selectNode);
  const projectTitle = useFlowStore((s) => s.projectTitle);
  const [focus, setFocus] = useState('');
  const [copied, setCopied] = useState(false);

  const label = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;
  const currentScope = busy || diagnosis ? scope : selectedIds;
  const scopeNodes = currentScope.filter((id) => nodes.some((n) => n.id === id));

  const copy = async () => {
    if (!diagnosis) return;
    await navigator.clipboard.writeText(
      diagnosisToMarkdown(diagnosis, nodes, scope, t, projectTitle),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const Chip = ({ id }: { id: string }) => (
    <button
      type="button"
      onClick={() => selectNode(id)}
      title={id}
      className="rounded-full border border-border bg-slate-50 px-2 py-0.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
    >
      {label(id)}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={`🩺 ${t('diagnoseTitle')}`}
      widthClass="max-w-3xl"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          🩺 {t('diagnoseTitle')}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="close"
          className="rounded-md px-2 text-xl leading-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          ×
        </button>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 text-sm text-slate-700 dark:text-slate-200">
        <section className="rounded-lg border border-border bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900/40">
          <div className="mb-1 font-medium">
            {t('diagnoseScope')}:{' '}
            {scopeNodes.length ? `${scopeNodes.length}` : t('diagnoseWholeFlow')}
          </div>
          {scopeNodes.length ? (
            <div className="flex flex-wrap gap-1">
              {scopeNodes.map((id) => (
                <Chip key={id} id={id} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('diagnoseScopeHint')}</p>
          )}
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs text-slate-500 dark:text-slate-400">
            {t('diagnoseFocus')}
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              maxLength={500}
              placeholder={t('diagnoseFocusPh')}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <Button onClick={() => void run(lang, focus)} disabled={busy || nodes.length === 0}>
            {busy ? t('diagnosing') : diagnosis ? t('diagnoseRerun') : t('diagnoseRun')}
          </Button>
        </div>

        {nodes.length === 0 && <p className="text-slate-500">{t('diagnoseEmpty')}</p>}
        {error && (
          <p className="rounded-md bg-red-50 p-2 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        {diagnosis && !busy && (
          <>
            {mock && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {t('diagnoseMock')}
              </p>
            )}
            {diagnosis.summary && (
              <section>
                <h3 className="mb-1 font-semibold">{t('diagnoseSummary')}</h3>
                <p className="leading-relaxed">{diagnosis.summary}</p>
              </section>
            )}
            <section>
              <h3 className="mb-2 font-semibold">
                {t('diagnoseFindings')} ({diagnosis.findings.length})
              </h3>
              {diagnosis.findings.length === 0 && (
                <p className="text-slate-500">{t('diagnoseNone')}</p>
              )}
              <ul className="space-y-2">
                {diagnosis.findings.map((f, i) => (
                  <li key={i} className="rounded-lg border border-border p-3 dark:border-slate-600">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEV_CLASS[f.severity]}`}
                      >
                        {t(SEV_KEY[f.severity])}
                      </span>
                      <span className="font-medium">{f.title}</span>
                    </div>
                    <p className="leading-relaxed">{f.detail}</p>
                    {f.nodeIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {f.nodeIds.map((id) => (
                          <Chip key={id} id={id} />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 font-semibold">
                {t('diagnoseImprovements')} ({diagnosis.improvements.length})
              </h3>
              <ul className="space-y-2">
                {diagnosis.improvements.map((imp, i) => (
                  <li key={i} className="rounded-lg border border-border p-3 dark:border-slate-600">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${KIND_CLASS[imp.kind]}`}
                      >
                        {imp.kind === 'ai-agent' ? '🤖 ' : ''}
                        {t(KIND_KEY[imp.kind])}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('diagnoseEffort')}: {t(EFFORT_KEY[imp.effort])}
                      </span>
                      <span className="font-medium">{imp.title}</span>
                    </div>
                    <p className="leading-relaxed">{imp.detail}</p>
                    {imp.agent && (
                      <p className="mt-2 rounded-md bg-violet-50 p-2 text-xs leading-relaxed text-violet-900 dark:bg-violet-900/30 dark:text-violet-100">
                        <span className="font-semibold">{t('diagnoseAgentSpec')}:</span> {imp.agent}
                      </p>
                    )}
                    {imp.nodeIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {imp.nodeIds.map((id) => (
                          <Chip key={id} id={id} />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {diagnosis && !busy && (
          <Button variant="secondary" onClick={() => void copy()}>
            {copied ? t('copied') : `📋 ${t('copyMarkdown')}`}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t('close')}
        </Button>
      </div>
    </Modal>
  );
}
