import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Check, ChevronRight, ListOrdered, Plus, ShieldAlert, X } from 'lucide-react';
import { tools } from '../../content/tools';
import { categoryLabels, materialById, objectiveById, precisionLabels } from '../../content/catalog';
import type { Tool } from '../../content/types';
import { ToolArt } from '../../graphics/ToolArt';
import { MaterialIcon, ObjectiveIcon } from '../../graphics/Icons';
import { PpeRow } from '../../components/ToolBits';
import { VideoSlot } from '../../components/VideoSlot';
import { AvailabilityLine, StatusChip } from '../../components/ShopBits';
import { Button, ButtonLink, Card, cx } from '../../components/ui';
import { useActiveCheckouts, useInventory, useLive, useRoster } from '../../lib/queries';
import { availability } from '../../lib/shop';
import { formatInches } from '../../lib/units';
import { StepMode } from './StepMode';
import NotFound from '../NotFound';

export default function ToolEntry() {
  const { slug } = useParams();
  const tool = tools.find((t) => t.slug === slug);
  const [stepMode, setStepMode] = useState(false);
  if (!tool) return <NotFound what="tool" />;

  return (
    <div className="animate-rise">
      <Link to="/tools" className="-ml-1 mb-4 inline-flex items-center gap-0.5 text-sm text-muted hover:text-ink">
        <ChevronRight className="size-4 rotate-180" />
        Tool library
      </Link>

      {/* Hero */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="grid h-full sm:grid-cols-[14rem_1fr]">
            <div className="art-tile flex items-center justify-center border-b border-line p-6 text-ink sm:border-b-0 sm:border-r">
              <ToolArt slug={tool.slug} title={tool.name} className="w-40 sm:w-full" />
            </div>
            <div className="p-5 sm:p-7">
              <div className="label-caps mb-2 text-accent">
                {categoryLabels[tool.category]} · {tool.form}
              </div>
              <h1 className="text-[2.5rem] leading-[0.95] sm:text-[3.25rem]">{tool.name}</h1>
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-muted">{tool.summary}</p>
              <div className="mt-5">
                <div className="mb-2 text-sm font-medium">Before you start, put on</div>
                <PpeRow tool={tool} />
              </div>
            </div>
          </div>
        </div>

        <AtAGlance tool={tool} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <section>
            {tool.videos.map((v, i) => (
              <div key={i} className={i > 0 ? 'mt-6' : ''}>
                <VideoSlot slot={v} />
              </div>
            ))}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <span className="flex size-6 items-center justify-center rounded-full bg-ok/15 text-ok">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                Designed for
              </h2>
              <ul className="space-y-2 text-[0.9375rem]">
                {tool.designedFor.map((d) => (
                  <li key={d} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ok" />
                    {d}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <span className="flex size-6 items-center justify-center rounded-full bg-danger/12 text-danger">
                  <X className="size-3.5" strokeWidth={3} />
                </span>
                Not designed for
              </h2>
              <ul className="space-y-2 text-[0.9375rem]">
                {tool.notDesignedFor.map((d) => (
                  <li key={d} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-danger" />
                    {d}
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="overflow-hidden rounded-2xl border border-warn/40 bg-surface">
            <div className="stripes stripes-tl stripes-sm mt-4" aria-hidden />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <ShieldAlert className="size-5 text-warn" />
                Safety
              </h2>
              <ul className="space-y-3">
                {tool.safety.map((s) => (
                  <li key={s} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                    <span className="mt-[0.45rem] size-2 shrink-0 rotate-45 bg-warn" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-semibold">How to operate</h2>
              <Button size="sm" onClick={() => setStepMode(true)}>
                <ListOrdered className="size-4" />
                One step at a time
              </Button>
            </div>
            <ol className="relative space-y-3">
              {tool.operation.map((s, i) => (
                <li key={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised font-display text-base text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <span className="pt-1 text-[0.9375rem] leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted">Written in ASD-STE100 Simplified Technical English. <Link to="/learn/ste" className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">What is STE?</Link></p>
          </section>

          {tool.graphics.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Graphics</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {tool.graphics.map((g) => (
                  <figure key={g.src} className="overflow-hidden rounded-2xl border border-line bg-surface">
                    <img src={import.meta.env.BASE_URL + g.src} alt={g.caption} className="w-full" loading="lazy" />
                    <figcaption className="p-3 text-sm text-muted">{g.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-10 lg:self-start">
          <InTheShop tool={tool} />
        </aside>
      </div>

      <StepMode open={stepMode} onClose={() => setStepMode(false)} tool={tool} />
    </div>
  );
}

function AtAGlance({ tool }: { tool: Tool }) {
  const p = tool.picker;
  const size = [p.maxLength !== null && `${formatInches(p.maxLength)} long`, p.maxWidth !== null && `${formatInches(p.maxWidth)} wide`].filter(Boolean).join(' × ');
  return (
    <Card className="p-5">
      <div className="label-caps mb-4 text-muted">At a glance</div>
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="mb-1.5 text-muted">Materials</dt>
          <dd className="flex flex-wrap gap-1.5">
            {p.materials.map((m) => (
              <Link key={m} to={`/learn/materials/${m}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised py-1 pl-1 pr-2.5 font-medium hover:border-navy/40">
                <MaterialIcon id={m} size={22} />
                {materialById[m].name}
              </Link>
            ))}
          </dd>
        </div>
        <div>
          <dt className="mb-1.5 text-muted">Jobs</dt>
          <dd className="flex flex-wrap gap-1.5">
            {p.objectives.map((o) => (
              <span key={o} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised py-1 pl-1.5 pr-2.5 font-medium">
                <ObjectiveIcon id={o} size={18} />
                {objectiveById[o].label}
              </span>
            ))}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Precision</dt>
          <dd className="flex items-center gap-2 font-medium">
            <span className="flex gap-0.5">
              {[1, 2, 3].map((n) => (
                <span key={n} className={cx('h-3 w-2 rounded-sm', n <= p.precision ? 'bg-navy' : 'bg-line')} />
              ))}
            </span>
            {precisionLabels[p.precision]}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">Max thickness</dt>
          <dd className="font-display tracking-wide">{p.maxThickness === null ? 'Any' : formatInches(p.maxThickness)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted">Max size</dt>
          <dd className="text-right font-display tracking-wide">{size || 'Any'}</dd>
        </div>
      </dl>
    </Card>
  );
}

function InTheShop({ tool }: { tool: Tool }) {
  const live = useLive();
  const inventory = useInventory();
  const checkouts = useActiveCheckouts();
  const roster = useRoster();

  if (!live) return null;
  const units = (inventory.data ?? []).filter((i) => i.tool_slug === tool.slug && !i.archived_at);
  const names = (id: string) => roster.byId.get(id)?.full_name ?? 'someone';

  return (
    <Card className="p-5">
      <div className="label-caps mb-4 text-muted">In the shop</div>
      {inventory.isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-raised" />
      ) : units.length === 0 ? (
        <div className="text-sm text-muted">
          <p>No {tool.name.toLowerCase()} is in the inventory yet.</p>
          <ButtonLink to={`/shop?add=${tool.slug}`} size="sm" className="mt-3">
            <Plus className="size-4" />
            Add to inventory
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-2">
          {units.map((u) => (
            <li key={u.id}>
              <Link to={`/shop/${u.id}`} className="block rounded-xl border border-line p-3 transition hover:border-navy/40 hover:bg-raised">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{u.name}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </div>
                <div className="mb-1.5">
                  <StatusChip status={u.status} />
                </div>
                <AvailabilityLine a={availability(u.id, checkouts.data ?? [])} names={names} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
