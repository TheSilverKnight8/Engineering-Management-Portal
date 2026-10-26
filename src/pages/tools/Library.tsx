import { useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { tools } from '../../content/tools';
import { categoryLabels } from '../../content/catalog';
import type { ToolCategory } from '../../content/types';
import { PageHeader } from '../../components/PageHeader';
import { ToolCard } from '../../components/ToolBits';
import { ButtonLink, EmptyState, Input, cx } from '../../components/ui';
import { useActiveCheckouts, useInventory, useLive } from '../../lib/queries';
import { unitsForTool } from '../../lib/shop';

const order: ToolCategory[] = ['saws', 'drilling', 'abrasives', 'machines'];

export default function Library() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ToolCategory | 'all'>('all');
  const live = useLive();
  const inventory = useInventory();
  const checkouts = useActiveCheckouts();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tools.filter(
      (t) => (cat === 'all' || t.category === cat) && (!s || `${t.name} ${t.summary} ${t.designedFor.join(' ')}`.toLowerCase().includes(s)),
    );
  }, [q, cat]);

  return (
    <div>
      <PageHeader
        eyebrow={`${tools.length} tools`}
        title="Tool library"
        subtitle="Every tool in the shop: what it is for, how to operate it, and how to stay safe."
        actions={
          <ButtonLink to="/picker" variant="primary">
            <Sparkles className="size-4" />
            Help me pick
          </ButtonLink>
        }
      />

      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools" className="pl-10" />
        </div>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {(['all', ...order] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cx(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                cat === c ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted hover:text-ink',
              )}
            >
              {c === 'all' ? 'All' : categoryLabels[c]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No tools match">Try a different word, or clear the category.</EmptyState>
      ) : (
        order
          .filter((c) => filtered.some((t) => t.category === c))
          .map((c) => (
            <section key={c} className="mb-10">
              <h2 className="label-mono mb-3 text-muted">{categoryLabels[c]}</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {filtered
                  .filter((t) => t.category === c)
                  .map((t, i) => {
                    const u = live && inventory.data && checkouts.data ? unitsForTool(t.slug, inventory.data, checkouts.data) : null;
                    return (
                      <ToolCard
                        key={t.slug}
                        tool={t}
                        className="animate-rise"
                        footer={
                          u && u.units.length > 0 ? (
                            <span className={cx('text-xs font-medium', u.freeAndWorking.length > 0 ? 'text-ok' : 'text-muted')}>
                              {u.freeAndWorking.length}/{u.units.length} free
                            </span>
                          ) : undefined
                        }
                        style={{ animationDelay: `${i * 30}ms` }}
                      />
                    );
                  })}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
