import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarClock, Package } from 'lucide-react';
import { useLog } from '../../lib/queries';
import type { LogEntry } from '../../lib/types';
import { dayLabel, formatTime } from '../../lib/time';
import { PageHeader } from '../../components/PageHeader';
import { Avatar, Button, Card, EmptyState, LoadingBlock, Segmented } from '../../components/ui';
import { describeLog } from './logText';

type Filter = 'all' | 'items' | 'checkouts';

export default function Changelog() {
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState<Filter>('all');
  const log = useLog(undefined, limit);

  const groups = useMemo(() => {
    const rows = (log.data ?? []).filter((e) => filter === 'all' || e.action.startsWith(filter === 'items' ? 'item.' : 'checkout.'));
    const map = new Map<string, LogEntry[]>();
    for (const e of rows) {
      const k = dayLabel(new Date(e.at));
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [log.data, filter]);

  return (
    <div>
      <PageHeader
        back={{ to: '/shop', label: 'Inventory' }}
        title="Changelog"
        subtitle="Every change to the inventory and every checkout, newest first. Nobody can edit or delete this list."
        actions={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'items', label: 'Tools' },
              { value: 'checkouts', label: 'Checkouts' },
            ]}
          />
        }
      />

      {log.isLoading ? (
        <LoadingBlock />
      ) : groups.length === 0 ? (
        <EmptyState title="No changes yet">When someone adds, edits, or checks out a tool, it shows here.</EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, rows]) => (
            <section key={day}>
              <h2 className="label-mono mb-2 text-muted">{day}</h2>
              <Card className="divide-y divide-line">
                {rows.map((e) => (
                  <LogRow key={e.id} e={e} />
                ))}
              </Card>
            </section>
          ))}
          {(log.data?.length ?? 0) >= limit && (
            <div className="text-center">
              <Button onClick={() => setLimit((l) => l + 100)} loading={log.isFetching}>
                Show older changes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LogRow({ e, hideItem }: { e: LogEntry; hideItem?: boolean }) {
  const { verb, details } = describeLog(e);
  const isCheckout = e.action.startsWith('checkout.');
  return (
    <div className="flex gap-3 p-4">
      <Avatar name={e.actor_name ?? '?'} size={32} />
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-semibold">{e.actor_name ?? 'Someone'}</span> <span className="text-muted">{verb}</span>{' '}
          {!hideItem && e.item_id ? (
            <Link to={`/shop/${e.item_id}`} className="font-semibold hover:underline">
              {e.item_name}
            </Link>
          ) : (
            !hideItem && <span className="font-semibold">{e.item_name}</span>
          )}
          {hideItem && <span className="text-muted">{isCheckout ? '' : 'this tool'}</span>}
        </div>
        {details.length > 0 && (
          <dl className="mt-1.5 space-y-1">
            {details.map((d) => (
              <div key={d.label} className="flex flex-wrap items-center gap-1.5 text-xs">
                <dt className="text-muted">{d.label}:</dt>
                {d.from !== null && (
                  <>
                    <dd className="rounded bg-danger/8 px-1.5 py-0.5 text-muted line-through decoration-danger/50">{d.from}</dd>
                    <ArrowRight className="size-3 text-muted" />
                  </>
                )}
                <dd className="rounded bg-ok/10 px-1.5 py-0.5 font-medium">{d.to}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted">
        {formatTime(new Date(e.at))}
        {isCheckout ? <CalendarClock className="size-3.5" /> : <Package className="size-3.5" />}
      </div>
    </div>
  );
}
