import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, ChevronRight, History, PackagePlus, Plus, Search } from 'lucide-react';
import { tools } from '../../content/tools';
import { useActiveCheckouts, useInventory, useRoster, keys } from '../../lib/queries';
import { availability } from '../../lib/shop';
import type { InventoryItem } from '../../lib/types';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { ToolArt } from '../../graphics/ToolArt';
import { PageHeader } from '../../components/PageHeader';
import { AvailabilityLine, StatusChip } from '../../components/ShopBits';
import { Button, ButtonLink, Card, EmptyState, Input, LoadingBlock, Segmented } from '../../components/ui';
import { ItemFormSheet } from './ItemFormSheet';
import { CheckoutSheet } from './CheckoutSheet';

type Filter = 'all' | 'available' | 'out' | 'maintenance';

export default function Inventory() {
  const inventory = useInventory();
  const checkouts = useActiveCheckouts();
  const roster = useRoster();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<InventoryItem | null>(null);

  // /shop?add=<slug> opens the add form (from a tool entry's "Add to inventory").
  useEffect(() => {
    const add = sp.get('add');
    if (add !== null) {
      setAdding(add);
      sp.delete('add');
      setSp(sp, { replace: true });
    }
  }, [sp, setSp]);

  const all = inventory.data ?? [];
  const active = checkouts.data ?? [];
  const names = (id: string) => roster.byId.get(id)?.full_name ?? 'someone';

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((i) => (showArchived ? !!i.archived_at : !i.archived_at))
      .filter((i) => !s || `${i.name} ${i.location ?? ''}`.toLowerCase().includes(s))
      .map((i) => ({ item: i, a: availability(i.id, active) }))
      .filter(({ item, a }) =>
        filter === 'all' ? true : filter === 'available' ? !a.current && item.status === 'operational' : filter === 'out' ? !!a.current : item.status === 'needs_maintenance',
      );
  }, [all, active, q, filter, showArchived]);

  const counts = useMemo(() => {
    const live = all.filter((i) => !i.archived_at);
    return {
      all: live.length,
      available: live.filter((i) => !availability(i.id, active).current && i.status === 'operational').length,
      out: live.filter((i) => availability(i.id, active).current).length,
      maintenance: live.filter((i) => i.status === 'needs_maintenance').length,
    };
  }, [all, active]);

  return (
    <div>
      <PageHeader
        eyebrow="Shop"
        title="Inventory"
        subtitle="Anyone in the class can edit this. Every change goes in the changelog with the name of the person who made it."
        actions={
          <>
            <ButtonLink to="/shop/log" size="md">
              <History className="size-4" />
              Changelog
            </ButtonLink>
            <Button variant="primary" onClick={() => setAdding('')}>
              <Plus className="size-4" />
              Add tool
            </Button>
          </>
        }
      />

      {inventory.isLoading ? (
        <LoadingBlock />
      ) : all.length === 0 ? (
        <SeedInventory onAddOne={() => setAdding('')} />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the shop" className="pl-10" />
            </div>
            <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: `All ${counts.all}` },
                  { value: 'available', label: `Free ${counts.available}` },
                  { value: 'out', label: `Out ${counts.out}` },
                  { value: 'maintenance', label: `Repair ${counts.maintenance}` },
                ]}
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="Nothing here">{showArchived ? 'No archived tools.' : 'No tools match this filter.'}</EmptyState>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {rows.map(({ item, a }) => (
                <div key={item.id} className="flex items-center gap-3 p-3 transition hover:bg-raised/60 sm:gap-4 sm:p-4">
                  <Link to={`/shop/${item.id}`} className="art-tile flex size-14 shrink-0 items-center justify-center rounded-xl border border-line text-ink sm:size-16">
                    <ToolArt slug={item.tool_slug ?? ''} className="size-11 sm:size-12" />
                  </Link>
                  <Link to={`/shop/${item.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{item.name}</span>
                      {item.status === 'needs_maintenance' && <StatusChip status={item.status} />}
                    </div>
                    {item.location && <div className="text-xs text-muted">{item.location}</div>}
                    <div className="mt-0.5 truncate">
                      <AvailabilityLine a={a} names={names} />
                    </div>
                  </Link>
                  {!item.archived_at && (
                    <span className="hidden sm:block">
                      <Button size="sm" onClick={() => setCheckingOut(item)} disabled={!!a.current}>
                        Check out
                      </Button>
                    </span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted sm:hidden" />
                </div>
              ))}
            </Card>
          )}

          <button onClick={() => setShowArchived((s) => !s)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <Archive className="size-4" />
            {showArchived ? 'Show current tools' : 'Show archived tools'}
          </button>
        </>
      )}

      <ItemFormSheet open={adding !== null} onClose={() => setAdding(null)} presetSlug={adding ?? undefined} onSaved={(i) => adding && navigate(`/shop/${i.id}`)} />
      {checkingOut && (
        <CheckoutSheet
          open
          onClose={() => setCheckingOut(null)}
          item={checkingOut}
          existing={active.filter((c) => c.item_id === checkingOut.id)}
        />
      )}
    </div>
  );
}

// First run: offer to add one of each tool from the library in one step.
function SeedInventory({ onAddOne }: { onAddOne: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const seed = useMutation({
    mutationFn: async () => {
      const { error } = await db()
        .from('inventory_items')
        .insert(tools.map((t) => ({ name: t.name, tool_slug: t.slug })));
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.inventory });
      void qc.invalidateQueries({ queryKey: ['log'] });
      toast(`Added ${tools.length} tools. Edit names and add duplicates as needed.`);
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <EmptyState
      art={
        <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <PackagePlus className="size-8" />
        </div>
      }
      title="The inventory is empty"
      className="py-20"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => seed.mutate()} loading={seed.isPending}>
            Add one of each library tool ({tools.length})
          </Button>
          <Button onClick={onAddOne}>Add one tool</Button>
        </div>
      }
    >
      Start with one of each tool in the library, then rename, add more units, or archive what the shop does not have.
    </EmptyState>
  );
}

export function useEndCheckout() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db().rpc('end_checkout', { checkout: id });
      if (error) throw error;
      return data as { canceled_at: string | null };
    },
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ['checkouts'] });
      void qc.invalidateQueries({ queryKey: ['log'] });
      toast(c.canceled_at ? 'Checkout canceled.' : 'Returned. The tool is free.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });
}
