import { Link } from 'react-router';
import { ArrowRight, Hammer } from 'lucide-react';
import { projects } from '../../content/projects';
import { tools } from '../../content/tools';
import { ToolArt } from '../../graphics/ToolArt';
import { PageHeader } from '../../components/PageHeader';
import { Chip, EmptyState } from '../../components/ui';

export default function Projects() {
  return (
    <div>
      <PageHeader back={{ to: '/learn', label: 'Learn' }} eyebrow="Practice projects" title="Practice projects" subtitle="Projects for hands-on practice with the shop’s tools." />
      {projects.length === 0 ? (
        <EmptyState art={<Hammer className="size-10" />} title="No projects yet" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => {
            const ts = tools.filter((t) => p.tools.includes(t.slug));
            return (
              <Link key={p.slug} to={`/learn/projects/${p.slug}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
                <div className="mb-3 flex items-center gap-2">{p.status === 'draft' ? <Chip tone="warn">Coming soon</Chip> : <Chip tone="ok">Ready</Chip>}</div>
                <h2 className="text-xl font-semibold">{p.title}</h2>
                {p.summary && <p className="mt-1 text-sm text-muted">{p.summary}</p>}
                {ts.length > 0 && (
                  <div className="mt-4 flex -space-x-1.5">
                    {ts.map((t) => (
                      <span key={t.slug} className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink" title={t.name}>
                        <ToolArt slug={t.slug} className="size-7" />
                      </span>
                    ))}
                  </div>
                )}
                <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-navy">
                  Open <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
