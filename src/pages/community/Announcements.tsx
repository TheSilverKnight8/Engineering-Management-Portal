import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useAnnouncements } from '../../lib/queries';
import { canAnnounce } from '../../lib/types';
import { PageHeader } from '../../components/PageHeader';
import { Button, EmptyState, LoadingBlock } from '../../components/ui';
import { CommunityTabs } from './CommunityTabs';
import { FeedCard } from './FeedCard';
import { PostComposer } from './PostComposer';
import { ReportSheet } from './ReportSheet';

export default function Announcements() {
  const { profile } = useAuth();
  const announcements = useAnnouncements();
  const mayPost = canAnnounce(profile);
  const [composing, setComposing] = useState(false);
  const [reporting, setReporting] = useState<{ type: 'announcement'; id: string } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const rows = announcements.data ?? [];

  // Links like /community/announcements#<id> from the moderation page scroll to that announcement.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && announcements.data) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [announcements.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title="Announcements"
        subtitle="News for the class from the teachers, and who joined the portal."
        actions={
          mayPost && (
            <Button variant="primary" onClick={() => setComposing(true)}>
              <Plus className="size-4" />
              New announcement
            </Button>
          )
        }
      />
      <div className="mb-5">
        <CommunityTabs />
      </div>

      {announcements.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No announcements yet" action={mayPost && <Button onClick={() => setComposing(true)}>Write the first one</Button>}>
          Teachers post news for the class here. New members show here when they join.
        </EmptyState>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {rows.map((a) => (
            <FeedCard key={a.id} entry={{ source: 'announcement', item: a }} onReport={() => setReporting({ type: 'announcement', id: a.id })} onView={setViewing} />
          ))}
        </div>
      )}

      {mayPost && <PostComposer mode="announcement" open={composing} onClose={() => setComposing(false)} />}
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
      {viewing && (
        <button className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setViewing(null)} aria-label="Close photo">
          <img src={viewing} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </button>
      )}
    </div>
  );
}
