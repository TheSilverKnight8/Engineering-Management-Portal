import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CornerDownLeft, Hammer, Layers, Package, Search } from 'lucide-react';
import { tools } from '../content/tools';
import { materials } from '../content/catalog';
import { projects } from '../content/projects';
import { useInventory } from '../lib/queries';
import { ToolArt } from '../graphics/ToolArt';
import { cx } from './ui';

interface Result {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  kind: 'Tool' | 'Material' | 'Project' | 'Page' | 'Shop';
  slug?: string;
}

const pages: Result[] = [
  { id: 'p-picker', title: 'Tool picker', subtitle: 'Find the right tool for the job', to: '/picker', kind: 'Page' },
  { id: 'p-tools', title: 'Tool library', subtitle: 'Every tool and how to operate it', to: '/tools', kind: 'Page' },
  { id: 'p-shop', title: 'Shop inventory', subtitle: 'Status and checkouts', to: '/shop', kind: 'Page' },
  { id: 'p-log', title: 'Inventory changelog', subtitle: 'Who changed what', to: '/shop/log', kind: 'Page' },
  { id: 'p-safety', title: 'Safety', subtitle: 'PPE, rules, and the safety checkpoint', to: '/learn/safety', kind: 'Page' },
  { id: 'p-practice', title: 'Safety practice', subtitle: 'Practice questions from the tool entries', to: '/learn/safety/practice', kind: 'Page' },
  { id: 'p-ste', title: 'Simplified Technical English', subtitle: 'ASD-STE100', to: '/learn/ste', kind: 'Page' },
  { id: 'p-posts', title: 'Posts', subtitle: 'Papers, competitions, and builds', to: '/community', kind: 'Page' },
  { id: 'p-groups', title: 'Project groups', subtitle: 'Group channels', to: '/groups', kind: 'Page' },
];

const icons = { Tool: Hammer, Material: Layers, Project: BookOpen, Page: Search, Shop: Package };

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const inventory = useInventory();

  const all = useMemo<Result[]>(
    () => [
      ...tools.map((t) => ({ id: 't-' + t.slug, title: t.name, subtitle: t.summary, to: `/tools/${t.slug}`, kind: 'Tool' as const, slug: t.slug })),
      ...materials.map((m) => ({ id: 'm-' + m.id, title: m.name, subtitle: 'Material', to: `/learn/materials/${m.id}`, kind: 'Material' as const })),
      ...projects.map((p) => ({ id: 'pr-' + p.slug, title: p.title, subtitle: p.status === 'draft' ? 'Practice project · coming soon' : 'Practice project', to: `/learn/projects/${p.slug}`, kind: 'Project' as const })),
      ...pages,
      ...(inventory.data ?? [])
        .filter((i) => !i.archived_at)
        .map((i) => ({ id: 'i-' + i.id, title: i.name, subtitle: ['In the shop', i.location].filter(Boolean).join(' · '), to: `/shop/${i.id}`, kind: 'Shop' as const })),
    ],
    [inventory.data],
  );

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.filter((r) => r.kind === 'Tool' || r.kind === 'Page').slice(0, 12);
    const words = s.split(/\s+/);
    return all
      .map((r) => {
        const title = r.title.toLowerCase();
        const hay = `${title} ${r.subtitle.toLowerCase()}`;
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (title.startsWith(s) ? 0 : title.includes(s) ? 1 : 2) + (r.kind === 'Tool' ? 0 : 0.5);
        return { r, score };
      })
      .filter((x): x is { r: Result; score: number } => !!x)
      .sort((a, b) => a.score - b.score)
      .slice(0, 20)
      .map((x) => x.r);
  }, [q, all]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => {
    setSel(0);
  }, [q]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    navigate(r.to);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-5 text-muted" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSel((s) => Math.min(s + 1, results.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSel((s) => Math.max(s - 1, 0));
                  } else if (e.key === 'Enter') go(results[sel]);
                  else if (e.key === 'Escape') onClose();
                }}
                placeholder="Search tools, materials, the shop…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              />
              <button onClick={onClose} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-raised">
                Esc
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{q}”.</li>}
              {results.map((r, i) => {
                const Icon = icons[r.kind];
                return (
                  <li key={r.id}>
                    <button
                      onMouseEnter={() => setSel(i)}
                      onClick={() => go(r)}
                      className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === sel && 'bg-raised')}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-bg text-ink">
                        {r.slug ? <ToolArt slug={r.slug} className="size-8" /> : <Icon className="size-[1.1rem] text-muted" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.title}</span>
                        <span className="block truncate text-xs text-muted">{r.subtitle}</span>
                      </span>
                      <span className="label-caps text-muted">{r.kind}</span>
                      {i === sel && <CornerDownLeft className="hidden size-4 text-muted sm:block" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
