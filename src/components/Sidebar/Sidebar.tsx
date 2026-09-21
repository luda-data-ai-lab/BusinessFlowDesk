import { NodePalette } from './NodePalette';
import { PropertyPanel } from './PropertyPanel';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`relative flex shrink-0 flex-col overflow-hidden border-r border-border bg-white transition-[width] duration-200 dark:border-slate-700 dark:bg-slate-800 ${
        collapsed ? 'w-0' : 'w-64'
      }`}
      aria-hidden={collapsed}
    >
      <div className="min-w-64 flex-1 overflow-y-auto">
        <NodePalette />
        <PropertyPanel />
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="absolute -right-0 top-1/2 z-10 hidden h-12 w-3 -translate-y-1/2 items-center justify-center rounded-l bg-slate-200 text-[9px] text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
        aria-label="Toggle sidebar"
      >
        ◂
      </button>
    </aside>
  );
}
