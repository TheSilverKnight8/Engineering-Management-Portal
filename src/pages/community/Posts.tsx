import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Flag, Plus, RotateCcw, ShieldOff, Trash2 } from 'lucide-react';
import { useAuth, useMe } from '../../lib/auth';
import { usePosts, useRoster, keys } from '../../lib/queries';
import { canModerate, type Post, type PostKind } from '../../lib/types';
import { db, postImageUrl, POST_IMAGE_BUCKET } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { formatDate, relativeTime } from '../../lib/time';
import { PageHeader } from '../../components/PageHeader';
import { Avatar, Button, Card, Chip, EmptyState, LoadingBlock, cx } from '../../components/ui';
import { CommunityTabs } from './CommunityTabs';
import { PostComposer } from './PostComposer';
import { ReportSheet } from './ReportSheet';
import { POST_KIND_META } from './postKinds';

export default function Posts() {
  const posts = usePosts();
  const [filter, setFilter] = useState<PostKind | 'all'>('all');
  const [composing, setComposing] = useState(false);
  const [reporting, setReporting] = useState<{ type: 'post'; id: string } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const rows = useMemo(() => (posts.data ?? []).filter((p) => filter === 'all' || p.kind === filter), [posts.data, filter]);

  // Links like /community#<id> from the home screen scroll to that post.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && posts.data) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [posts.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title="Posts"
        subtitle="Engineering papers, competition opportunities, and cool builds from the class."
        actions={
          <Button variant="primary" onClick={() => setComposing(true)}>
            <Plus className="size-4" />
            New post
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <CommunityTabs />
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {(['all', 'paper', 'competition', 'build'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cx('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition', filter === k ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted hover:text-ink')}
            >
              {k === 'all' ? 'All' : POST_KIND_META[k].plural}
            </button>
          ))}
        </div>
      </div>

      {posts.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No posts yet" action={<Button onClick={() => setComposing(true)}>Write the first one</Button>}>
          Share a paper you liked, a competition the class could enter, or something you built.
        </EmptyState>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {rows.map((p) => (
            <PostCard key={p.id} post={p} onReport={() => setReporting({ type: 'post', id: p.id })} onView={setViewing} />
          ))}
        </div>
      )}

      <PostComposer open={composing} onClose={() => setComposing(false)} />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
      {viewing && (
        <button className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setViewing(null)} aria-label="Close photo">
          <img src={viewing} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </button>
      )}
    </div>
  );
}

function PostCard({ post, onReport, onView }: { post: Post; onReport: () => void; onView: (url: string) => void }) {
  const me = useMe();
  const { profile } = useAuth();
  const roster = useRoster();
  const qc = useQueryClient();
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const meta = POST_KIND_META[post.kind];
  const author = roster.byId.get(post.author_id ?? '');
  const mine = post.author_id === me.id;
  const isMod = canModerate(profile);

  const del = useMutation({
    mutationFn: async () => {
      if (post.image_paths.length) await db().storage.from(POST_IMAGE_BUCKET).remove(post.image_paths);
      const { error } = await db().from('posts').delete().eq('id', post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.posts });
      toast('Post deleted.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const moderate = useMutation({
    mutationFn: async (remove: boolean) => {
      const { error } = await db().rpc('moderate_content', { target_type: 'post', target_id: post.id, remove });
      if (error) throw error;
    },
    onSuccess: (_d, remove) => {
      void qc.invalidateQueries({ queryKey: keys.posts });
      void qc.invalidateQueries({ queryKey: keys.reports });
      toast(remove ? 'Post removed.' : 'Post restored.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const longBody = (post.body?.length ?? 0) > 280;
  const deadlinePassed = post.deadline && new Date(post.deadline + 'T23:59:59') < new Date();
  let host = '';
  try {
    host = post.link_url ? new URL(post.link_url).hostname.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }

  return (
    <Card id={post.id} className={cx('overflow-hidden', post.removed_at && 'opacity-70')}>
      {post.removed_at && (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger/8 px-4 py-2 text-xs font-medium text-danger">
          <ShieldOff className="size-3.5" />
          {mine && !isMod ? 'A moderator removed this post. Only you can see it.' : 'Removed by a moderator. Only moderators and the author can see it.'}
        </div>
      )}
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={author?.full_name ?? '?'} size={36} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold">{author?.full_name ?? 'Former member'}</div>
            <div className="text-xs text-muted">{relativeTime(post.created_at)}</div>
          </div>
          <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', meta.tone)}>
            <meta.icon className="size-3.5" />
            {meta.label}
          </span>
        </div>

        <h2 className="text-lg font-semibold leading-snug">{post.title}</h2>
        {post.deadline && (
          <div className="mt-2">
            <Chip tone={deadlinePassed ? 'neutral' : 'warn'} icon={<CalendarDays className="size-3.5" />}>
              {deadlinePassed ? 'Closed' : 'Deadline'} {formatDate(post.deadline + 'T12:00:00')}
            </Chip>
          </div>
        )}
        {post.body && (
          <p className={cx('mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink/90', !expanded && longBody && 'line-clamp-4')}>{post.body}</p>
        )}
        {longBody && (
          <button onClick={() => setExpanded((e) => !e)} className="mt-1 text-sm font-medium text-blue">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noreferrer noopener" className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-raised p-3 transition hover:border-blue/40">
            <ExternalLink className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-blue">{host || post.link_url}</span>
          </a>
        )}

        {post.image_paths.length > 0 && (
          <div className={cx('mt-3 grid gap-1.5 overflow-hidden rounded-xl', post.image_paths.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {post.image_paths.map((path) => {
              const url = postImageUrl(path);
              return (
                <button key={path} onClick={() => onView(url)} className={cx('overflow-hidden bg-raised', post.image_paths.length === 1 ? 'max-h-[28rem]' : 'aspect-square')}>
                  <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-line pt-2.5">
          {isMod &&
            (post.removed_at ? (
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
            <Button size="sm" variant="ghost" onClick={() => confirm('Delete this post? This cannot be undone.') && del.mutate()} loading={del.isPending}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : (
            !post.removed_at && (
              <Button size="sm" variant="ghost" onClick={onReport}>
                <Flag className="size-4" />
                Report
              </Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
