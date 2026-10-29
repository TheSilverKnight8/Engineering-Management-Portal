import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { ppeLabels } from '../../content/catalog';
import type { PpeId } from '../../content/types';
import { PpeIcon } from '../../graphics/Icons';
import { ToolArt } from '../../graphics/ToolArt';
import { PageHeader } from '../../components/PageHeader';
import { Button, Card, cx } from '../../components/ui';
import { makeRound, type Question } from './practiceQuestions';

const allPpe = Object.keys(ppeLabels) as PpeId[];

export default function Practice() {
  const [round, setRound] = useState(() => makeRound());
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const done = i >= round.length;

  const restart = () => {
    setRound(makeRound());
    setI(0);
    setScore(0);
    setAnswered(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={{ to: '/learn/safety', label: 'Safety' }} eyebrow="Practice only" title="Safety practice" subtitle="Questions made from the tool entries. Results are not saved and do not count toward the Tool Safety Checkpoint." />

      {done ? (
        <Card className="animate-rise p-8 text-center">
          <div className="font-display text-7xl text-accent">
            {score}/{round.length}
          </div>
          <p className="mt-3 text-muted">{score === round.length ? 'All correct. The real checkpoint needs 100% too.' : 'Read the entries for the ones you missed, then try another round.'}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={restart}>
              <RotateCcw className="size-4" />
              New round
            </Button>
            <Link to="/learn/safety/test" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 font-display uppercase tracking-[0.06em] hover:bg-raised">
              Official checkpoint <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <motion.div className="h-full bg-accent" animate={{ width: `${(i / round.length) * 100}%` }} />
            </div>
            <span className="font-display text-sm text-muted">
              {i + 1}/{round.length}
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              <QuestionCard
                q={round[i]}
                answered={answered}
                onAnswer={(ok) => {
                  setAnswered(ok);
                  if (ok) setScore((s) => s + 1);
                }}
              />
            </motion.div>
          </AnimatePresence>
          {answered !== null && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setI(i + 1);
                  setAnswered(null);
                }}
              >
                {i + 1 === round.length ? 'See score' : 'Next question'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Feedback({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className={cx('mt-4 flex gap-3 rounded-xl p-4 text-sm', ok ? 'bg-ok/10' : 'bg-danger/8')}>
      <span className={cx('flex size-6 shrink-0 items-center justify-center rounded-full', ok ? 'bg-ok text-bg' : 'bg-danger text-bg')}>{ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}</span>
      <div>
        <div className="font-semibold">{ok ? 'Correct' : 'Not quite'}</div>
        <div className="mt-0.5 text-muted">{children}</div>
      </div>
    </div>
  );
}

function QuestionCard({ q, answered, onAnswer }: { q: Question; answered: boolean | null; onAnswer: (ok: boolean) => void }) {
  switch (q.kind) {
    case 'ppe':
      return <PpeQ q={q} answered={answered} onAnswer={onAnswer} />;
    case 'which-tool':
      return <WhichToolQ q={q} answered={answered} onAnswer={onAnswer} />;
    case 'order':
      return <OrderQ q={q} answered={answered} onAnswer={onAnswer} />;
    case 'gloves':
      return <GlovesQ q={q} answered={answered} onAnswer={onAnswer} />;
  }
}

function ToolHeader({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className="art-tile flex size-20 shrink-0 items-center justify-center rounded-2xl border border-line text-ink">
        <ToolArt slug={slug} className="size-16" />
      </div>
      <h2 className="font-sans text-xl font-semibold normal-case leading-snug tracking-normal">{children}</h2>
    </div>
  );
}

function PpeQ({ q, answered, onAnswer }: { q: Extract<Question, { kind: 'ppe' }>; answered: boolean | null; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<PpeId[]>([]);
  const toggle = (p: PpeId) => setPicked((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  const check = () => onAnswer(picked.length === q.answer.length && q.answer.every((a) => picked.includes(a)));
  return (
    <Card className="p-5 sm:p-6">
      <ToolHeader slug={q.tool.slug}>What does the entry tell you to put on before you use the {q.tool.name.toLowerCase()}?</ToolHeader>
      <p className="mb-3 text-sm text-muted">Choose all that apply.</p>
      <div className="grid grid-cols-2 gap-2">
        {allPpe.map((p) => {
          const on = picked.includes(p);
          const right = q.answer.includes(p);
          return (
            <button
              key={p}
              disabled={answered !== null}
              onClick={() => toggle(p)}
              className={cx(
                'flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition',
                answered === null ? (on ? 'border-accent bg-accent/8 ring-1 ring-accent' : 'border-line hover:border-navy/40') : right ? 'border-ok bg-ok/10' : on ? 'border-danger bg-danger/8' : 'border-line opacity-60',
              )}
            >
              <PpeIcon id={p} size={24} />
              {ppeLabels[p]}
            </button>
          );
        })}
      </div>
      {answered === null ? (
        <Button variant="primary" className="mt-4 w-full" onClick={check} disabled={picked.length === 0}>
          Check
        </Button>
      ) : (
        <Feedback ok={answered}>
          The entry says: “{q.source}” <Link to={`/tools/${q.tool.slug}`} className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">Open entry</Link>
        </Feedback>
      )}
    </Card>
  );
}

function WhichToolQ({ q, answered, onAnswer }: { q: Extract<Question, { kind: 'which-tool' }>; answered: boolean | null; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const right = q.options.find((t) => t.slug === q.answer)!;
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-5 font-sans text-xl font-semibold normal-case leading-snug tracking-normal">
        Which tool is designed for: <span className="text-accent">“{q.prompt}”</span>?
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {q.options.map((t) => (
          <button
            key={t.slug}
            disabled={answered !== null}
            onClick={() => {
              setPicked(t.slug);
              onAnswer(t.slug === q.answer);
            }}
            className={cx(
              'flex flex-col items-center gap-1 rounded-xl border p-3 transition',
              answered === null ? 'border-line hover:border-navy/40 hover:bg-raised' : t.slug === q.answer ? 'border-ok bg-ok/10' : picked === t.slug ? 'border-danger bg-danger/8' : 'border-line opacity-50',
            )}
          >
            <ToolArt slug={t.slug} className="size-16 text-ink" />
            <span className="text-sm font-medium">{t.name}</span>
          </button>
        ))}
      </div>
      {answered !== null && (
        <Feedback ok={answered}>
          The {right.name.toLowerCase()} entry lists it under “Designed for”. <Link to={`/tools/${right.slug}`} className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">Open entry</Link>
        </Feedback>
      )}
    </Card>
  );
}

function OrderQ({ q, answered, onAnswer }: { q: Extract<Question, { kind: 'order' }>; answered: boolean | null; onAnswer: (ok: boolean) => void }) {
  const shuffled = useMemo(() => {
    let s = [...q.steps];
    while (s.every((x, i) => x === q.steps[i])) s = [...q.steps].sort(() => Math.random() - 0.5);
    return s;
  }, [q.steps]);
  const [order, setOrder] = useState<string[]>([]);
  const tap = (s: string) => setOrder((o) => (o.includes(s) ? o.filter((x) => x !== s) : [...o, s]));
  return (
    <Card className="p-5 sm:p-6">
      <ToolHeader slug={q.tool.slug}>Put these {q.tool.name.toLowerCase()} steps in order.</ToolHeader>
      <p className="mb-3 text-sm text-muted">Tap the steps from first to last. Tap again to undo.</p>
      <div className="space-y-2">
        {shuffled.map((s) => {
          const n = order.indexOf(s);
          const correctN = q.steps.indexOf(s);
          return (
            <button
              key={s}
              disabled={answered !== null}
              onClick={() => tap(s)}
              className={cx(
                'flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition',
                answered === null ? (n >= 0 ? 'border-accent bg-accent/8' : 'border-line hover:border-navy/40') : n === correctN ? 'border-ok bg-ok/10' : 'border-danger bg-danger/8',
              )}
            >
              <span className={cx('flex size-6 shrink-0 items-center justify-center rounded-md font-display text-sm', n >= 0 ? 'bg-accent text-on-accent' : 'bg-raised text-muted')}>{n >= 0 ? n + 1 : '·'}</span>
              <span className="pt-0.5">{s}</span>
              {answered !== null && n !== correctN && <span className="ml-auto shrink-0 font-display text-sm text-ok">#{correctN + 1}</span>}
            </button>
          );
        })}
      </div>
      {answered === null ? (
        <Button variant="primary" className="mt-4 w-full" disabled={order.length !== q.steps.length} onClick={() => onAnswer(order.every((s, i) => s === q.steps[i]))}>
          Check
        </Button>
      ) : (
        <Feedback ok={answered}>
          These steps are in this order in the {q.tool.name.toLowerCase()} entry. <Link to={`/tools/${q.tool.slug}`} className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">Open entry</Link>
        </Feedback>
      )}
    </Card>
  );
}

function GlovesQ({ q, answered, onAnswer }: { q: Extract<Question, { kind: 'gloves' }>; answered: boolean | null; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<boolean | null>(null);
  return (
    <Card className="p-5 sm:p-6">
      <ToolHeader slug={q.tool.slug}>Does the {q.tool.name.toLowerCase()} entry tell you to wear gloves?</ToolHeader>
      <div className="grid grid-cols-2 gap-2.5">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            disabled={answered !== null}
            onClick={() => {
              setPicked(v);
              onAnswer(v === q.answer);
            }}
            className={cx(
              'rounded-xl border p-4 text-lg font-semibold transition',
              answered === null ? 'border-line hover:border-navy/40 hover:bg-raised' : v === q.answer ? 'border-ok bg-ok/10' : picked === v ? 'border-danger bg-danger/8' : 'border-line opacity-50',
            )}
          >
            {v ? 'Yes, wear gloves' : 'No gloves'}
          </button>
        ))}
      </div>
      {answered !== null && (
        <Feedback ok={answered}>
          The entry says: “{q.source}” <Link to={`/tools/${q.tool.slug}`} className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">Open entry</Link>
        </Feedback>
      )}
    </Card>
  );
}
