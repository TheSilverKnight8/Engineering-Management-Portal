import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useReports, useRoster, keys } from '../lib/queries';
import { canModerate, type Report } from '../lib/types';
import { db } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { relativeTime } from '../lib/time';
import { PageHeader } from '../components/PageHeader';
import { Button, Card, Chip, EmptyState, LoadingBlock, cx } from '../components/ui';
import NotFound from './NotFound';

export default function Moderation() {
  const { profile } = useAuth();
  const isMod = canModerate(profile);
  const reports = useReports(isMod);
  const [showResolved, setShowResolved] = useState(false);
  if (!isMod) return <NotFound />;

  const open = (reports.data ?? []).filter((r) => !r.resolved_at);
  const resolved = (reports.data ?? []).filter((r) => r.resolved_at);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Teachers and mods"
        title="Moderation"
        subtitle="Reported posts and messages. Removing hides the content from everyone except moderators and its author; you can restore it later."
      />
      {reports.isLoading ? (
        <LoadingBlock />
      ) : open.length === 0 ? (
        <EmptyState
          art={
            <div className="flex size-14 items-center justify-center rounded-2xl bg-ok/12 text-ok">
              <ShieldCheck className="size-7" />
            </div>
          }
          title="Nothing to review"
        >
          When someone reports a post or a message, it shows here.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {open.map((r) => (
            <ReportCard key={r.id} r={r} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="mt-10">
          <button onClick={() => setShowResolved((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ChevronDown className={cx('size-4 transition', showResolved && 'rotate-180')} />
            {resolved.length} resolved
          </button>
          {showResolved && (
            <div className="mt-3 space-y-3">
              {resolved.map((r) => (
                <ReportCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ReportCard({ r }: { r: Report }) {
  const roster = useRoster();
  const qc = useQueryClient();
  const toast = useToast();
  const name = (id: string | null | undefined) => (id && roster.byId.get(id)?.full_name) || 'Former member';
  const snap = r.snapshot ?? {};
  const link = r.target_type === 'post' ? `/community#${r.target_id}` : `/groups/${snap.group_id}`;

  const act = useMutation({
    mutationFn: async (action: 'remove' | 'dismiss') => {
      const { error } =
        action === 'remove'
          ? await db().rpc('moderate_content', { target_type: r.target_type, target_id: r.target_id, remove: true })
          : await db().rpc('dismiss_report', { report: r.id });
      if (error) throw error;
      return action;
    },
    onSuccess: (action) => {
      void qc.invalidateQueries({ queryKey: keys.reports });
      void qc.invalidateQueries({ queryKey: keys.posts });
      toast(action === 'remove' ? 'Removed.' : 'Report dismissed.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <Card className={cx('p-5', r.resolved_at && 'opacity-70')}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Chip tone={r.target_type === 'post' ? 'navy' : 'neutral'}>{r.target_type === 'post' ? 'Post' : `Message in ${snap.group_name ?? 'a group'}`}</Chip>
        <span>
          Reported by {name(r.reporter_id)} · {relativeTime(r.created_at)}
        </span>
        {r.resolution && <Chip tone={r.resolution === 'removed' ? 'danger' : 'ok'}>{r.resolution === 'removed' ? 'Removed' : 'Dismissed'}</Chip>}
      </div>
      {r.reason && <p className="mb-3 text-sm">“{r.reason}”</p>}
      <div className="rounded-xl border border-line bg-raised p-4">
        <div className="mb-1 text-xs font-medium text-muted">{snap.author_name ?? name(snap.author_id)} wrote:</div>
        {snap.title && <div className="font-semibold">{snap.title}</div>}
        {snap.body && <p className="mt-1 whitespace-pre-wrap text-sm">{snap.body}</p>}
        {snap.link_url && <div className="mt-1 truncate text-sm text-navy">{snap.link_url}</div>}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Link to={link} className="text-sm text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">
          See it in context
        </Link>
        {!r.resolved_at && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => act.mutate('dismiss')} loading={act.isPending && act.variables === 'dismiss'}>
              Dismiss
            </Button>
            <Button size="sm" variant="danger" onClick={() => act.mutate('remove')} loading={act.isPending && act.variables === 'remove'}>
              <ShieldOff className="size-4" />
              Remove {r.target_type}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
