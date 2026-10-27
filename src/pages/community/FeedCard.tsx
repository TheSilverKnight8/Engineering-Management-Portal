import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Flag, Megaphone, RotateCcw, ShieldOff, Trash2 } from 'lucide-react';
import { useAuth, useMe } from '../../lib/auth';
import { useRoster, keys } from '../../lib/queries';
import { canModerate, type Announcement, type Post } from '../../lib/types';
import { db, postImageUrl, POST_IMAGE_BUCKET } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { formatDate, relativeTime } from '../../lib/time';
import { APP_NAME } from '../../config';
import { AppMark } from '../../graphics/Icons';
import { Avatar, Button, Card, Chip, cx } from '../../components/ui';
import { POST_KIND_META } from './postKinds';

type FeedItem = { source: 'post'; item: Post } | { source: 'announcement'; item: Announcement };

const SOURCE = {
  post: { table: 'posts', key: keys.posts, noun: 'post' },
  announcement: { table: 'announcements', key: keys.announcements, noun: 'announcement' },
} as const;

// One card for posts and announcements. Announcements that the database adds
// when someone joins (joined_id) show that person's current name.
export function FeedCard({ entry, onReport, onView }: { entry: FeedItem; onReport: () => void; onView: (url: string) => void }) {
  const me = useMe();
  const { profile } = useAuth();
  const roster = useRoster();
  const qc = useQueryClient();
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const { item } = entry;
  const src = SOURCE[entry.source];
  const Noun = src.noun[0].toUpperCase() + src.noun.slice(1);
  const joined = entry.source === 'announcement' && entry.item.joined_id ? (roster.byId.get(entry.item.joined_id)?.full_name ?? 'A new member') : null;
  const author = roster.byId.get(item.author_id ?? '');
  const mine = item.author_id === me.id;
  const isMod = canModerate(profile);
  const title = joined ? `Welcome, ${joined}!` : item.title;
  const body = joined ? `${joined} joined the ${APP_NAME}.` : item.body;
  const deadline = entry.source === 'post' ? entry.item.deadline : null;

  const del = useMutation({
    mutationFn: async () => {
      if (item.image_paths.length) await db().storage.from(POST_IMAGE_BUCKET).remove(item.image_paths);
      const { error } = await db().from(src.table).delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: src.key });
      toast(`${Noun} deleted.`);
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const moderate = useMutation({
    mutationFn: async (remove: boolean) => {
      const { error } = await db().rpc('moderate_content', { target_type: entry.source, target_id: item.id, remove });
      if (error) throw error;
    },
    onSuccess: (_d, remove) => {
      void qc.invalidateQueries({ queryKey: src.key });
      void qc.invalidateQueries({ queryKey: keys.reports });
      toast(remove ? `${Noun} removed.` : `${Noun} restored.`);
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const longBody = (body?.length ?? 0) > 280;
  const deadlinePassed = deadline && new Date(deadline + 'T23:59:59') < new Date();
  let host = '';
  try {
    host = item.link_url ? new URL(item.link_url).hostname.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }

  return (
    <Card id={item.id} className={cx('overflow-hidden', item.removed_at && 'opacity-70')}>
      {item.removed_at && (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger/8 px-4 py-2 text-xs font-medium text-danger">
          <ShieldOff className="size-3.5" />
          {mine && !isMod ? `A moderator removed this ${src.noun}. Only you can see it.` : 'Removed by a moderator. Only moderators and the author can see it.'}
        </div>
      )}
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          {joined ? <AppMark size={36} /> : <Avatar name={author?.full_name ?? '?'} size={36} />}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold">{joined ? APP_NAME : (author?.full_name ?? 'Former member')}</div>
            <div className="text-xs text-muted">{relativeTime(item.created_at)}</div>
          </div>
          {entry.source === 'post' ? (
            <KindChip tone={POST_KIND_META[entry.item.kind].tone} icon={POST_KIND_META[entry.item.kind].icon} label={POST_KIND_META[entry.item.kind].label} />
          ) : (
            <KindChip tone="bg-accent/12 text-accent" icon={Megaphone} label="Announcement" />
          )}
        </div>

        <h2 className="font-sans text-lg font-semibold normal-case leading-snug tracking-normal">{title}</h2>
        {deadline && (
          <div className="mt-2">
            <Chip tone={deadlinePassed ? 'neutral' : 'warn'} icon={<CalendarDays className="size-3.5" />}>
              {deadlinePassed ? 'Closed' : 'Deadline'} {formatDate(deadline + 'T12:00:00')}
            </Chip>
          </div>
        )}
        {body && (
          <p className={cx('mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink/90', !expanded && longBody && 'line-clamp-4')}>{body}</p>
        )}
        {longBody && (
          <button onClick={() => setExpanded((e) => !e)} className="mt-1 text-sm font-medium text-navy">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {item.link_url && (
          <a href={item.link_url} target="_blank" rel="noreferrer noopener" className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-raised p-3 transition hover:border-navy/40">
            <ExternalLink className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">{host || item.link_url}</span>
          </a>
        )}

        {item.image_paths.length > 0 && (
          <div className={cx('mt-3 grid gap-1.5 overflow-hidden rounded-xl', item.image_paths.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {item.image_paths.map((path) => {
              const url = postImageUrl(path);
              return (
                <button key={path} onClick={() => onView(url)} className={cx('overflow-hidden bg-raised', item.image_paths.length === 1 ? 'max-h-[28rem]' : 'aspect-square')}>
                  <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              );
            })}
          </div>
        )}

        {(isMod || mine || !joined) && (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-line pt-2.5">
            {isMod &&
              (item.removed_at ? (
                <Button size="sm" variant="ghost" onClick={() => moderate.mutate(false)} loading={moderate.isPending}>
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
              ) : (
                !mine && (
                  <Button size="sm" variant="ghost" onClick={() => moderate.mutate(true)} loading={moderate.isPending}>
                    <ShieldOff className="size-4" />
                    Remove
                  </Button>
                )
              ))}
            {mine ? (
              <Button size="sm" variant="ghost" onClick={() => confirm(`Delete this ${src.noun}? This cannot be undone.`) && del.mutate()} loading={del.isPending}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : (
              !item.removed_at &&
              !joined && (
                <Button size="sm" variant="ghost" onClick={onReport}>
                  <Flag className="size-4" />
                  Report
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function KindChip({ tone, icon: Icon, label }: { tone: string; icon: typeof Megaphone; label: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', tone)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
