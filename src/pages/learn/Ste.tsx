import { useMemo } from 'react';
import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { steExamples, steFacts, steRules } from '../../content/ste';
import { tools } from '../../content/tools';
import { PageHeader } from '../../components/PageHeader';
import { Card, SectionTitle } from '../../components/ui';

// Splits a step into sentences and counts words, to show how the entries
// follow the 20-word limit for procedure sentences.
function sentenceStats() {
  const sentences = tools.flatMap((t) =>
    t.operation.flatMap((step) =>
      step
        .split(/(?<=\.)\s+/)
        .filter(Boolean)
        .map((s) => ({ s, tool: t, words: s.split(/\s+/).filter(Boolean).length })),
    ),
  );
  const total = sentences.reduce((n, x) => n + x.words, 0);
  const longest = sentences.reduce((a, b) => (b.words > a.words ? b : a), sentences[0]);
  return { count: sentences.length, avg: total / sentences.length, longest, over: sentences.filter((x) => x.words > 20) };
}

export default function Ste() {
  const stats = useMemo(sentenceStats, []);

  return (
    <div className="space-y-10">
      <PageHeader
        back={{ to: '/learn', label: 'Learn' }}
        eyebrow="ASD-STE100"
        title="Simplified Technical English"
        subtitle="Every tool entry in this app is written in ASD-STE100, a controlled form of English made for instructions that must be understood the first time."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <h2 className="text-lg font-semibold">What it is</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            {steFacts.name} is a writing standard first made for aircraft maintenance manuals. It limits the words and grammar a writer can use, so that instructions have one meaning, read fast, and are clear to people whose first language is not English. The current edition is {steFacts.issue} ({steFacts.published}). It is maintained by {steFacts.maintainer} and has {steFacts.ruleCount} writing rules plus a dictionary of approved words.
          </p>
          <a href={steFacts.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue hover:underline">
            Request the free standard at asd-ste100.org <ExternalLink className="size-3.5" />
          </a>
        </Card>
        <Card className="bp-grid p-5">
          <div className="label-mono text-muted">In this app’s tool entries</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="font-mono text-3xl font-bold">{stats.count}</div>
              <div className="text-sm text-muted">procedure sentences</div>
            </div>
            <div>
              <div className="font-mono text-3xl font-bold">{stats.avg.toFixed(1)}</div>
              <div className="text-sm text-muted">words per sentence on average</div>
            </div>
            <div>
              <div className="font-mono text-3xl font-bold">{stats.longest.words}</div>
              <div className="text-sm text-muted">words in the longest ({stats.longest.tool.name})</div>
            </div>
          </div>
        </Card>
      </div>

      <section>
        <SectionTitle>Key rules</SectionTitle>
        <p className="-mt-1 mb-4 text-sm text-muted">A short summary. The standard has the exact wording.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steRules.map((r, i) => (
            <Card key={r.title} className="p-5">
              <div className="mb-2 font-mono text-sm font-bold text-accent">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="font-semibold">{r.title}</h3>
              <p className="mt-1 text-sm text-muted">{r.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Examples from the tool entries</SectionTitle>
        <div className="space-y-3">
          {steExamples.map((e) => {
            const tool = tools.find((t) => t.slug === e.tool);
            return (
              <Card key={e.text} className="grid gap-3 p-5 sm:grid-cols-[1.2fr_1fr] sm:items-center">
                <blockquote className="border-l-4 border-accent pl-4 text-lg font-medium leading-snug">{e.text}</blockquote>
                <div className="text-sm">
                  <p className="text-muted">{e.shows}</p>
                  {tool && (
                    <Link to={`/tools/${tool.slug}`} className="mt-1 inline-block text-blue hover:underline">
                      {tool.name}
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {stats.over.length > 0 && (
        <section>
          <SectionTitle>Sentences over 20 words</SectionTitle>
          <Card className="divide-y divide-line">
            {stats.over.map((x) => (
              <div key={x.s} className="p-4 text-sm">
                <span className="font-mono text-warn">{x.words}</span> · {x.s} <span className="text-muted">({x.tool.name})</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
