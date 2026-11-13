import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Scale, X } from 'lucide-react';
import { keys, useMyAppeals, useRoster } from '../../../lib/queries';
import type { Profile, TestAppeal, TestAttempt, TestKey, TestQuestion } from '../../../lib/types';
import { db } from '../../../lib/supabase';
import { friendlyError } from '../../../lib/errors';
import { useToast } from '../../../lib/toast';
import { formatDate } from '../../../lib/time';
import { Sheet } from '../../../components/Sheet';
import { Avatar, Button, Card, Chip, Textarea, cx } from '../../../components/ui';
import { QuestionImage, ScoreLine } from './shared';
import { KeyDetails } from './AttemptReview';

const decisionChip = (d: 'accepted' | 'denied' | null) =>
  d === 'accepted' ? (
    <Chip tone="ok" icon={<Check className="size-3.5" />}>
      Accepted
    </Chip>
  ) : d === 'denied' ? (
    <Chip tone="danger" icon={<X className="size-3.5" />}>
      Denied
    </Chip>
  ) : (
    <Chip>Waiting</Chip>
  );

/**
 * Students: appeal questions missed on this attempt (their latest one that did
 * not pass), or see how their appeal was decided.
 */
export function StudentAppeal({ attempt, images, canAppeal }: { attempt: TestAttempt; images: Map<string, string | null>; canAppeal: boolean }) {
  const appeals = useMyAppeals();
  const [open, setOpen] = useState(false);
  const appeal = appeals.data?.find((a) => a.attempt_id === attempt.id);

  if (appeals.isLoading) return null;
  if (appeal) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <Scale className="size-5 text-navy" />
          <h2 className="text-lg">Your appeal</h2>
        </div>
        <p className="mb-3 text-sm text-muted">
          {appeal.status === 'open' ? `Sent ${formatDate(appeal.created_at)}. Your teacher will review it.` : `Decided ${formatDate(appeal.decided_at!)}.`}
        </p>
        <ul className="divide-y divide-line">
          {appeal.items.map((item) => (
            <li key={item.question_id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-[0.9375rem]">{item.prompt}</div>
                {decisionChip(item.decision)}
              </div>
              <div className="mt-1 text-sm text-muted">Your reason: {item.reason}</div>
            </li>
          ))}
        </ul>
        {appeal.reply && (
          <div className="mt-3 rounded-xl bg-raised p-3 text-sm">
            <span className="font-medium">Teacher's reply:</span> {appeal.reply}
          </div>
        )}
      </Card>
    );
  }
  if (!canAppeal || attempt.passed || attempt.results.every((r) => r.earned >= r.possible)) return null;
  return (
    <>
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
        <Scale className="size-6 shrink-0 text-navy" />
        <div className="flex-1 text-sm">
          <div className="font-medium">Think a question was marked wrong?</div>
          <div className="text-muted">Appeal it here with your reason. Your teacher reviews it, and an accepted question gets full points. You can appeal this attempt once, until you take the test again.</div>
        </div>
        <Button onClick={() => setOpen(true)}>Appeal questions</Button>
      </Card>
      <AppealSheet open={open} onClose={() => setOpen(false)} attempt={attempt} images={images} />
    </>
  );
}

function AppealSheet({ open, onClose, attempt, images }: { open: boolean; onClose: () => void; attempt: TestAttempt; images: Map<string, string | null> }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const missed = attempt.results.filter((r) => r.earned < r.possible);
  const chosen = Object.keys(reasons);
  const ready = chosen.length > 0 && chosen.every((id) => reasons[id].trim());

  const send = useMutation({
    mutationFn: async () => {
      const items = chosen.map((question_id) => ({ question_id, reason: reasons[question_id].trim() }));
      const { error } = await db().rpc('submit_test_appeal', { attempt: attempt.id, items });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.appeals('mine') });
      toast('Appeal sent. Your teacher will review it.');
      onClose();
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const toggle = (id: string) =>
    setReasons((r) => {
      const next = { ...r };
      if (id in next) delete next[id];
      else next[id] = '';
      return next;
    });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title="Appeal questions"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted">{chosen.length === 1 ? '1 question' : `${chosen.length} questions`}</span>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={!ready} loading={send.isPending} onClick={() => send.mutate()}>
              Send appeal
            </Button>
          </div>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted">Choose the questions you think should count, and say why for each one. You can send one appeal for this attempt.</p>
      <ul className="space-y-2">
        {missed.map((r) => {
          const on = r.question_id in reasons;
          const image = images.get(r.question_id);
          return (
            <li key={r.question_id} className={cx('rounded-xl border p-3 transition', on ? 'border-navy bg-navy/5' : 'border-line')}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={on} onChange={() => toggle(r.question_id)} className="mt-1 size-4 shrink-0 accent-[var(--navy)]" />
                {image && <QuestionImage path={image} className="size-12 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem]">{r.prompt}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Your answer: {attempt.responses[r.question_id] || '(no answer)'}
                    {r.kind === 'written' && ` · ${r.earned} of ${r.possible} points`}
                  </span>
                </span>
              </label>
              {on && (
                <Textarea
                  className="mt-2.5 min-h-20"
                  maxLength={1000}
                  value={reasons[r.question_id]}
                  onChange={(e) => setReasons((x) => ({ ...x, [r.question_id]: e.target.value }))}
                  placeholder="Why should this answer count?"
                  aria-label={`Reason for: ${r.prompt}`}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** Teachers and the developer: one open appeal, decided question by question. */
export function AppealReview({
  appeal,
  attempt,
  person,
  questions,
  keysById,
}: {
  appeal: TestAppeal;
  attempt?: TestAttempt;
  person?: Profile;
  questions: Map<string, TestQuestion>;
  keysById: Map<string, TestKey>;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [decisions, setDecisions] = useState<Record<string, 'accepted' | 'denied'>>({});
  const [reply, setReply] = useState('');
  const ready = appeal.items.every((i) => decisions[i.question_id]);

  const decide = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('decide_test_appeal', { appeal: appeal.id, decisions, reply: reply.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.appeals('all') });
      void qc.invalidateQueries({ queryKey: keys.attempts('all') });
      void qc.invalidateQueries({ queryKey: keys.roster });
      const accepted = Object.values(decisions).filter((d) => d === 'accepted').length;
      toast(`Decision sent: ${accepted} of ${appeal.items.length} accepted.`);
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Avatar name={person?.full_name ?? '?'} path={person?.avatar_path} size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-semibold">{person?.full_name ?? 'Former member'}</div>
          <div className="text-xs text-muted">
            Appealed {appeal.items.length === 1 ? '1 question' : `${appeal.items.length} questions`} · {formatDate(appeal.created_at)}
            {attempt && ` · period ${attempt.period}`}
          </div>
        </div>
        {attempt && <ScoreLine attempt={attempt} />}
      </div>
      <ul className="divide-y divide-line">
        {appeal.items.map((item) => {
          const q = questions.get(item.question_id);
          const r = attempt?.results.find((x) => x.question_id === item.question_id);
          const given = attempt?.responses[item.question_id] ?? '';
          const d = decisions[item.question_id];
          return (
            <li key={item.question_id} className="flex gap-3 py-3">
              {q?.image_path && <QuestionImage path={q.image_path} className="size-14 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-[0.9375rem]">{item.prompt}</div>
                <div className="mt-1 whitespace-pre-wrap rounded-lg bg-raised px-2.5 py-1.5 text-sm">{given || '(no answer)'}</div>
                {r && <KeyDetails kind={r.kind} k={keysById.get(item.question_id)} given={given} />}
                <div className="mt-2 rounded-lg border-l-2 border-navy/40 pl-2.5 text-sm">
                  <span className="text-muted">Reason: </span>
                  {item.reason}
                </div>
                <div className="mt-2 inline-flex rounded-lg border border-line bg-raised p-0.5" role="group" aria-label={`Decision for: ${item.prompt}`}>
                  {(['accepted', 'denied'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={d === v}
                      onClick={() => setDecisions((x) => ({ ...x, [item.question_id]: v }))}
                      className={cx('rounded-md px-3 py-1 text-sm font-medium transition', d === v ? (v === 'accepted' ? 'bg-ok text-bg' : 'bg-danger text-bg') : 'text-muted hover:text-ink')}
                    >
                      {v === 'accepted' ? 'Accept' : 'Deny'}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Textarea className="mt-2 min-h-16" maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the student (optional)" aria-label="Reply to the student" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">Accepted questions get full points. The score and pass update right away.</span>
        <Button variant="primary" size="sm" disabled={!ready} loading={decide.isPending} onClick={() => decide.mutate()}>
          Send decision
        </Button>
      </div>
    </div>
  );
}

/** One line on a decided appeal, for the attempt in the pass log. */
export function AppealSummary({ appeal }: { appeal: TestAppeal }) {
  const roster = useRoster();
  const accepted = appeal.items.filter((i) => i.decision === 'accepted').length;
  return (
    <p className="mt-1 text-xs text-muted">
      {appeal.status === 'open'
        ? `Appeal waiting: ${appeal.items.length === 1 ? '1 question' : `${appeal.items.length} questions`}.`
        : `Appeal decided by ${roster.byId.get(appeal.decided_by ?? '')?.full_name ?? 'a former member'}: ${accepted} of ${appeal.items.length} accepted.`}
    </p>
  );
}
