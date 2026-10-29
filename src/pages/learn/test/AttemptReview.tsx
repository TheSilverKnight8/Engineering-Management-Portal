import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { keys } from '../../../lib/queries';
import type { TestAttempt, TestKey, TestQuestion, TestResult } from '../../../lib/types';
import { db } from '../../../lib/supabase';
import { friendlyError } from '../../../lib/errors';
import { useToast } from '../../../lib/toast';
import { cx } from '../../../components/ui';
import { QuestionImage } from './shared';

// Teachers and the developer: an attempt question by question, with the
// student's answer, the key, and buttons to change the points.
export function AttemptReview({
  attempt,
  questions,
  keysById,
  onlyMissed,
}: {
  attempt: TestAttempt;
  questions: Map<string, TestQuestion>;
  keysById: Map<string, TestKey>;
  onlyMissed: boolean;
}) {
  const rows = attempt.results.map((r, i) => ({ r, n: i + 1 })).filter(({ r }) => !onlyMissed || r.earned < r.possible || r.auto_earned !== undefined);
  if (rows.length === 0) return <p className="py-3 text-sm text-muted">No missed questions.</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map(({ r, n }) => (
        <ReviewRow key={r.question_id} attemptId={attempt.id} n={n} r={r} q={questions.get(r.question_id)} k={keysById.get(r.question_id)} given={attempt.responses[r.question_id] ?? ''} />
      ))}
    </ul>
  );
}

function ReviewRow({ attemptId, n, r, q, k, given }: { attemptId: string; n: number; r: TestResult; q?: TestQuestion; k?: TestKey; given: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const setPoints = useMutation({
    mutationFn: async (points: number) => {
      const { error } = await db().rpc('set_attempt_points', { attempt: attemptId, question: r.question_id, points });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.attempts('all') });
      void qc.invalidateQueries({ queryKey: keys.roster });
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const full = r.earned >= r.possible;
  const lower = given.toLowerCase();
  return (
    <li className="flex gap-3 py-3">
      <span className={cx('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', full ? 'bg-ok/12 text-ok' : r.earned > 0 ? 'bg-warn/15 text-warn' : 'bg-danger/12 text-danger')}>
        {full ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
      </span>
      {q?.image_path && <QuestionImage path={q.image_path} className="size-14 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-[0.9375rem]">
          <span className="mr-1 text-muted">{n}.</span>
          {r.prompt}
        </div>
        <div className="mt-1 whitespace-pre-wrap rounded-lg bg-raised px-2.5 py-1.5 text-sm">{given || '(no answer)'}</div>

        {r.kind === 'choice' && k?.answer && given !== k.answer && <div className="mt-1 text-xs text-muted">Correct answer: {k.answer}</div>}
        {r.kind === 'written' && k && (
          <div className="mt-1.5 space-y-1 text-xs">
            {k.keyword_groups.map((g) => {
              const hit = g.keywords.find((w) => w.trim() && lower.includes(w.trim().toLowerCase()));
              return (
                <div key={g.label} className={hit ? 'text-ok' : 'text-muted'}>
                  {hit ? '✓' : '✗'} {g.label}
                  {hit ? ` (matched “${hit}”)` : ` (keywords: ${g.keywords.slice(0, 6).join(', ')}${g.keywords.length > 6 ? '…' : ''})`}
                </div>
              );
            })}
            {k.rubric && <div className="text-muted">Full answer covers: {k.rubric}</div>}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Points</span>
          <div className="inline-flex rounded-lg border border-line bg-raised p-0.5" role="group" aria-label={`Points for question ${n}`}>
            {Array.from({ length: r.possible + 1 }, (_, p) => (
              <button
                key={p}
                type="button"
                disabled={setPoints.isPending}
                onClick={() => p !== r.earned && setPoints.mutate(p)}
                aria-pressed={p === r.earned}
                className={cx('min-w-9 rounded-md px-2 py-1 text-sm font-medium transition', p === r.earned ? 'bg-navy text-bg' : 'text-muted hover:text-ink')}
              >
                {r.kind === 'choice' ? (p === 1 ? 'Right' : 'Wrong') : p}
              </button>
            ))}
          </div>
          {r.kind === 'written' && <span className="text-xs text-muted">of {r.possible}</span>}
          {r.auto_earned !== undefined && r.auto_earned !== r.earned && <span className="text-xs text-warn">Changed by a teacher (automatic: {r.kind === 'choice' ? (r.auto_earned ? 'right' : 'wrong') : r.auto_earned})</span>}
        </div>
      </div>
    </li>
  );
}
