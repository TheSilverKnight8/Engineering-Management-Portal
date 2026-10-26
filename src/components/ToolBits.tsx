import { Link } from 'react-router';
import { categoryLabels, ppeLabels } from '../content/catalog';
import type { Tool } from '../content/types';
import { NoGlovesIcon, PpeIcon } from '../graphics/Icons';
import { ToolArt } from '../graphics/ToolArt';
import { cx } from './ui';

export function PpeRow({ tool, size = 'md' }: { tool: Tool; size?: 'sm' | 'md' }) {
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1 text-muted">
        {tool.ppe.map((p) => (
          <span key={p} title={ppeLabels[p]}>
            <PpeIcon id={p} size={18} />
          </span>
        ))}
        {tool.noGloves && (
          <span title="No gloves">
            <NoGlovesIcon size={18} />
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {tool.ppe.map((p) => (
        <span key={p} className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-2 pr-3 text-sm font-medium">
          <PpeIcon id={p} size={22} />
          {ppeLabels[p]}
        </span>
      ))}
      {tool.noGloves && (
        <span className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/8 py-1.5 pl-2 pr-3 text-sm font-medium text-danger">
          <NoGlovesIcon size={22} />
          No gloves
        </span>
      )}
    </div>
  );
}

export function ToolCard({ tool, footer, className, style }: { tool: Tool; footer?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <Link
      to={`/tools/${tool.slug}`}
      style={style}
      className={cx('group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-pop', className)}
    >
      <div className="art-tile relative border-b border-line px-6 py-4 text-ink">
        <ToolArt slug={tool.slug} className="mx-auto aspect-square w-full max-w-[9.5rem] transition duration-300 group-hover:scale-[1.04]" />
        <span className="label-caps absolute left-3 top-3 text-muted">{tool.form}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <div className="text-xs text-muted">{categoryLabels[tool.category]}</div>
          <h3 className="text-base font-semibold leading-snug">{tool.name}</h3>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <PpeRow tool={tool} size="sm" />
          {footer}
        </div>
      </div>
    </Link>
  );
}
