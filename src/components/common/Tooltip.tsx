import type { ReactNode } from 'react';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
}

export function Tooltip({ label, children, side = 'bottom' }: TooltipProps) {
  const pos = side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-slate-700 ${pos}`}
      >
        {label}
      </span>
    </span>
  );
}
