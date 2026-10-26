import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, BookOpen, ChevronLeft, MapPin, Pencil, TriangleAlert, Wrench } from 'lucide-react';
import { tools } from '../../content/tools';
import { useActiveCheckouts, useInventory, useItemCheckouts, useLog, useRoster, keys } from '../../lib/queries';
import { availability, checkoutState } from '../../lib/shop';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { formatWindow, relativeTime } from '../../lib/time';
import { ToolArt } from '../../graphics/ToolArt';
import { AvailabilityLine, StatusChip } from '../../components/ShopBits';
import { Button, Card, Chip, LoadingBlock, SectionTitle, Textarea, cx } from '../../components/ui';
import { Sheet } from '../../components/Sheet';
import { ItemFormSheet } from './ItemFormSheet';
import { CheckoutSheet } from './CheckoutSheet';
import { useEndCheckout } from './Inventory';
import { LogRow } from './Changelog';
import NotFound from '../NotFound';

export default function Item() {
  const { id = '' } = useParams();
  const inventory = useInventory();
  const active = useActiveCheckouts();
  const history = useItemCheckouts(id);
  const log = useLog(id, 30);
  const roster = useRoster();
  const qc = useQueryClient();
  const toast = useToast();
  const end = useEndCheckout();
  const [editing, setEditing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [problem, setProblem] = useState('');

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await db().from('inventory_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.inventory });
      void qc.invalidateQueries({ queryKey: ['log'] });
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  if (inventory.isLoading) return <LoadingBlock />;
  const item = inventory.data?.find((i) => i.id === id);
  if (!item) return <NotFound what="tool" />;

  const tool = tools.find((t) => t.slug === item.tool_slug);
  const itemActive = (active.data ?? []).filter((c) => c.item_id === id);
  const a = availability(id, itemActive);
  const names = (uid: string | null) => (uid && roster.byId.get(uid)?.full_name) || 'Former member';
  const upcoming = itemActive.filter((c) => checkoutState(c) === 'upcoming');
  const past = (history.data ?? []).filter((c) => ['ended', 'returned'].includes(checkoutState(c))).slice(0, 8);

  return (
    <div className="animate-rise">
      <Link to="/shop" className="-ml-1 mb-4 inline-flex items-center gap-0.5 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" />
        Inventory
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="art-tile flex size-28 shrink-0 items-center justify-center rounded-2xl border border-line text-ink">
                <ToolArt slug={item.tool_slug ?? ''} className="size-24" />
              </div>
              <div className="min-w-0 flex-1">
                {item.archived_at && <Chip className="mb-2">Archived</Chip>}
                <h1 className="text-[1.75rem] font-bold leading-tight">{item.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                  <StatusChip status={item.status} />
                  {item.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-4" />
                      {item.location}
                    </span>
                  )}
                  {tool && (
                    <Link to={`/tools/${tool.slug}`} className="inline-flex items-center gap-1 text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">
                      <BookOpen className="size-4" />
                      How to operate
                    </Link>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            </div>

            {item.status === 'needs_maintenance' ? (
              <div className="flex flex-col gap-3 border-t border-warn/30 bg-warn/8 p-4 sm:flex-row sm:items-center">
                <TriangleAlert className="size-5 shrink-0 text-warn" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">Needs maintenance</div>
                  <div className="text-muted">{item.status_note || 'No details given.'}</div>
                </div>
                <Button size="sm" onClick={() => update.mutate({ status: 'operational', status_note: null }, { onSuccess: () => toast('Marked operational.') })} loading={update.isPending}>
                  Mark as fixed
                </Button>
              </div>
            ) : (
              !item.archived_at && (
                <div className="border-t border-line px-4 py-3">
                  <button onClick={() => setReporting(true)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-warn">
                    <Wrench className="size-4" />
                    Report a problem with this tool
                  </button>
                </div>
              )
            )}
          </Card>

          {item.notes && (
            <Card className="p-5">
              <div className="label-caps mb-2 text-muted">Notes</div>
              <p className="whitespace-pre-wrap text-[0.9375rem]">{item.notes}</p>
            </Card>
          )}

          <section>
            <SectionTitle>History</SectionTitle>
            <Card className="divide-y divide-line">
              {(log.data ?? []).length === 0 && <div className="p-4 text-sm text-muted">No changes yet.</div>}
              {(log.data ?? []).map((e) => (
                <LogRow key={e.id} e={e} hideItem />
              ))}
            </Card>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-10 lg:self-start">
          <Card className="p-5">
            <div className="label-caps mb-3 text-muted">Right now</div>
            <AvailabilityLine a={a} names={(uid) => names(uid)} />
            {a.current && (
              <div className="mt-3 rounded-xl bg-raised p-3 text-sm">
                <div className="font-medium">{a.current.borrower}</div>
                <div className="text-muted">{formatWindow(a.current.starts_at, a.current.ends_at)}</div>
                {a.current.note && <div className="mt-1 text-muted">“{a.current.note}”</div>}
                <div className="mt-1 text-xs text-muted">Checked out by {names(a.current.user_id)}</div>
                <Button size="sm" className="mt-3 w-full" onClick={() => end.mutate(a.current!.id)} loading={end.isPending}>
                  Mark returned
                </Button>
              </div>
            )}
            {!item.archived_at && (
              <Button variant="primary" className="mt-4 w-full" onClick={() => setCheckingOut(true)}>
                {a.current ? 'Book a later time' : 'Check out'}
              </Button>
            )}
          </Card>

          {upcoming.length > 0 && (
            <section>
              <SectionTitle>Coming up</SectionTitle>
              <Card className="divide-y divide-line">
                {upcoming.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.borrower}</div>
                      <div className="text-muted">{formatWindow(c.starts_at, c.ends_at)}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => end.mutate(c.id)}>
                      Cancel
                    </Button>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <SectionTitle>Past checkouts</SectionTitle>
              <Card className="divide-y divide-line">
                {past.map((c) => (
                  <div key={c.id} className="p-3.5 text-sm">
                    <div className="font-medium">{c.borrower}</div>
                    <div className="text-muted">{formatWindow(c.starts_at, c.ends_at)}</div>
                    {c.returned_at && <div className="text-xs text-muted">Returned {relativeTime(c.returned_at)}</div>}
                  </div>
                ))}
              </Card>
            </section>
          )}

          <div className="px-1">
            {item.archived_at ? (
              <Button variant="secondary" size="sm" onClick={() => update.mutate({ archived_at: null }, { onSuccess: () => toast('Restored.') })}>
                <ArchiveRestore className="size-4" />
                Restore this tool
              </Button>
            ) : (
              <button
                onClick={() => {
                  if (confirm(`Archive ${item.name}? It leaves the inventory list, and anyone can restore it later.`)) {
                    update.mutate({ archived_at: new Date().toISOString() }, { onSuccess: () => toast('Archived.') });
                  }
                }}
                className={cx('inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger')}
              >
                <Archive className="size-4" />
                Archive this tool
              </button>
            )}
          </div>
        </aside>
      </div>

      <ItemFormSheet open={editing} onClose={() => setEditing(false)} item={item} />
      <CheckoutSheet open={checkingOut} onClose={() => setCheckingOut(false)} item={item} existing={itemActive} />
      <Sheet
        open={reporting}
        onClose={() => setReporting(false)}
        title="Report a problem"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setReporting(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={update.isPending}
              onClick={() =>
                update.mutate(
                  { status: 'needs_maintenance', status_note: problem.trim() || null },
                  {
                    onSuccess: () => {
                      toast('Marked as needs maintenance.');
                      setReporting(false);
                      setProblem('');
                    },
                  },
                )
              }
            >
              Mark needs maintenance
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-muted">This changes the status to “needs maintenance” for everyone. Say what is wrong so the next person knows.</p>
        <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={500} placeholder="For example: the blade guard sticks" />
      </Sheet>
    </div>
  );
}
