import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { materials } from '../../content/catalog';
import { tools } from '../../content/tools';
import { MaterialIcon } from '../../graphics/Icons';
import { ToolArt } from '../../graphics/ToolArt';
import { PageHeader } from '../../components/PageHeader';

export default function Materials() {
  return (
    <div>
      <PageHeader back={{ to: '/learn', label: 'Learn' }} eyebrow="Materials" title="Materials" subtitle="The materials the shop’s tools work with, and which tool to use for each job." />
      <div className="grid gap-3 sm:grid-cols-2">
        {materials.map((m, i) => {
          const list = tools.filter((t) => t.picker.materials.includes(m.id));
          return (
            <Link
              key={m.id}
              to={`/learn/materials/${m.id}`}
              className="group flex animate-rise items-center gap-5 rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="art-tile flex size-20 shrink-0 items-center justify-center rounded-2xl border border-line text-ink">
                <MaterialIcon id={m.id} size={56} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold">{m.name}</h2>
                <p className="text-sm text-muted">{list.length === 1 ? '1 tool works' : `${list.length} tools work`} with it</p>
                <div className="mt-2 flex -space-x-1.5">
                  {list.slice(0, 7).map((t) => (
                    <span key={t.slug} className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink">
                      <ToolArt slug={t.slug} className="size-6" />
                    </span>
                  ))}
                </div>
              </div>
              <ArrowRight className="size-5 text-muted transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
