import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Clock, PencilLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { keys, useMyAttempts, useSafetyTest } from '../../../lib/queries';
import { canManageTest, type TestAttempt } from '../../../lib/types';
import { db } from '../../../lib/supabase';
import { friendlyError } from '../../../lib/errors';
import { useToast } from '../../../lib/toast';
import { dayLabel, formatDate, formatTime } from '../../../lib/time';
import { safetyCheckpoint } from '../../../content/safety';
import { PageHeader } from '../../../components/PageHeader';
import { Button, ButtonLink, Card, EmptyState, Field, Input, LoadingBlock, cx } from '../../../components/ui';
import { MissedList, QuestionImage, QuestionInput, RETAKE_HOURS, ScoreLine, isTrueFalse, nextAttemptAt, shuffle } from './shared';

const when = (d: Date) => `${dayLabel(d)} at ${formatTime(d)}`;

export default function SafetyTest() {
  const { profile, refreshProfile } = useAuth();
  const test = useSafetyTest();
  const mine = useMyAttempts();
  const qc = useQueryClient();
  const toast = useToast();
  const [period, setPeriod] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestAttempt | null>(null);
  const manager = canManageTest(profile);

  const sections = useMemo(() => test.data ?? [], [test.data]);
  const questions = useMemo(() => sections.flatMap((s) => s.questions), [sections]);
  // Answer choices are shuffled each time the test opens, like the paper version.
  const optionOrder = useMemo(() => new Map(questions.map((q) => [q.id, isTrueFalse(q) ? q.options : shuffle(q.options)])), [questions]);
  const images = useMemo(() => new Map(questions.map((q) => [q.id, q.image_path])), [questions]);
  const answered = questions.filter((q) => (answers[q.id] ?? '').trim()).length;

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await db().rpc('submit_safety_test', { period: period.trim(), responses: answers });
      if (error) throw error;
      return data as TestAttempt;
    },
    onSuccess: (attempt) => {
      setResult(attempt);
      void qc.invalidateQueries({ queryKey: keys.attempts('mine') });
      if (attempt.passed) {
        void refreshProfile();
        void qc.invalidateQueries({ queryKey: keys.roster });
      }
      window.scrollTo({ top: 0 });
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!period.trim()) return toast('Enter your class period.', 'error');
    const left = questions.length - answered;
    const warning = left > 0 ? `${left} ${left === 1 ? 'question has' : 'questions have'} no answer. ` : '';
    if (confirm(`${warning}Submit the test? If you do not pass, you can try again after ${RETAKE_HOURS} hours.`)) submit.mutate();
  }

  const next = nextAttemptAt(mine.data);
  let body;
  if (test.isLoading || mine.isLoading) {
    body = <LoadingBlock />;
  } else if (result) {
    body = <ResultCard attempt={result} images={images} />;
  } else if (profile?.safety_passed_at) {
    const passing = mine.data?.find((a) => a.passed);
    body = (
      <Card className="p-6 text-center sm:p-8">
        <ShieldCheck className="mx-auto mb-3 size-12 text-ok" />
        <h2 className="text-2xl">You passed</h2>
        <p className="mt-1 text-muted">
          {formatDate(profile.safety_passed_at)}
          {passing?.passed_by ? ' · marked as passed by a teacher' : passing ? ` · ${passing.score} / ${passing.possible}` : ''}
        </p>
        <p className="mt-3 text-sm text-muted">You are cleared for shop access. You do not need to take the test again.</p>
      </Card>
    );
  } else if (next && mine.data?.[0]) {
    body = (
      <div className="space-y-4">
        <Card className="p-6 text-center sm:p-8">
          <Clock className="mx-auto mb-3 size-10 text-warn" />
          <h2 className="text-2xl">Try again {when(next)}</h2>
          <p className="mt-1 text-muted">
            Your last attempt: <ScoreLine attempt={mine.data[0]} />
          </p>
          <p className="mt-3 text-sm text-muted">You get one attempt every {RETAKE_HOURS} hours. Review the questions below in the meantime.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <ButtonLink to="/learn/safety/practice">Practice questions</ButtonLink>
            <ButtonLink to="/learn/safety">Safety page</ButtonLink>
          </div>
        </Card>
        <MissedCard attempt={mine.data[0]} images={images} />
      </div>
    );
  } else if (questions.length === 0) {
    body = (
      <EmptyState title="The test is not set up yet" action={manager && <ButtonLink to="/learn/safety/test/edit">Set up the test</ButtonLink>}>
        {manager ? 'Add the questions in the test editor.' : 'Your teacher has not added the questions yet.'}
      </EmptyState>
    );
  } else {
    let n = 0;
    body = (
      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="p-5 sm:p-6">
          <ul className="mb-5 space-y-1.5 text-[0.9375rem]">
            <li>You need 100% to pass.</li>
            <li>You get one attempt every {RETAKE_HOURS} hours.</li>
            <li>Written answers are scored by keywords. Be specific and use safety terms.</li>
          </ul>
          <Field label="Class period" htmlFor="period">
            <Input id="period" required maxLength={20} value={period} onChange={(e) => setPeriod(e.target.value)} className="sm:max-w-40" />
          </Field>
        </Card>

        {sections.map((s, si) => (
          <Card key={s.id} className="p-5 sm:p-6">
            <div className="mb-1 flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-on-accent">{si + 1}</span>
              <h2 className="text-xl">{s.title}</h2>
            </div>
            {s.description && <p className="mb-2 text-sm text-muted">{s.description}</p>}
            <div className="mt-4 space-y-6">
              {s.questions.map((q) => {
                n += 1;
                return (
                  <div key={q.id}>
                    <p className="mb-2 font-medium">
                      <span className="mr-1.5 text-muted">{n}.</span>
                      {q.prompt}
                    </p>
                    {q.image_path && <QuestionImage path={q.image_path} className="mb-3 h-48 w-full sm:h-56 sm:w-auto sm:max-w-sm" />}
                    <QuestionInput q={q} options={optionOrder.get(q.id) ?? q.options} value={answers[q.id] ?? ''} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-pop backdrop-blur lg:bottom-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {answered} of {questions.length} answered
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-accent transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
            </div>
          </div>
          <Button type="submit" variant="primary" loading={submit.isPending}>
            Submit
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ to: '/learn/safety', label: 'Safety' }}
        eyebrow="Safety"
        title={safetyCheckpoint.title}
        subtitle={safetyCheckpoint.requirement}
        actions={
          manager && (
            <>
              <ButtonLink to="/learn/safety/log" size="sm">
                <ClipboardList className="size-4" />
                Pass log
              </ButtonLink>
              <ButtonLink to="/learn/safety/test/edit" size="sm">
                <PencilLine className="size-4" />
                Edit test
              </ButtonLink>
            </>
          )
        }
      />
      {body}
    </div>
  );
}

function ResultCard({ attempt, images }: { attempt: TestAttempt; images: Map<string, string | null> }) {
  const next = new Date(new Date(attempt.submitted_at).getTime() + RETAKE_HOURS * 3_600_000);
  const pct = Math.round((attempt.score / attempt.possible) * 100);
  return (
    <div className="space-y-4">
      <Card className="p-6 text-center sm:p-8">
        <div className={cx('font-display text-7xl', attempt.passed ? 'text-ok' : 'text-accent')}>{pct}%</div>
        <div className="mt-1 text-muted">
          {attempt.score} / {attempt.possible} points
        </div>
        <h2 className="mt-3 text-2xl">{attempt.passed ? 'Passed: cleared for shop access' : 'Not passed yet'}</h2>
        {!attempt.passed && <p className="mt-2 text-sm text-muted">You can try again {when(next)}.</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {!attempt.passed && <ButtonLink to="/learn/safety/practice">Practice questions</ButtonLink>}
          <ButtonLink to="/learn/safety">Safety page</ButtonLink>
        </div>
      </Card>
      <MissedCard attempt={attempt} images={images} />
    </div>
  );
}

function MissedCard({ attempt, images }: { attempt: TestAttempt; images: Map<string, string | null> }) {
  if (attempt.passed || attempt.results.every((r) => r.earned >= r.possible)) return null;
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg">Questions to review</h2>
      <p className="mb-2 text-sm text-muted">
        The correct answers are not shown. Review the <Link to="/tools" className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4">tool entries</Link> and the safety page, then try again.
      </p>
      <MissedList results={attempt.results} images={images} />
    </Card>
  );
}
