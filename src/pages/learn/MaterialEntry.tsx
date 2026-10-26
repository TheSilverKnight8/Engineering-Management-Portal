import { Link, useParams } from 'react-router';
import { Sparkles } from 'lucide-react';
import { materialById, objectives } from '../../content/catalog';
import { tools } from '../../content/tools';
import type { MaterialId } from '../../content/types';
import { MaterialIcon, ObjectiveIcon } from '../../graphics/Icons';
import { ToolArt } from '../../graphics/ToolArt';
import { PageHeader } from '../../components/PageHeader';
import { ButtonLink, Card, SectionTitle } from '../../components/ui';
import NotFound from '../NotFound';

export default function MaterialEntry() {
  const { id } = useParams();
  const m = materialById[id as MaterialId];
  if (!m) return <NotFound what="material" />;

  const list = tools.filter((t) => t.picker.materials.includes(m.id));
  const jobs = objectives
    .map((o) => ({ o, tools: list.filter((t) => t.picker.objectives.includes(o.id)) }))
    .filter((j) => j.tools.length > 0);

  return (
    <div>
      <PageHeader
        back={{ to: '/learn/materials', label: 'Materials' }}
        eyebrow="Material"
        title={
          <span className="flex items-center gap-4">
            <span className="bp-grid flex size-16 items-center justify-center rounded-2xl border border-line bg-surface text-ink">
              <MaterialIcon id={m.id} size={44} />
            </span>
            {m.name}
          </span>
        }
        actions={
          <ButtonLink to={`/picker?m=${m.id}`} variant="primary">
            <Sparkles className="size-4" />
            Pick a tool for {m.name.toLowerCase()}
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <SectionTitle>Which tool for which job</SectionTitle>
          <div className="space-y-3">
            {jobs.map(({ o, tools: ts }) => (
              <Card key={o.id} className="p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <ObjectiveIcon id={o.id} size={22} className="text-ink" />
                  <h3 className="font-semibold">{o.label}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ts.map((t) => (
                    <Link key={t.slug} to={`/tools/${t.slug}`} className="flex items-center gap-2 rounded-xl border border-line bg-raised py-1.5 pl-1.5 pr-3 text-sm font-medium transition hover:border-blue/40">
                      <ToolArt slug={t.slug} className="size-8 text-ink" />
                      {t.name}
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <aside>
          <Card className="p-5">
            <div className="label-mono mb-3 text-muted">Notes</div>
            {m.notes.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {m.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Notes on working with {m.name.toLowerCase()} are coming.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
