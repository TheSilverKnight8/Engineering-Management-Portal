import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({ title, subtitle, back, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; back?: { to: string; label: string }; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-6 animate-rise lg:mb-8">
      {back && (
        <Link to={back.to} className="-ml-1 mb-3 inline-flex items-center gap-0.5 text-sm text-muted transition hover:text-ink">
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="label-mono mb-2 text-accent">{eyebrow}</div>}
          <h1 className="text-[1.75rem] font-bold leading-tight sm:text-[2.125rem]">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
