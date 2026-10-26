import { Link } from 'react-router';
import { ArrowRight, BookOpen, ClipboardCheck, Languages, Layers, ShieldCheck } from 'lucide-react';
import { projects } from '../../content/projects';
import { materials } from '../../content/catalog';
import { PageHeader } from '../../components/PageHeader';
import { cx } from '../../components/ui';

const cards = [
  { to: '/learn/safety', title: 'Safety', body: 'PPE for each tool, the safety rules, and the Tool Safety Checkpoint.', icon: ShieldCheck, tone: 'bg-warn/15 text-warn', big: true },
  { to: '/learn/safety/practice', title: 'Safety practice', body: 'Practice questions made from the tool entries.', icon: ClipboardCheck, tone: 'bg-ok/12 text-ok' },
  { to: '/learn/projects', title: 'Practice projects', body: `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} to practice with the shop tools.`, icon: BookOpen, tone: 'bg-accent/12 text-accent' },
  { to: '/learn/materials', title: 'Materials', body: `${materials.length} materials and the tools that work with each one.`, icon: Layers, tone: 'bg-navy/12 text-navy' },
  { to: '/learn/ste', title: 'Simplified Technical English', body: 'Why the tool entries are written the way they are.', icon: Languages, tone: 'bg-raised text-ink' },
];

export default function LearnHub() {
  return (
    <div>
      <PageHeader eyebrow="Learn" title="Learn the shop" subtitle="Safety first, then practice. Everything here is written for this shop." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Link
            key={c.to}
            to={c.to}
            className={cx(
              'group flex animate-rise flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop',
              c.big && 'sm:col-span-2 lg:col-span-1 lg:row-span-2',
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {c.big && <div className="stripes stripes-tl stripes-sm -mx-5 -mt-1 mb-5" aria-hidden />}
            <span className={cx('mb-4 flex size-11 items-center justify-center rounded-xl', c.tone)}>
              <c.icon className="size-5" />
            </span>
            <h2 className={cx('font-semibold', c.big ? 'text-2xl' : 'text-lg')}>{c.title}</h2>
            <p className="mt-1 text-sm text-muted">{c.body}</p>
            <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-navy">
              Open <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
