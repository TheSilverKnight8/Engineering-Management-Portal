import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePosts } from '../../lib/queries';
import type { PostKind } from '../../lib/types';
import { PageHeader } from '../../components/PageHeader';
import { Button, EmptyState, LoadingBlock, cx } from '../../components/ui';
import { CommunityTabs } from './CommunityTabs';
import { FeedCard } from './FeedCard';
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
            <FeedCard key={p.id} entry={{ source: 'post', item: p }} onReport={() => setReporting({ type: 'post', id: p.id })} onView={setViewing} />
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
