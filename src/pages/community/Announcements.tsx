import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Plus, Scale } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { keys, useAnnouncements, useAnnouncementsSeen, useNotifications } from '../../lib/queries';
import { db } from '../../lib/supabase';
import { canAnnounce, type Announcement } from '../../lib/types';
import { PageHeader } from '../../components/PageHeader';
import { Button, Card, EmptyState, LoadingBlock, SectionTitle, cx } from '../../components/ui';
import { relativeTime } from '../../lib/time';
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
  const qc = useQueryClient();
  const seen = useAnnouncementsSeen();

  // Opening this page clears the alert bell. Announcements that were new when
  // the page opened keep a "New" tag until the member leaves the page.
  const seenAtOpen = useRef<string | null>(null);
  if (seenAtOpen.current === null && seen !== null) seenAtOpen.current = seen;
  const seenLoaded = seen !== null;
  useEffect(() => {
    if (!announcements.data || !seenLoaded) return;
    void db()
      .rpc('mark_announcements_seen')
      .then(() => qc.invalidateQueries({ queryKey: keys.announcementsSeen }));
  }, [announcements.data, seenLoaded, qc]);
  const isNew = (a: Announcement) =>
    !!seenAtOpen.current && a.kind !== 'joined' && a.author_id !== profile?.id && new Date(a.created_at) > new Date(seenAtOpen.current);

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
        subtitle="News from the teachers, tools that need maintenance or are fixed, and who joined the portal."
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

      <ForYou />

      {announcements.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No announcements yet" action={mayPost && <Button onClick={() => setComposing(true)}>Write the first one</Button>}>
          Teachers post news for the class here. Tools that need maintenance or are fixed, and new members, also show here.
        </EmptyState>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {rows.map((a) => (
            <FeedCard key={a.id} entry={{ source: 'announcement', item: a }} isNew={isNew(a)} onReport={() => setReporting({ type: 'announcement', id: a.id })} onView={setViewing} />
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

// Private notices for the signed-in member (for example about safety test
// appeals). Opening this page marks them read, which clears them from the bell.
function ForYou() {
  const notices = useNotifications();
  const qc = useQueryClient();
  const unreadAtOpen = useRef<Set<string> | null>(null);
  if (unreadAtOpen.current === null && notices.data) unreadAtOpen.current = new Set(notices.data.filter((n) => !n.read_at).map((n) => n.id));
  const hasUnread = (notices.data ?? []).some((n) => !n.read_at);
  useEffect(() => {
    if (!hasUnread) return;
    void db()
      .rpc('mark_notifications_read')
      .then(() => qc.invalidateQueries({ queryKey: keys.notifications }));
  }, [hasUnread, qc]);

  const rows = (notices.data ?? []).slice(0, 5);
  if (rows.length === 0) return null;
  return (
    <section className="mx-auto mb-8 max-w-2xl">
      <SectionTitle>For you</SectionTitle>
      <Card className="divide-y divide-line overflow-hidden">
        {rows.map((n) => {
          const fresh = unreadAtOpen.current?.has(n.id);
          return (
            <Link key={n.id} to={n.link ?? '/'} className={cx('flex gap-3 p-4 transition hover:bg-raised', fresh && 'bg-accent/5')}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
                <Scale className="size-[1.125rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  {fresh && <span className="rounded-full bg-accent px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wide text-on-accent">New</span>}
                </span>
                {n.body && <span className="mt-0.5 block whitespace-pre-wrap text-sm text-muted">{n.body}</span>}
                <span className="mt-1 block text-xs text-muted">{relativeTime(n.created_at)}</span>
              </span>
            </Link>
          );
        })}
      </Card>
    </section>
  );
}
