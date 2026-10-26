import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ExternalLink, Hammer, MessagesSquare, ShieldCheck, Sparkles, TriangleAlert, Users, Warehouse } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useActiveCheckouts, useGroupMembers, useGroups, useInventory, useLive, useLog, usePosts, useRoster } from '../lib/queries';
import { availability, checkoutState } from '../lib/shop';
import { formatWindow, relativeTime } from '../lib/time';
import { db } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { safetyCheckpoint } from '../content/safety';
import { tools } from '../content/tools';
import { ToolArt } from '../graphics/ToolArt';
import { Button, Card, Chip, SectionTitle, cx } from '../components/ui';
import { describeLog } from './shop/logText';
import { POST_KIND_META } from './community/postKinds';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const dateLine = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export default function Home() {
  const { profile } = useAuth();
  const live = useLive();
  const first = profile?.full_name.split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <header className="animate-rise">
        <div className="label-mono mb-2 text-muted">{dateLine.format(new Date())}</div>
        <h1 className="text-[1.875rem] font-bold leading-tight sm:text-[2.5rem]">{first ? `${greeting()}, ${first}.` : `${greeting()}.`}</h1>
      </header>

      <QuickActions />

      {live && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <MyCheckouts />
            <ShopStatus />
          </div>
          <div className="space-y-6">
            <LatestPosts />
            <MyGroups />
            <RecentShopChanges />
          </div>
        </div>
      )}

      {!live && <ToolStrip />}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { to: '/picker', title: 'Find a tool', body: 'Answer a few questions', icon: Sparkles, tone: 'bg-accent text-on-accent' },
    { to: '/shop', title: 'Check out a tool', body: 'See who has what', icon: Warehouse, tone: 'bg-blue text-white' },
    { to: '/learn/safety', title: 'Safety', body: 'PPE, rules, practice', icon: ShieldCheck, tone: 'bg-warn text-[#1d1300]' },
    { to: '/tools', title: 'Tool library', body: 'How to operate each tool', icon: Hammer, tone: 'bg-ink text-bg' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((a, i) => (
        <Link
          key={a.to}
          to={a.to}
          className="group animate-rise rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
          style={{ animationDelay: `${60 + i * 40}ms` }}
        >
          <span className={cx('mb-3 flex size-10 items-center justify-center rounded-xl', a.tone)}>
            <a.icon className="size-5" />
          </span>
          <div className="font-semibold">{a.title}</div>
          <div className="text-sm text-muted">{a.body}</div>
        </Link>
      ))}
    </div>
  );
}

function MyCheckouts() {
  const { profile } = useAuth();
  const checkouts = useActiveCheckouts();
  const inventory = useInventory();
  const qc = useQueryClient();
  const toast = useToast();
  const end = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('end_checkout', { checkout: id });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['checkouts'] });
      void qc.invalidateQueries({ queryKey: ['log'] });
      toast('Done. The tool is free again.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const mine = (checkouts.data ?? []).filter((c) => c.user_id === profile?.id);
  const items = new Map((inventory.data ?? []).map((i) => [i.id, i]));

  return (
    <section>
      <SectionTitle action={<Link to="/shop" className="text-sm text-blue hover:underline">Shop</Link>}>Your checkouts</SectionTitle>
      {mine.length === 0 ? (
        <Card className="flex items-center gap-4 p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-raised text-muted">
            <Warehouse className="size-5" />
          </div>
          <div className="flex-1 text-sm">
            <div className="font-medium">You have no tools checked out.</div>
            <div className="text-muted">Check out a tool from the shop so classmates know who has it.</div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {mine.map((c) => {
            const item = items.get(c.item_id);
            const state = checkoutState(c);
            return (
              <Card key={c.id} className="flex items-center gap-4 p-4">
                <div className="bp-grid flex size-14 shrink-0 items-center justify-center rounded-xl border border-line bg-bg/50 text-ink">
                  <ToolArt slug={item?.tool_slug ?? ''} className="size-11" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/shop/${c.item_id}`} className="font-semibold hover:underline">
                    {item?.name ?? 'Tool'}
                  </Link>
                  <div className="text-sm text-muted">{formatWindow(c.starts_at, c.ends_at)}</div>
                  <div className="mt-1">
                    {state === 'active' ? <Chip tone="accent">Checked out now</Chip> : <Chip tone="blue">Upcoming</Chip>}
                    {c.borrower !== profile?.full_name && <span className="ml-2 text-xs text-muted">for {c.borrower}</span>}
                  </div>
                </div>
                <Button size="sm" onClick={() => end.mutate(c.id)} loading={end.isPending && end.variables === c.id}>
                  {state === 'active' ? 'Return' : 'Cancel'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ShopStatus() {
  const inventory = useInventory();
  const checkouts = useActiveCheckouts();
  const items = (inventory.data ?? []).filter((i) => !i.archived_at);
  const out = items.filter((i) => availability(i.id, checkouts.data ?? []).current);
  const broken = items.filter((i) => i.status === 'needs_maintenance');

  const stats = [
    { label: 'Tools in the shop', value: items.length, tone: 'text-ink' },
    { label: 'Checked out now', value: out.length, tone: 'text-accent' },
    { label: 'Need maintenance', value: broken.length, tone: broken.length ? 'text-warn' : 'text-ink' },
  ];

  return (
    <section>
      <SectionTitle>Shop right now</SectionTitle>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-line">
          {stats.map((s) => (
            <div key={s.label} className="p-4 sm:p-5">
              <div className={cx('font-mono text-[1.75rem] font-bold leading-none sm:text-4xl', s.tone)}>{inventory.isLoading ? '–' : s.value}</div>
              <div className="mt-1.5 text-xs text-muted sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
        {broken.length > 0 && (
          <div className="border-t border-line p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warn">
              <TriangleAlert className="size-4" /> Needs maintenance
            </div>
            <ul className="space-y-1.5">
              {broken.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <Link to={`/shop/${b.id}`} className="flex items-baseline justify-between gap-3 text-sm hover:underline">
                    <span className="font-medium">{b.name}</span>
                    <span className="truncate text-xs text-muted">{b.status_note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {items.length === 0 && !inventory.isLoading && (
          <div className="border-t border-line p-4 text-sm text-muted">
            The inventory is empty. <Link to="/shop" className="text-blue hover:underline">Add the shop’s tools</Link>.
          </div>
        )}
      </Card>
    </section>
  );
}

function LatestPosts() {
  const posts = usePosts();
  const roster = useRoster();
  const latest = (posts.data ?? []).filter((p) => !p.removed_at).slice(0, 3);
  return (
    <section>
      <SectionTitle action={<Link to="/community" className="text-sm text-blue hover:underline">All posts</Link>}>Latest posts</SectionTitle>
      <Card className="divide-y divide-line">
        {latest.length === 0 && (
          <div className="flex items-center gap-3 p-4 text-sm text-muted">
            <MessagesSquare className="size-5" /> No posts yet. Share a paper, a competition, or a build.
          </div>
        )}
        {latest.map((p) => {
          const meta = POST_KIND_META[p.kind];
          return (
            <Link key={p.id} to={`/community#${p.id}`} className="flex items-start gap-3 p-4 transition hover:bg-raised">
              <span className={cx('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', meta.tone)}>
                <meta.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-medium">{p.title}</span>
                <span className="text-xs text-muted">
                  {roster.byId.get(p.author_id ?? '')?.full_name ?? 'Former member'} · {relativeTime(p.created_at)}
                </span>
              </span>
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

function MyGroups() {
  const { profile } = useAuth();
  const groups = useGroups();
  const members = useGroupMembers();
  const mine = (groups.data ?? []).filter((g) => (members.data ?? []).some((m) => m.group_id === g.id && m.user_id === profile?.id));
  return (
    <section>
      <SectionTitle action={<Link to="/groups" className="text-sm text-blue hover:underline">All groups</Link>}>Your groups</SectionTitle>
      <Card className="divide-y divide-line">
        {mine.length === 0 && (
          <div className="flex items-center gap-3 p-4 text-sm text-muted">
            <Users className="size-5" /> You are not in a project group yet.
          </div>
        )}
        {mine.map((g) => (
          <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center justify-between gap-3 p-4 transition hover:bg-raised">
            <span className="font-medium">{g.name}</span>
            <ArrowRight className="size-4 text-muted" />
          </Link>
        ))}
      </Card>
    </section>
  );
}

function RecentShopChanges() {
  const log = useLog(undefined, 4);
  if (!log.data?.length) return null;
  return (
    <section>
      <SectionTitle action={<Link to="/shop/log" className="text-sm text-blue hover:underline">Changelog</Link>}>Recent shop changes</SectionTitle>
      <Card className="divide-y divide-line">
        {log.data.map((e) => (
          <div key={e.id} className="p-3.5 text-sm">
            <span className="font-medium">{e.actor_name ?? 'Someone'}</span> <span className="text-muted">{describeLog(e).verb}</span> <span className="font-medium">{e.item_name}</span>
            <div className="text-xs text-muted">{relativeTime(e.at)}</div>
          </div>
        ))}
      </Card>
    </section>
  );
}

function ToolStrip() {
  return (
    <section className="space-y-6">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <ShieldCheck className="size-8 shrink-0 text-warn" />
        <div className="flex-1">
          <div className="font-semibold">{safetyCheckpoint.title}</div>
          <div className="text-sm text-muted">{safetyCheckpoint.requirement}</div>
        </div>
        <a href={safetyCheckpoint.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue hover:underline">
          Open the checkpoint <ExternalLink className="size-4" />
        </a>
      </Card>
      <div>
        <SectionTitle action={<Link to="/tools" className="text-sm text-blue hover:underline">All tools</Link>}>Tools in the shop</SectionTitle>
        <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {tools.map((t) => (
            <Link key={t.slug} to={`/tools/${t.slug}`} className="group w-32 shrink-0 rounded-2xl border border-line bg-surface p-3 text-center transition hover:border-blue/40">
              <ToolArt slug={t.slug} className="mx-auto size-20 text-ink transition group-hover:scale-105" />
              <div className="mt-1 text-sm font-medium leading-tight">{t.name}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
