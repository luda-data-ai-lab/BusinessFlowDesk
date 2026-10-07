import { useEffect, useState } from 'react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import {
  INTERFACE_FREQUENCIES,
  INTERFACE_METHODS,
  type BusinessInterface,
  type InterfaceFrequency,
  type InterfaceMethod,
} from '../../types/interface';
import {
  MAX_INTERFACE_CODE,
  MAX_INTERFACES,
  nextInterfaceCode,
  systemBoundaries,
} from '../../services/interfaceCatalog';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

const inputClass =
  'w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

interface Draft {
  code: string;
  name: string;
  source: string;
  target: string;
  method: InterfaceMethod;
  frequency: InterfaceFrequency;
  description: string;
}

const emptyDraft = (code: string, source = '', target = ''): Draft => ({
  code,
  name: '',
  source,
  target,
  method: 'rest',
  frequency: 'realtime',
  description: '',
});

export function InterfaceCatalogModal() {
  const t = useT();
  const open = useFlowStore((s) => s.interfaceCatalogOpen);
  const prefill = useFlowStore((s) => s.interfacePrefill);
  const setOpen = useFlowStore((s) => s.setInterfaceCatalogOpen);
  const interfaces = useFlowStore((s) => s.interfaces);
  const systems = useFlowStore((s) => s.systems);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const addInterface = useFlowStore((s) => s.addInterface);
  const updateInterface = useFlowStore((s) => s.updateInterface);
  const removeInterface = useFlowStore((s) => s.removeInterface);
  const updateEdge = useFlowStore((s) => s.updateEdge);
  const selectEdge = useFlowStore((s) => s.selectEdge);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(nextInterfaceCode(interfaces)));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEditing(null);
    setMessage(null);
    setDraft(emptyDraft(nextInterfaceCode(interfaces), prefill?.source, prefill?.target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  if (!open) return null;

  const boundaries = systemBoundaries(nodes, edges, interfaces);
  const unmapped = boundaries.filter((b) => !b.code);
  const usage = (code: string) =>
    edges.filter((e) => e.data?.interface?.trim().toLowerCase() === code.toLowerCase()).length;
  const systemNames = [
    ...new Set([
      ...systems.map((s) => s.name),
      ...nodes.map((n) => n.data.system?.trim()).filter((v): v is string => !!v),
    ]),
  ];
  const label = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;

  const reset = () => {
    setEditing(null);
    setDraft(emptyDraft(nextInterfaceCode(interfaces)));
  };
  const startEdit = (i: BusinessInterface) => {
    setEditing(i.id);
    setDraft({
      code: i.code,
      name: i.name ?? '',
      source: i.source,
      target: i.target,
      method: i.method,
      frequency: i.frequency,
      description: i.description ?? '',
    });
    setMessage(null);
  };
  const submit = () => {
    const code = draft.code.trim();
    if (!code || !draft.source.trim() || !draft.target.trim()) return;
    const dup = interfaces.find(
      (i) => i.code.toLowerCase() === code.toLowerCase() && i.id !== editing,
    );
    if (dup) {
      setMessage(t('interfaceDuplicate'));
      return;
    }
    if (editing) {
      updateInterface(editing, { ...draft, code });
    } else {
      if (interfaces.length >= MAX_INTERFACES) {
        setMessage(t('interfaceLimit').replace('{n}', String(MAX_INTERFACES)));
        return;
      }
      const added = addInterface({ ...draft, code });
      if (added && prefill?.edgeId) {
        updateEdge(prefill.edgeId, { interface: added.code });
      }
    }
    setMessage(null);
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t('interfaceCatalog')}
      widthClass="max-w-4xl"
    >
      <p className="-mt-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
        {t('interfaceCatalogHint')}
      </p>

      <div className="max-h-[32vh] overflow-auto rounded-lg border border-border dark:border-slate-600">
        {interfaces.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{t('interfaceEmpty')}</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">{t('interfaceCode')}</th>
                <th className="px-3 py-2">{t('interfaceName')}</th>
                <th className="px-3 py-2">
                  {t('interfaceSource')} → {t('interfaceTarget')}
                </th>
                <th className="px-3 py-2">{t('interfaceMethod')}</th>
                <th className="px-3 py-2">{t('interfaceFrequency')}</th>
                <th className="px-3 py-2 text-right">{t('interfaceUsage')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {interfaces.map((i) => (
                <tr
                  key={i.id}
                  className={`border-t border-border dark:border-slate-600 ${editing === i.id ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-medium">{i.code}</td>
                  <td className="max-w-[160px] truncate px-3 py-2">{i.name}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {i.source} → {i.target}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {t(`interfaceMethod_${i.method}`)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {t(`interfaceFreq_${i.frequency}`)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{usage(i.code) || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => startEdit(i)}
                    >
                      {t('systemEdit')}
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-red-600 hover:underline dark:text-red-300"
                      onClick={() => {
                        if (window.confirm(t('interfaceDeleteConfirm'))) {
                          removeInterface(i.id);
                          if (editing === i.id) reset();
                        }
                      }}
                    >
                      {t('systemDelete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form
        className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-border p-3 dark:border-slate-600 sm:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('interfaceCode')}
          </span>
          <input
            className={`${inputClass} font-mono`}
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            maxLength={MAX_INTERFACE_CODE}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('interfaceName')}
          </span>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="주문 전송, 재고 동기화 …"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('interfaceSource')}
          </span>
          <input
            className={inputClass}
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            list="bfd-iface-systems"
            required
            autoFocus={!!prefill}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('interfaceTarget')}
          </span>
          <input
            className={inputClass}
            value={draft.target}
            onChange={(e) => setDraft({ ...draft, target: e.target.value })}
            list="bfd-iface-systems"
            required
          />
        </label>
        <datalist id="bfd-iface-systems">
          {systemNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('interfaceMethod')}
          </span>
          <select
            className={inputClass}
            value={draft.method}
            onChange={(e) => setDraft({ ...draft, method: e.target.value as InterfaceMethod })}
          >
            {INTERFACE_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`interfaceMethod_${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('interfaceFrequency')}
          </span>
          <select
            className={inputClass}
            value={draft.frequency}
            onChange={(e) =>
              setDraft({ ...draft, frequency: e.target.value as InterfaceFrequency })
            }
          >
            {INTERFACE_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`interfaceFreq_${f}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block sm:col-span-4">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('interfaceDescription')}
          </span>
          <input
            className={inputClass}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
        <div className="col-span-2 flex items-end justify-end gap-2">
          {editing && (
            <Button size="sm" variant="ghost" type="button" onClick={reset}>
              {t('close')}
            </Button>
          )}
          <Button
            size="sm"
            type="submit"
            disabled={
              !draft.code.trim() ||
              !draft.source.trim() ||
              !draft.target.trim() ||
              (!editing && interfaces.length >= MAX_INTERFACES)
            }
          >
            {editing ? t('systemSave') : `+ ${t('interfaceAdd')}`}
          </Button>
        </div>
      </form>
      {(message || (!editing && interfaces.length >= MAX_INTERFACES)) && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {message ?? t('interfaceLimit').replace('{n}', String(MAX_INTERFACES))}
        </p>
      )}

      <section className="mt-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('interfaceBoundaries')}
          {unmapped.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              ⚠ {t('interfaceUnmappedCount').replace('{n}', String(unmapped.length))}
            </span>
          )}
        </h3>
        {boundaries.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('interfaceNoBoundaries')}</p>
        ) : (
          <div className="max-h-[22vh] overflow-auto rounded-lg border border-border dark:border-slate-600">
            <table className="w-full text-left text-xs">
              <tbody>
                {boundaries.map((b) => {
                  const matching = interfaces.filter(
                    (i) =>
                      (i.source.toLowerCase() === b.from.toLowerCase() &&
                        i.target.toLowerCase() === b.to.toLowerCase()) ||
                      (i.source.toLowerCase() === b.to.toLowerCase() &&
                        i.target.toLowerCase() === b.from.toLowerCase()),
                  );
                  const others = interfaces.filter((i) => !matching.includes(i));
                  return (
                    <tr
                      key={b.edge.id}
                      className={`border-t border-border first:border-t-0 dark:border-slate-600 ${b.code ? '' : 'bg-amber-50/60 dark:bg-amber-950/20'}`}
                    >
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => {
                            selectEdge(b.edge.id);
                            setOpen(false);
                          }}
                        >
                          {label(b.edge.source)} → {label(b.edge.target)}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-300">
                        {b.from} → {b.to}
                      </td>
                      <td className="w-56 px-3 py-1.5">
                        <select
                          className={inputClass}
                          value={b.code ?? ''}
                          onChange={(e) => updateEdge(b.edge.id, { interface: e.target.value })}
                        >
                          <option value="">
                            {b.code ? t('interfaceNone') : `⚠ ${t('interfaceUnmapped')}`}
                          </option>
                          {matching.length > 0 && (
                            <optgroup label={t('interfaceSuggested')}>
                              {matching.map((i) => (
                                <option key={i.id} value={i.code}>
                                  {i.code}
                                  {i.name ? ` · ${i.name}` : ''}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {others.length > 0 && (
                            <optgroup label={t('interfaceOthers')}>
                              {others.map((i) => (
                                <option key={i.id} value={i.code}>
                                  {i.code} ({i.source} → {i.target})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {b.code && !b.interface && <option value={b.code}>{b.code}</option>}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">
                        {!b.code && (
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => {
                              setEditing(null);
                              setMessage(null);
                              setDraft(emptyDraft(nextInterfaceCode(interfaces), b.from, b.to));
                              setOpen(true, { source: b.from, target: b.to, edgeId: b.edge.id });
                            }}
                          >
                            + {t('interfaceAdd')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('close')}
        </Button>
      </div>
    </Modal>
  );
}
