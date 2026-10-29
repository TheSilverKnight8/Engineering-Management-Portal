import { Check, X } from 'lucide-react';
import type { TestAttempt, TestQuestion, TestResult } from '../../../lib/types';
import { postImageUrl } from '../../../lib/supabase';
import { Textarea, cx } from '../../../components/ui';

/** One attempt every 24 hours (also enforced by the database). */
export const RETAKE_HOURS = 24;

export function nextAttemptAt(attempts: TestAttempt[] | undefined): Date | null {
  const last = attempts?.[0];
  if (!last) return null;
  const next = new Date(new Date(last.submitted_at).getTime() + RETAKE_HOURS * 3_600_000);
  return next > new Date() ? next : null;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isTrueFalse = (q: Pick<TestQuestion, 'options'>) => q.options.length === 2 && q.options[0] === 'True' && q.options[1] === 'False';

export function QuestionImage({ path, className }: { path: string; className?: string }) {
  return <img src={postImageUrl(path)} alt="" loading="lazy" className={cx('rounded-xl border border-line bg-white object-contain', className)} />;
}

/**
 * How a question is answered: true/false buttons, a list of options, a menu
 * for long option lists (photo ID, matching), or a text box.
 */
export function QuestionInput({ q, options, value, onChange }: { q: TestQuestion; options: string[]; value: string; onChange: (v: string) => void }) {
  if (q.kind === 'written') {
    return <Textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={2000} placeholder="Your answer" aria-label={q.prompt} />;
  }
  if (isTrueFalse(q)) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={cx('h-11 rounded-xl border font-display uppercase tracking-[0.06em] transition', value === o ? 'border-navy bg-navy text-bg' : 'border-line bg-raised hover:border-navy/40')}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (options.length > 6) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={q.prompt}
        className={cx('h-11 w-full rounded-xl border bg-raised px-3.5 text-base outline-none transition focus:border-navy lg:text-[0.9375rem]', value ? 'border-navy/40' : 'border-line')}
      >
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition', value === o ? 'border-navy bg-navy/8' : 'border-line hover:border-navy/40')}>
          <input type="radio" name={q.id} checked={value === o} onChange={() => onChange(o)} className="size-4 accent-[var(--navy)]" />
          <span className="text-[0.9375rem]">{o}</span>
        </label>
      ))}
    </div>
  );
}

/** The questions a student missed, without the correct answers. Teachers use AttemptReview instead. */
export function MissedList({ results, images }: { results: TestResult[]; images: Map<string, string | null> }) {
  const missed = results.filter((r) => r.earned < r.possible);
  if (missed.length === 0) return null;
  return (
    <ul className="divide-y divide-line">
      {missed.map((r) => {
        const image = images.get(r.question_id);
        return (
          <li key={r.question_id} className="flex gap-3 py-3">
            <span className={cx('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', r.earned > 0 ? 'bg-warn/15 text-warn' : 'bg-danger/12 text-danger')}>
              <X className="size-3.5" strokeWidth={3} />
            </span>
            {image && <QuestionImage path={image} className="size-14 shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="text-[0.9375rem]">{r.prompt}</div>
              {r.kind === 'written' && (
                <div className="mt-0.5 text-xs text-muted">
                  {r.earned} of {r.possible} points
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ScoreLine({ attempt }: { attempt: Pick<TestAttempt, 'score' | 'possible' | 'passed'> }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-semibold', attempt.passed ? 'text-ok' : 'text-danger')}>
      {attempt.passed ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
      {attempt.score} / {attempt.possible}
    </span>
  );
}
