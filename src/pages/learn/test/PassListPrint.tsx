import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Printer } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { useAllAttempts, useRoster } from '../../../lib/queries';
import { canManageTest } from '../../../lib/types';
import { formatDate } from '../../../lib/time';
import { safetyCheckpoint } from '../../../content/safety';
import { CLASS_NAME, SCHOOL_NAME } from '../../../config';
import { Button, LoadingBlock } from '../../../components/ui';
import NotFound from '../../NotFound';

/** "Ana Lei Kealoha" → { last: "Kealoha", rest: "Ana Lei" } */
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { last: parts.length > 1 ? parts[parts.length - 1] : parts[0], rest: parts.slice(0, -1).join(' ') };
}

// Teachers and the developer: everyone who passed the checkpoint, A to Z by
// last name, laid out for paper. The print dialog opens on its own; choosing
// "Save as PDF" there makes the PDF.
export default function PassListPrint() {
  const { profile } = useAuth();
  const manager = canManageTest(profile);
  const roster = useRoster();
  const attempts = useAllAttempts(manager);
  const printed = useRef(false);

  const rows = useMemo(() => {
    const firstPass = new Map<string, string>();
    for (const a of [...(attempts.data ?? [])].reverse()) if (a.passed && !firstPass.has(a.user_id)) firstPass.set(a.user_id, a.period);
    return (roster.data ?? [])
      .filter((p) => p.safety_passed_at)
      .map((p) => ({ ...splitName(p.full_name), period: firstPass.get(p.id) ?? '—', passed: p.safety_passed_at! }))
      .sort((a, b) => a.last.localeCompare(b.last, undefined, { sensitivity: 'base' }) || a.rest.localeCompare(b.rest, undefined, { sensitivity: 'base' }));
  }, [roster.data, attempts.data]);

  const today = new Date();
  const ready = manager && !roster.isLoading && !attempts.isLoading;

  // The browser uses the page title as the PDF's file name.
  useEffect(() => {
    const before = document.title;
    document.title = `Safety checkpoint passes ${new Date().toISOString().slice(0, 10)}`;
    return () => {
      document.title = before;
    };
  }, []);

  useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [ready]);

  if (!manager) return <NotFound />;

  return (
    <div className="print-sheet min-h-dvh bg-white px-6 py-8 text-black sm:px-10">
      <div className="no-print mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link to="/learn/safety/log" className="inline-flex items-center gap-0.5 text-sm text-neutral-600 hover:text-black">
          <ChevronLeft className="size-4" />
          Pass log
        </Link>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print or save as PDF
        </Button>
      </div>

      <div className="mx-auto max-w-3xl">
        <h1 className="text-[2rem] leading-none text-black">{safetyCheckpoint.title}: passed</h1>
        <p className="mt-2 text-sm text-neutral-700">
          {SCHOOL_NAME} {CLASS_NAME} · Printed {formatDate(today.toISOString())} · {rows.length} {rows.length === 1 ? 'person' : 'people'}
        </p>

        {!ready ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <p className="mt-8 text-neutral-700">No one has passed yet.</p>
        ) : (
          <table className="mt-6 w-full border-collapse text-[0.9375rem]">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="w-10 py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold">Period</th>
                <th className="py-2 font-semibold">Date passed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.last}-${r.rest}-${i}`} className="break-inside-avoid border-b border-neutral-300">
                  <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                  <td className="py-2 pr-4">
                    <span className="font-semibold">{r.last}</span>
                    {r.rest && `, ${r.rest}`}
                  </td>
                  <td className="py-2 pr-4">{r.period}</td>
                  <td className="py-2">{formatDate(r.passed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
