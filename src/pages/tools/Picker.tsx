import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, ChevronDown, RotateCcw, X } from 'lucide-react';
import { tools } from '../../content/tools';
import { materials, objectives, precisionLabels } from '../../content/catalog';
import type { MaterialId, ObjectiveId, Precision } from '../../content/types';
import { MaterialIcon, ObjectiveIcon } from '../../graphics/Icons';
import { ToolArt } from '../../graphics/ToolArt';
import { PageHeader } from '../../components/PageHeader';
import { PpeRow } from '../../components/ToolBits';
import { Button, Card, Chip, cx } from '../../components/ui';
import { hasAnyInput, runPicker, type Evaluated, type PickerInput } from '../../lib/picker';
import { formatInches, parseInches } from '../../lib/units';
import { useActiveCheckouts, useInventory, useLive } from '../../lib/queries';
import { unitsForTool } from '../../lib/shop';

// Picker answers live in the URL (?m=wood&o=curved-cuts&p=2&t=3/4&l=24&w=6),
// so the back button, refresh, and shared links all keep them.
function readInput(sp: URLSearchParams) {
  const num = (k: string) => {
    const v = sp.get(k);
    const n = v ? parseInches(v) : null;
    return n !== null && n > 0 ? n : undefined;
  };
  const m = sp.get('m') as MaterialId | null;
  const o = sp.get('o') as ObjectiveId | null;
  const p = Number(sp.get('p'));
  const input: PickerInput = {
    material: m && materials.some((x) => x.id === m) ? m : undefined,
    objective: o && objectives.some((x) => x.id === o) ? o : undefined,
    precision: p === 1 || p === 2 || p === 3 ? (p as Precision) : undefined,
    thickness: num('t'),
    length: num('l'),
    width: num('w'),
  };
  return input;
}

export default function Picker() {
  const [sp, setSp] = useSearchParams();
  const input = useMemo(() => readInput(sp), [sp]);
  const results = useMemo(() => runPicker(tools, input), [input]);
  const any = hasAnyInput(input);
  const resultsRef = useRef<HTMLDivElement>(null);

  const set = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === '') next.delete(k);
    else next.set(k, v);
    setSp(next, { replace: true });
  };

  // Objectives that at least one tool can do with the chosen material.
  const objectiveCounts = useMemo(() => {
    const pool = input.material ? tools.filter((t) => t.picker.materials.includes(input.material!)) : tools;
    return Object.fromEntries(objectives.map((o) => [o.id, pool.filter((t) => t.picker.objectives.includes(o.id)).length]));
  }, [input.material]);

  return (
    <div>
      <PageHeader
        eyebrow="Tool picker"
        title="What are you making?"
        subtitle="Answer any of these. Every answer is optional, and the results change as you go."
        actions={
          any && (
            <Button size="sm" variant="ghost" onClick={() => setSp(new URLSearchParams(), { replace: true })}>
              <RotateCcw className="size-4" />
              Start over
            </Button>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Question n={1} title="Material" done={!!input.material}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {materials.map((m) => {
                const count = tools.filter((t) => t.picker.materials.includes(m.id)).length;
                const on = input.material === m.id;
                return (
                  <Tile key={m.id} on={on} onClick={() => set('m', on ? undefined : m.id)}>
                    <MaterialIcon id={m.id} size={44} className={on ? 'text-accent' : 'text-ink'} />
                    <span className="text-sm font-semibold">{m.name}</span>
                    <span className="text-[0.6875rem] text-muted">{count} tools</span>
                  </Tile>
                );
              })}
            </div>
          </Question>

          <Question n={2} title="What do you need to do?" done={!!input.objective}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {objectives.map((o) => {
                const count = objectiveCounts[o.id];
                const on = input.objective === o.id;
                const off = count === 0 && !on;
                return (
                  <button
                    key={o.id}
                    disabled={off}
                    onClick={() => set('o', on ? undefined : o.id)}
                    title={off ? 'No tool does this with the chosen material' : o.hint}
                    className={cx(
                      'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition',
                      on ? 'border-accent bg-accent/8 ring-1 ring-accent' : 'border-line bg-surface hover:border-blue/40',
                      off && 'opacity-35',
                    )}
                  >
                    <ObjectiveIcon id={o.id} size={22} className={on ? 'text-accent' : 'text-ink'} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{o.label}</span>
                      {o.hint && <span className="block truncate text-[0.6875rem] text-muted">{o.hint}</span>}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-muted">{count}</span>
                  </button>
                );
              })}
            </div>
          </Question>

          <Question n={3} title="How precise?" done={!!input.precision}>
            <div className="grid grid-cols-3 gap-2.5">
              {([1, 2, 3] as Precision[]).map((p) => {
                const on = input.precision === p;
                return (
                  <Tile key={p} on={on} onClick={() => set('p', on ? undefined : String(p))}>
                    <span className="flex h-7 items-end gap-1">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={cx('w-2.5 rounded-sm transition', n <= p ? (on ? 'bg-accent' : 'bg-blue') : 'bg-line')} style={{ height: 8 + n * 6 }} />
                      ))}
                    </span>
                    <span className="text-sm font-semibold">{precisionLabels[p]}</span>
                  </Tile>
                );
              })}
            </div>
          </Question>

          <Question n={4} title="Size of the whole piece" done={input.thickness !== undefined || input.length !== undefined || input.width !== undefined} hint="Inches. Fractions work: 3/4, 1-1/2.">
            <div className="grid grid-cols-3 gap-2.5">
              <SizeInput label="Thickness" value={sp.get('t') ?? ''} onChange={(v) => set('t', v)} />
              <SizeInput label="Length" value={sp.get('l') ?? ''} onChange={(v) => set('l', v)} />
              <SizeInput label="Width" value={sp.get('w') ?? ''} onChange={(v) => set('w', v)} />
            </div>
          </Question>

          {any && (
            <button
              onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex w-full items-center justify-between rounded-2xl bg-ink px-5 py-3.5 text-bg shadow-pop lg:hidden"
            >
              <span className="font-semibold">
                {results.matches.length} {results.matches.length === 1 ? 'tool fits' : 'tools fit'}
              </span>
              <span className="flex items-center gap-1 text-sm">
                See results <ChevronDown className="size-4" />
              </span>
            </button>
          )}
        </div>

        <div ref={resultsRef} className="scroll-mt-20 min-w-0">
          <Results input={input} results={results} any={any} />
        </div>
      </div>
    </div>
  );
}

function Question({ n, title, done, hint, children }: { n: number; title: string; done: boolean; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3.5 flex items-center gap-3">
        <span className={cx('flex size-7 items-center justify-center rounded-full font-mono text-xs font-bold transition', done ? 'bg-accent text-on-accent' : 'bg-raised text-muted')}>
          {done ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Tile({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition',
        on ? 'border-accent bg-accent/8 ring-1 ring-accent' : 'border-line bg-surface hover:border-blue/40 hover:bg-raised',
      )}
    >
      {on && (
        <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

function SizeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string | undefined) => void }) {
  const [text, setText] = useState(value);
  // Clear the box when the answer is cleared elsewhere ("Start over").
  useEffect(() => {
    if (value === '') setText((t) => (parseInches(t) !== null ? '' : t));
  }, [value]);
  const parsed = text.trim() === '' ? null : parseInches(text);
  const bad = text.trim() !== '' && (parsed === null || parsed <= 0);
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        value={text}
        inputMode="decimal"
        placeholder="—"
        onChange={(e) => {
          setText(e.target.value);
          const n = parseInches(e.target.value);
          onChange(e.target.value.trim() === '' ? undefined : n !== null && n > 0 ? e.target.value.trim() : undefined);
        }}
        className={cx(
          'h-11 w-full rounded-xl border bg-raised px-3 font-mono text-[0.9375rem] outline-none transition focus:bg-surface focus:ring-3',
          bad ? 'border-danger focus:ring-danger/15' : 'border-line focus:border-blue focus:ring-blue/15',
        )}
      />
      <span className={cx('mt-1 block h-4 font-mono text-[0.6875rem]', bad ? 'text-danger' : 'text-muted')}>
        {bad ? 'Not a size' : parsed !== null && !/^\d+$/.test(text.trim()) ? `= ${formatInches(parsed)}` : ''}
      </span>
    </label>
  );
}

function Results({ input, results, any }: { input: PickerInput; results: ReturnType<typeof runPicker>; any: boolean }) {
  const [showOthers, setShowOthers] = useState(false);

  if (!any) {
    return (
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">All tools</h2>
          <span className="text-sm text-muted">Answer a question to narrow these down</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {results.matches.map((e) => (
            <Link key={e.tool.slug} to={`/tools/${e.tool.slug}`} className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-blue/40">
              <ToolArt slug={e.tool.slug} className="size-12 shrink-0 text-ink transition group-hover:scale-105" />
              <span className="text-sm font-medium leading-tight">{e.tool.name}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          {results.matches.length === 0 ? 'No tool fits all of that' : `${results.matches.length} ${results.matches.length === 1 ? 'tool fits' : 'tools fit'}`}
        </h2>
        <Summary input={input} />
      </div>

      <motion.div layout className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {results.matches.map((e) => (
            <ResultCard key={e.tool.slug} e={e} />
          ))}
        </AnimatePresence>
      </motion.div>

      {results.matches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Remove an answer, or look at the tools below that miss by one thing.</div>
      )}

      {results.nearMisses.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-1 font-semibold">Almost</h3>
          <p className="mb-3 text-sm text-muted">One answer rules each of these out.</p>
          <motion.div layout className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {results.nearMisses.map((e) => (
                <ResultCard key={e.tool.slug} e={e} compact />
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      )}

      {results.others.length > 0 && (
        <section className="mt-8">
          <button onClick={() => setShowOthers((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ChevronDown className={cx('size-4 transition', showOthers && 'rotate-180')} />
            {results.others.length} more tools do not fit
          </button>
          {showOthers && (
            <div className="mt-3 space-y-2">
              {results.others.map((e) => (
                <ResultCard key={e.tool.slug} e={e} compact />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Summary({ input }: { input: PickerInput }) {
  const parts = [
    input.material && materials.find((m) => m.id === input.material)!.name,
    input.objective && objectives.find((o) => o.id === input.objective)!.label,
    input.precision && `${precisionLabels[input.precision]} precision`,
    input.thickness !== undefined && `${formatInches(input.thickness)} thick`,
    (input.length !== undefined || input.width !== undefined) &&
      [input.length, input.width]
        .filter((n): n is number => n !== undefined)
        .map((n) => formatInches(n, false))
        .join(' × ') + ' in',
  ].filter(Boolean);
  return <p className="mt-1 text-sm text-muted">{parts.join(' · ')}</p>;
}

function ResultCard({ e, compact }: { e: Evaluated; compact?: boolean }) {
  const live = useLive();
  const inventory = useInventory();
  const checkouts = useActiveCheckouts();
  const u = live && inventory.data && checkouts.data ? unitsForTool(e.tool.slug, inventory.data, checkouts.data) : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
      <Link
        to={`/tools/${e.tool.slug}`}
        className={cx(
          'group flex items-center gap-4 rounded-2xl border bg-surface transition hover:border-blue/40',
          compact ? 'border-line/80 p-3 opacity-90' : 'border-line p-4 shadow-card',
        )}
      >
        <div className={cx('bp-grid flex shrink-0 items-center justify-center rounded-xl border border-line bg-bg/50 text-ink', compact ? 'size-14' : 'size-20 sm:size-24')}>
          <ToolArt slug={e.tool.slug} className={cx('transition group-hover:scale-105', compact ? 'size-11' : 'size-16 sm:size-20')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cx('font-semibold', !compact && 'text-lg')}>{e.tool.name}</h3>
            {u && u.units.length > 0 && !compact && (
              <span className={cx('text-xs font-medium', u.freeAndWorking.length > 0 ? 'text-ok' : 'text-muted')}>
                · {u.freeAndWorking.length} of {u.units.length} free now
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {compact
              ? e.failed.map((c) => (
                  <Chip key={c.key} tone="warn" icon={<X className="size-3" />}>
                    {c.text}
                  </Chip>
                ))
              : e.checks.map((c) => (
                  <Chip key={c.key} tone="ok" icon={<Check className="size-3" />}>
                    {c.text}
                  </Chip>
                ))}
          </div>
          {!compact && (
            <div className="mt-2.5">
              <PpeRow tool={e.tool} size="sm" />
            </div>
          )}
        </div>
        <ArrowRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
    </motion.div>
  );
}
