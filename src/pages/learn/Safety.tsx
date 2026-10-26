import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ClipboardCheck, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { safetyCheckpoint, studyGuide } from '../../content/safety';
import { tools } from '../../content/tools';
import { ppeLabels } from '../../content/catalog';
import type { PpeId } from '../../content/types';
import { NoGlovesIcon, PpeIcon } from '../../graphics/Icons';
import { ToolArt } from '../../graphics/ToolArt';
import { PageHeader } from '../../components/PageHeader';
import { ButtonLink, Card, SectionTitle, cx } from '../../components/ui';

// PPE columns, in the order they first appear across the tool entries.
const ppeColumns = Array.from(new Set(tools.flatMap((t) => t.ppe))) as PpeId[];

export default function Safety() {
  return (
    <div className="space-y-10">
      <PageHeader back={{ to: '/learn', label: 'Learn' }} eyebrow="Safety" title="Shop safety" subtitle="Know the PPE and the rules for each tool before you use it." />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-warn/40 bg-surface shadow-card">
          <div className="hazard-stripe h-2.5" />
          <div className="p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-warn">
              <ShieldCheck className="size-5" />
              <span className="label-mono">Required for shop access</span>
            </div>
            <h2 className="text-2xl font-bold">{safetyCheckpoint.title}</h2>
            <p className="mt-1.5 text-[0.9375rem] text-muted">{safetyCheckpoint.requirement}</p>
            <a
              href={safetyCheckpoint.url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent transition hover:brightness-110"
            >
              Open the checkpoint and practice material
              <ExternalLink className="size-4" />
            </a>
            <p className="mt-3 text-xs text-muted">Opens the shop’s safety checkpoint site.</p>
          </div>
        </div>

        <Card className="flex flex-col p-5 sm:p-6">
          <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-ok/12 text-ok">
            <ClipboardCheck className="size-5" />
          </span>
          <h2 className="text-lg font-semibold">Practice questions</h2>
          <p className="mt-1 flex-1 text-sm text-muted">Questions made from the tool entries: PPE, what each tool is for, and the order of the steps. Practice only. Results are not saved.</p>
          <ButtonLink to="/learn/safety/practice" className="mt-4 self-start">
            Start practicing
          </ButtonLink>
        </Card>
      </div>

      <section>
        <SectionTitle>PPE for each tool</SectionTitle>
        <p className="-mt-1 mb-4 text-sm text-muted">From the first step of each tool’s operation instructions.</p>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-raised/60">
                  <th className="sticky left-0 z-10 bg-raised px-4 py-3 text-left font-medium">Tool</th>
                  {ppeColumns.map((p) => (
                    <th key={p} className="px-2 py-3 text-center font-medium" title={ppeLabels[p]}>
                      <div className="flex flex-col items-center gap-1">
                        <PpeIcon id={p} size={22} />
                        <span className="text-[0.6875rem] font-normal leading-tight text-muted">{ppeLabels[p]}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center font-medium">
                    <div className="flex flex-col items-center gap-1">
                      <NoGlovesIcon size={22} />
                      <span className="text-[0.6875rem] font-normal leading-tight text-muted">No gloves</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.slug} className="border-b border-line last:border-0 hover:bg-raised/40">
                    <td className="sticky left-0 z-10 bg-surface px-4 py-2.5">
                      <Link to={`/tools/${t.slug}`} className="flex items-center gap-2.5 font-medium hover:underline">
                        <ToolArt slug={t.slug} className="size-8 shrink-0 text-ink" />
                        {t.name}
                      </Link>
                    </td>
                    {ppeColumns.map((p) => (
                      <td key={p} className="text-center">
                        {t.ppe.includes(p) && <span className="inline-block size-3 rounded-full bg-blue" aria-label="Required" />}
                      </td>
                    ))}
                    <td className="text-center">{t.noGloves && <span className="inline-block size-3 rotate-45 bg-danger" aria-label="No gloves" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Shop Floor Safety Study Guide</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {studyGuide.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="size-4 text-muted" />
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              {s.items.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {s.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" />
                      {it}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Coming from the study guide.</p>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Safety rules by tool</SectionTitle>
        <div className="space-y-2">
          {tools.map((t) => (
            <RulesAccordion key={t.slug} slug={t.slug} name={t.name} rules={t.safety} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RulesAccordion({ slug, name, rules }: { slug: string; name: string; rules: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3.5 text-left" aria-expanded={open}>
        <ToolArt slug={slug} className="size-9 shrink-0 text-ink" />
        <span className="flex-1 font-medium">{name}</span>
        <span className="text-xs text-muted">{rules.length} rules</span>
        <ChevronDown className={cx('size-4 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="space-y-2 border-t border-line px-4 py-3.5 text-[0.9375rem]">
          {rules.map((r) => (
            <li key={r} className="flex gap-3">
              <span className="mt-[0.45rem] size-2 shrink-0 rotate-45 bg-warn" />
              {r}
            </li>
          ))}
          <li className="pt-1">
            <Link to={`/tools/${slug}`} className="text-sm text-blue hover:underline">
              Open the full entry
            </Link>
          </li>
        </ul>
      )}
    </Card>
  );
}
