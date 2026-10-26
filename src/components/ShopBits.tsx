import { Link } from 'react-router';
import { Database, TriangleAlert } from 'lucide-react';
import type { ToolStatus } from '../lib/types';
import type { Availability } from '../lib/shop';
import { formatTime, dayLabel } from '../lib/time';
import { useAuth } from '../lib/auth';
import { Chip, EmptyState } from './ui';
import type { ReactNode } from 'react';

export function StatusChip({ status }: { status: ToolStatus }) {
  return status === 'operational' ? (
    <Chip tone="ok" icon={<span className="size-1.5 rounded-full bg-ok" />}>
      Operational
    </Chip>
  ) : (
    <Chip tone="warn" icon={<TriangleAlert className="size-3" />}>
      Needs maintenance
    </Chip>
  );
}

export function AvailabilityLine({ a, names }: { a: Availability; names: (id: string) => string }) {
  if (a.current) {
    return (
      <span className="text-sm">
        <span className="font-medium text-accent">Checked out</span>
        <span className="text-muted">
          {' '}
          · {a.current.borrower} until {dayLabel(new Date(a.current.ends_at)) === 'Today' ? formatTime(new Date(a.current.ends_at)) : `${dayLabel(new Date(a.current.ends_at))} ${formatTime(new Date(a.current.ends_at))}`}
        </span>
        {a.current.borrower !== names(a.current.user_id) && <span className="text-muted"> (by {names(a.current.user_id)})</span>}
      </span>
    );
  }
  return (
    <span className="text-sm">
      <span className="font-medium text-ok">Available</span>
      {a.next && (
        <span className="text-muted">
          {' '}
          · next: {a.next.borrower}, {dayLabel(new Date(a.next.starts_at))} {formatTime(new Date(a.next.starts_at))}
        </span>
      )}
    </span>
  );
}

/** Wraps screens that need Supabase. In content preview they explain why they are empty. */
export function Live({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'preview') {
    return (
      <EmptyState
        art={
          <div className="flex size-16 items-center justify-center rounded-2xl bg-blue/10 text-blue">
            <Database className="size-8" />
          </div>
        }
        title="Connect Supabase to use this"
        className="py-24"
      >
        This part of the app keeps its data in Supabase. Follow “Set up Supabase” in the README, then add the URL and publishable key to <code className="font-mono text-ink">.env.local</code>. The tool library, picker, and Learn pages work without it.
        <div className="mt-4">
          <Link to="/tools" className="text-blue hover:underline">
            Open the tool library
          </Link>
        </div>
      </EmptyState>
    );
  }
  return <>{children}</>;
}
