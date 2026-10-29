import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Printer, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { keys, useAllAttempts, useRoster, useSafetyTest, useTestKeys } from '../../../lib/queries';
import { canManageTest, type Profile, type TestAttempt, type TestKey, type TestQuestion } from '../../../lib/types';
import { db } from '../../../lib/supabase';
import { friendlyError } from '../../../lib/errors';
import { useToast } from '../../../lib/toast';
import { dayLabel, formatDate, formatTime } from '../../../lib/time';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar, Button, ButtonLink, Card, Chip, EmptyState, LoadingBlock, Segmented, cx } from '../../../components/ui';
import NotFound from '../../NotFound';
import { ScoreLine } from './shared';
import { AttemptReview } from './AttemptReview';

type Filter = 'all' | 'passed' | 'not';

// Teachers and the developer: who passed, every attempt, and the written
// answers behind each score. An attempt can be marked as passed from here.
export default function SafetyLog() {
  const { profile } = useAuth();
  const manager = canManageTest(profile);
  const roster = useRoster();
  const attempts = useAllAttempts(manager);
  const test = useSafetyTest();
  const testKeys = useTestKeys(manager);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);

  const byUser = useMemo(() => {
    const m = new Map<string, TestAttempt[]>();
    for (const a of attempts.data ?? []) m.set(a.user_id, [...(m.get(a.user_id) ?? []), a]);
    return m;
  }, [attempts.data]);
  const questions = useMemo(() => new Map((test.data ?? []).flatMap((s) => s.questions.map((q) => [q.id, q] as const))), [test.data]);

  if (!manager) return <NotFound />;

  const everyone = roster.data ?? [];
  const passedCount = everyone.filter((p) => p.safety_passed_at).length;
  const people = everyone.filter((p) => (filter === 'all' ? true : filter === 'passed' ? !!p.safety_passed_at : !p.safety_passed_at));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ to: '/learn/safety/test', label: 'Safety test' }}
        eyebrow="Teachers"
        title="Pass log"
        subtitle="Who passed the Tool Safety Checkpoint and every attempt. Open an attempt to read the answers and change the points on any question."
        actions={
          <ButtonLink to="/learn/safety/log/print" size="sm">
            <Printer className="size-4" />
            Print list
          </ButtonLink>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {passedCount} of {everyone.length} passed
        </p>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'passed', label: 'Passed' },
            { value: 'not', label: 'Not passed' },
          ]}
        />
      </div>

      {roster.isLoading || attempts.isLoading ? (
        <LoadingBlock />
      ) : people.length === 0 ? (
        <EmptyState title="No one here">No one matches this filter.</EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {people.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              attempts={byUser.get(p.id) ?? []}
              open={open === p.id}
              onToggle={() => setOpen(open === p.id ? null : p.id)}
              questions={questions}
              keysById={testKeys.byId}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function PersonRow({
  person,
  attempts,
  open,
  onToggle,
  questions,
  keysById,
}: {
  person: Profile;
  attempts: TestAttempt[];
  open: boolean;
  onToggle: () => void;
  questions: Map<string, TestQuestion>;
  keysById: Map<string, TestKey>;
}) {
  const last = attempts[0];
  const byTeacher = attempts.some((a) => a.passed_by);
  let status;
  if (person.safety_passed_at) status = `Passed ${formatDate(person.safety_passed_at)}${byTeacher ? ' · marked by a teacher' : ''}`;
  else if (last) status = `${attempts.length} ${attempts.length === 1 ? 'attempt' : 'attempts'} · last ${last.score} / ${last.possible} · period ${last.period}`;
  else status = 'Not taken';

  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <Avatar name={person.full_name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{person.full_name}</span>
            {person.safety_passed_at && (
              <Chip tone="ok" icon={<ShieldCheck className="size-3.5" />}>
                Passed
              </Chip>
            )}
          </div>
          <div className="text-xs text-muted">{status}</div>
        </div>
        {attempts.length > 0 && <ChevronDown className={cx('size-4 shrink-0 text-muted transition', open && 'rotate-180')} />}
      </button>
      {open && attempts.length > 0 && (
        <div className="space-y-3 px-4 pb-4">
          {attempts.map((a) => (
            <AttemptCard key={a.id} attempt={a} personPassed={!!person.safety_passed_at} questions={questions} keysById={keysById} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttemptCard({ attempt, personPassed, questions, keysById }: { attempt: TestAttempt; personPassed: boolean; questions: Map<string, TestQuestion>; keysById: Map<string, TestKey> }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [view, setView] = useState<'hidden' | 'missed' | 'all'>(attempt.passed ? 'hidden' : 'missed');
  const roster = useRoster();
  const at = new Date(attempt.submitted_at);

  const pass = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('pass_safety_attempt', { attempt: attempt.id });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.attempts('all') });
      void qc.invalidateQueries({ queryKey: keys.roster });
      toast('Marked as passed.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <div className="rounded-xl border border-line bg-raised/50 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <ScoreLine attempt={attempt} />
          <span className="ml-2 text-muted">
            {dayLabel(at)} {formatTime(at)} · period {attempt.period}
          </span>
        </div>
        {!attempt.passed && !personPassed && (
          <Button size="sm" onClick={() => confirm('Mark this attempt as passed? This records you as the teacher who passed it.') && pass.mutate()} loading={pass.isPending}>
            <ShieldCheck className="size-4" />
            Mark as passed
          </Button>
        )}
      </div>
      {attempt.passed_by && (
        <p className="mt-1 text-xs text-muted">
          Marked as passed by {roster.byId.get(attempt.passed_by)?.full_name ?? 'a former member'}
          {attempt.passed_by_teacher_at ? ` on ${formatDate(attempt.passed_by_teacher_at)}` : ''}.
        </p>
      )}
      {attempt.adjusted_by && (
        <p className="mt-1 text-xs text-muted">
          Points changed by {roster.byId.get(attempt.adjusted_by)?.full_name ?? 'a former member'}
          {attempt.adjusted_at ? ` on ${formatDate(attempt.adjusted_at)}` : ''}.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-navy">
        {view !== 'missed' && <button onClick={() => setView('missed')}>Show missed questions</button>}
        {view !== 'all' && <button onClick={() => setView('all')}>Show all answers</button>}
        {view !== 'hidden' && <button onClick={() => setView('hidden')}>Hide answers</button>}
      </div>
      {view !== 'hidden' && <AttemptReview attempt={attempt} questions={questions} keysById={keysById} onlyMissed={view === 'missed'} />}
    </div>
  );
}
