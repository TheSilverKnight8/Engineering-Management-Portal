import { Link, useParams } from 'react-router';
import { Construction, ShieldAlert } from 'lucide-react';
import { projects } from '../../content/projects';
import { tools } from '../../content/tools';
import { materialById } from '../../content/catalog';
import { ToolArt } from '../../graphics/ToolArt';
import { MaterialIcon } from '../../graphics/Icons';
import { PageHeader } from '../../components/PageHeader';
import { VideoSlot } from '../../components/VideoSlot';
import { Card, Chip, EmptyState, SectionTitle } from '../../components/ui';
import NotFound from '../NotFound';

export default function ProjectEntry() {
  const { slug } = useParams();
  const p = projects.find((x) => x.slug === slug);
  if (!p) return <NotFound what="project" />;
  const ts = tools.filter((t) => p.tools.includes(t.slug));

  return (
    <div>
      <PageHeader back={{ to: '/learn/projects', label: 'Practice projects' }} eyebrow={p.status === 'draft' ? 'Coming soon' : 'Practice project'} title={p.title} subtitle={p.summary || undefined} />

      {p.status === 'draft' && (
        <Card className="mb-8">
          <EmptyState
            art={
              <div className="flex size-14 items-center justify-center rounded-2xl bg-warn/15 text-warn">
                <Construction className="size-7" />
              </div>
            }
            title="This project is not written yet"
          >
            The steps, tools, and safety notes for this project are coming.
          </EmptyState>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          {p.videos.map((v, i) => (
            <VideoSlot key={i} slot={v} />
          ))}

          {p.steps.length > 0 && (
            <section>
              <SectionTitle>Steps</SectionTitle>
              <ol className="space-y-3">
                {p.steps.map((s, i) => (
                  <li key={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised font-display text-base text-accent">{String(i + 1).padStart(2, '0')}</span>
                    <span className="pt-1">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {p.safety.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-warn/40 bg-surface">
              <div className="stripes stripes-tl stripes-sm mt-4" aria-hidden />
              <div className="p-5 pt-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <ShieldAlert className="size-5 text-warn" />
                  Safety
                </h2>
                <ul className="space-y-2">
                  {p.safety.map((s) => (
                    <li key={s} className="flex gap-3">
                      <span className="mt-[0.45rem] size-2 shrink-0 rotate-45 bg-warn" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="label-caps mb-3 text-muted">Materials</div>
            <div className="flex flex-wrap gap-2">
              {p.materials.map((m) => (
                <Chip key={m} icon={<MaterialIcon id={m} size={18} />}>
                  {materialById[m].name}
                </Chip>
              ))}
            </div>
          </Card>
          {ts.length > 0 && (
            <Card className="p-5">
              <div className="label-caps mb-3 text-muted">Tools</div>
              <div className="space-y-1.5">
                {ts.map((t) => (
                  <Link key={t.slug} to={`/tools/${t.slug}`} className="flex items-center gap-2.5 rounded-lg p-1.5 text-sm font-medium hover:bg-raised">
                    <ToolArt slug={t.slug} className="size-8 text-ink" />
                    {t.name}
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
