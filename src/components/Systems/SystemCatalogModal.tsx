import { useState } from 'react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import {
  SYSTEM_CATEGORIES,
  SYSTEM_COLORS,
  type BusinessSystem,
  type SystemCategory,
} from '../../types/system';
import { MAX_SYSTEMS, MAX_SYSTEM_NAME } from '../../services/systemCatalog';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

const inputClass =
  'w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

interface Draft {
  name: string;
  category: SystemCategory;
  owner: string;
  description: string;
  color: string;
}

const emptyDraft = (color: string): Draft => ({
  name: '',
  category: 'internal',
  owner: '',
  description: '',
  color,
});

export function SystemCatalogModal() {
  const t = useT();
  const open = useFlowStore((s) => s.systemCatalogOpen);
  const setOpen = useFlowStore((s) => s.setSystemCatalogOpen);
  const systems = useFlowStore((s) => s.systems);
  const nodes = useFlowStore((s) => s.nodes);
  const addSystem = useFlowStore((s) => s.addSystem);
  const updateSystem = useFlowStore((s) => s.updateSystem);
  const removeSystem = useFlowStore((s) => s.removeSystem);
  const registerFromFlow = useFlowStore((s) => s.registerSystemsFromFlow);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(SYSTEM_COLORS[0]));
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const usage = (name: string) =>
    nodes.filter((n) => n.data.system?.trim().toLowerCase() === name.toLowerCase()).length;
  const unregisteredInFlow = [
    ...new Set(nodes.map((n) => n.data.system?.trim()).filter(Boolean)),
  ].filter((name) => !systems.some((s) => s.name.toLowerCase() === (name as string).toLowerCase()));

  const reset = () => {
    setEditing(null);
    setDraft(emptyDraft(SYSTEM_COLORS[systems.length % SYSTEM_COLORS.length]));
  };
  const startEdit = (s: BusinessSystem) => {
    setEditing(s.id);
    setDraft({
      name: s.name,
      category: s.category,
      owner: s.owner ?? '',
      description: s.description ?? '',
      color: s.color,
    });
    setMessage(null);
  };
  const submit = () => {
    const name = draft.name.trim();
    if (!name) return;
    const dup = systems.find(
      (s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== editing,
    );
    if (dup) {
      setMessage(t('systemDuplicate'));
      return;
    }
    if (!editing && systems.length >= MAX_SYSTEMS) {
      setMessage(t('systemLimit').replace('{n}', String(MAX_SYSTEMS)));
      return;
    }
    if (editing) {
      updateSystem(editing, {
        name,
        category: draft.category,
        owner: draft.owner.trim() || undefined,
        description: draft.description.trim() || undefined,
        color: draft.color,
      });
    } else {
      addSystem({ ...draft, name });
    }
    setMessage(null);
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t('systemCatalog')}
      widthClass="max-w-3xl"
    >
      <p className="-mt-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
        {t('systemCatalogHint')}
      </p>

      <div className="max-h-[40vh] overflow-auto rounded-lg border border-border dark:border-slate-600">
        {systems.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{t('systemEmpty')}</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">{t('systemName')}</th>
                <th className="px-3 py-2">{t('systemCategory')}</th>
                <th className="px-3 py-2">{t('systemOwner')}</th>
                <th className="px-3 py-2">{t('systemDescription')}</th>
                <th className="px-3 py-2 text-right">{t('systemUsage')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {systems.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t border-border dark:border-slate-600 ${editing === s.id ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}
                >
                  <td className="px-3 py-2 font-medium">
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: s.color }}
                    />
                    {s.name}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {t(`systemCat_${s.category}`)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.owner}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-slate-500 dark:text-slate-400">
                    {s.description}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{usage(s.name) || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => startEdit(s)}
                    >
                      {t('systemEdit')}
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-red-600 hover:underline dark:text-red-300"
                      onClick={() => {
                        if (window.confirm(t('systemDeleteConfirm'))) {
                          removeSystem(s.id);
                          if (editing === s.id) reset();
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

      {unregisteredInFlow.length > 0 && (
        <button
          type="button"
          className="mt-2 text-xs text-primary hover:underline"
          onClick={() => {
            const n = registerFromFlow();
            setMessage(t('systemImported').replace('{n}', String(n)));
          }}
        >
          📥 {t('systemImportFromFlow')} ({unregisteredInFlow.join(', ')})
        </button>
      )}

      <form
        className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-border p-3 dark:border-slate-600 sm:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="col-span-2 block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('systemName')}
          </span>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="ERP, CRM, 결제 PG …"
            maxLength={MAX_SYSTEM_NAME}
            required
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('systemCategory')}
          </span>
          <select
            className={inputClass}
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as SystemCategory })}
          >
            {SYSTEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`systemCat_${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('systemOwner')}
          </span>
          <input
            className={inputClass}
            value={draft.owner}
            onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
          />
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            {t('systemDescription')}
          </span>
          <input
            className={inputClass}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
        <div className="col-span-2 flex items-end gap-1 sm:col-span-4">
          <span className="mr-1 text-[11px] font-medium text-slate-500">{t('systemColor')}</span>
          {SYSTEM_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setDraft({ ...draft, color: c })}
              className={`h-5 w-5 rounded-full border-2 ${draft.color === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="col-span-2 flex items-end justify-end gap-2">
          {editing && (
            <Button size="sm" variant="ghost" type="button" onClick={reset}>
              {t('close')}
            </Button>
          )}
          <Button
            size="sm"
            type="submit"
            disabled={!draft.name.trim() || (!editing && systems.length >= MAX_SYSTEMS)}
          >
            {editing ? t('systemSave') : `+ ${t('systemAdd')}`}
          </Button>
        </div>
      </form>
      {(message || (!editing && systems.length >= MAX_SYSTEMS)) && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {message ?? t('systemLimit').replace('{n}', String(MAX_SYSTEMS))}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('close')}
        </Button>
      </div>
    </Modal>
  );
}
