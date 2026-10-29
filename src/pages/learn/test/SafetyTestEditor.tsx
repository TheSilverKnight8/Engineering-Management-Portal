import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Download, ImagePlus, PencilLine, Plus, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { keys, useSafetyTest, useTestKeys, type TestSectionWithQuestions } from '../../../lib/queries';
import { canManageTest, type KeywordGroup, type TestKey, type TestQuestion } from '../../../lib/types';
import { db, POST_IMAGE_BUCKET } from '../../../lib/supabase';
import { friendlyError } from '../../../lib/errors';
import { useToast } from '../../../lib/toast';
import { PageHeader } from '../../../components/PageHeader';
import { Button, Card, EmptyState, Field, Input, LoadingBlock, Select, Textarea, cx } from '../../../components/ui';
import NotFound from '../../NotFound';
import { QuestionImage, isTrueFalse } from './shared';
import { buildTestFile, downloadJson, importTestFile, parseTestFile, uploadTestImage } from './testFile';

// Teachers and the developer write the safety test here. Everything is saved
// in the database; the answer key never reaches students.
export default function SafetyTestEditor() {
  const { profile } = useAuth();
  const manager = canManageTest(profile);
  const test = useSafetyTest();
  const testKeys = useTestKeys(manager);
  const qc = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!manager || !profile) return <NotFound />;
  const sections = test.data ?? [];
  const questionCount = sections.reduce((n, s) => n + s.questions.length, 0);
  const points = sections.reduce(
    (n, s) => n + s.questions.reduce((m, q) => m + (q.kind === 'choice' ? 1 : (testKeys.byId.get(q.id)?.keyword_groups.length ?? 0)), 0),
    0,
  );
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.safetyTest });
    void qc.invalidateQueries({ queryKey: keys.testKeys });
  };

  async function exportTest() {
    setBusy('Preparing the file');
    try {
      downloadJson(await buildTestFile(sections, testKeys.byId), `safety-test-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setBusy(null);
  }

  async function importTest(file: File) {
    try {
      const parsed = parseTestFile(await file.text());
      const count = parsed.sections.reduce((n, s) => n + s.questions.length, 0);
      if (!confirm(`Replace the whole test with ${count} questions from this file? Past attempts and passes are kept.`)) return;
      const oldImages = sections.flatMap((s) => s.questions.map((q) => q.image_path)).filter((p): p is string => !!p?.startsWith(`${profile!.id}/`));
      setBusy('Starting');
      const n = await importTestFile(parsed, profile!.id, setBusy);
      if (oldImages.length) await db().storage.from(POST_IMAGE_BUCKET).remove(oldImages);
      refresh();
      toast(`Imported ${n} questions.`);
    } catch (e) {
      toast(e instanceof Error && !('code' in e) ? e.message : friendlyError(e), 'error');
    }
    setBusy(null);
  }

  async function addSection() {
    const { error } = await db()
      .from('test_sections')
      .insert({ title: 'New section', position: (sections.at(-1)?.position ?? -1) + 1 });
    if (error) return toast(friendlyError(error), 'error');
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ to: '/learn/safety/test', label: 'Safety test' }}
        eyebrow="Teachers"
        title="Test editor"
        subtitle="Questions and the answer key are saved in the database. Students never see the key."
        actions={
          <>
            <Button size="sm" onClick={() => void exportTest()} disabled={!!busy || questionCount === 0}>
              <Download className="size-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => fileInput.current?.click()} disabled={!!busy}>
              <Upload className="size-4" />
              Import
            </Button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importTest(f); }} />
          </>
        }
      />
      <p className="mb-4 text-sm text-muted">
        {questionCount} questions · {points} points · passing is all {points}. Export makes a backup file with the photos inside; Import replaces the whole test with a file.
      </p>
      {busy && <div className="mb-4 rounded-xl bg-navy/8 px-4 py-3 text-sm font-medium text-navy">{busy}…</div>}

      {test.isLoading || testKeys.isLoading ? (
        <LoadingBlock />
      ) : sections.length === 0 ? (
        <EmptyState title="No questions yet" action={<Button onClick={() => void addSection()}>Add a section</Button>}>
          Add a section, then its questions. Or import a test file.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {sections.map((s, i) => (
            <SectionEditor key={s.id} section={s} index={i} sections={sections} keysById={testKeys.byId} userId={profile.id} refresh={refresh} />
          ))}
          <Button onClick={() => void addSection()}>
            <Plus className="size-4" />
            Add a section
          </Button>
        </div>
      )}
    </div>
  );
}

async function swapPositions(table: 'test_sections' | 'test_questions', a: { id: string; position: number }, b: { id: string; position: number }) {
  const first = await db().from(table).update({ position: b.position }).eq('id', a.id);
  if (first.error) throw first.error;
  const second = await db().from(table).update({ position: a.position }).eq('id', b.id);
  if (second.error) throw second.error;
}

function SectionEditor({
  section,
  index,
  sections,
  keysById,
  userId,
  refresh,
}: {
  section: TestSectionWithQuestions;
  index: number;
  sections: TestSectionWithQuestions[];
  keysById: Map<string, TestKey>;
  userId: string;
  refresh: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? '');
  const [adding, setAdding] = useState<'choice' | 'written' | null>(null);
  const dirty = title !== section.title || description !== (section.description ?? '');

  async function run(fn: () => PromiseLike<{ error: unknown }> | Promise<void>) {
    try {
      const res = await fn();
      if (res && 'error' in res && res.error) throw res.error;
      refresh();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <span className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-on-accent">{index + 1}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Section title" className="font-semibold" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="Instructions for this section (optional)" aria-label="Section instructions" className="min-h-16" />
          {dirty && (
            <div className="flex gap-2">
              <Button size="sm" variant="primary" disabled={!title.trim()} onClick={() => void run(() => db().from('test_sections').update({ title: title.trim(), description: description.trim() || null }).eq('id', section.id))}>
                Save section
              </Button>
              <Button size="sm" onClick={() => { setTitle(section.title); setDescription(section.description ?? ''); }}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <IconButton label="Move section up" disabled={index === 0} onClick={() => void run(() => swapPositions('test_sections', section, sections[index - 1]))} icon={<ArrowUp className="size-4" />} />
          <IconButton label="Move section down" disabled={index === sections.length - 1} onClick={() => void run(() => swapPositions('test_sections', section, sections[index + 1]))} icon={<ArrowDown className="size-4" />} />
          <IconButton
            label="Delete section"
            onClick={() =>
              confirm(`Delete "${section.title}" and its ${section.questions.length} questions?`) &&
              void run(async () => {
                const { error } = await db().from('test_sections').delete().eq('id', section.id);
                if (error) throw error;
                const photos = section.questions.map((q) => q.image_path).filter((p): p is string => !!p);
                if (photos.length) await db().storage.from(POST_IMAGE_BUCKET).remove(photos);
              })
            }
            icon={<Trash2 className="size-4" />}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {section.questions.map((q, qi) => (
          <QuestionRow key={q.id} q={q} index={qi} questions={section.questions} k={keysById.get(q.id)} userId={userId} refresh={refresh} />
        ))}
        {adding && (
          <QuestionForm
            kind={adding}
            sectionId={section.id}
            position={(section.questions.at(-1)?.position ?? -1) + 1}
            userId={userId}
            onDone={() => {
              setAdding(null);
              refresh();
            }}
          />
        )}
      </div>
      {!adding && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAdding('choice')}>
            <Plus className="size-4" />
            Choice question
          </Button>
          <Button size="sm" onClick={() => setAdding('written')}>
            <Plus className="size-4" />
            Written question
          </Button>
        </div>
      )}
    </Card>
  );
}

function IconButton({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="rounded-lg p-1.5 text-muted transition hover:bg-raised hover:text-ink disabled:opacity-30">
      {icon}
    </button>
  );
}

function QuestionRow({ q, index, questions, k, userId, refresh }: { q: TestQuestion; index: number; questions: TestQuestion[]; k?: TestKey; userId: string; refresh: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <QuestionForm
        existing={q}
        existingKey={k}
        kind={q.kind}
        sectionId={q.section_id}
        position={q.position}
        userId={userId}
        onDone={() => {
          setEditing(false);
          refresh();
        }}
      />
    );
  }

  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      refresh();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  }
  const summary =
    q.kind === 'choice'
      ? k?.answer
        ? `Answer: ${k.answer}${isTrueFalse(q) ? '' : ` · ${q.options.length} options`}`
        : 'No correct answer set'
      : `${k?.keyword_groups.length ?? 0} keyword groups · ${k?.keyword_groups.length ?? 0} points`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line p-3">
      {q.image_path && <QuestionImage path={q.image_path} className="size-12 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{q.prompt}</div>
        <div className={cx('truncate text-xs', q.kind === 'choice' && !k?.answer ? 'text-danger' : 'text-muted')}>
          {q.kind === 'choice' ? 'Choice' : 'Written'} · {summary}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <IconButton label="Edit question" onClick={() => setEditing(true)} icon={<PencilLine className="size-4" />} />
        <IconButton label="Move question up" disabled={index === 0} onClick={() => void act(() => swapPositions('test_questions', q, questions[index - 1]))} icon={<ArrowUp className="size-4" />} />
        <IconButton label="Move question down" disabled={index === questions.length - 1} onClick={() => void act(() => swapPositions('test_questions', q, questions[index + 1]))} icon={<ArrowDown className="size-4" />} />
        <IconButton
          label="Delete question"
          onClick={() =>
            confirm('Delete this question?') &&
            void act(async () => {
              const { error } = await db().from('test_questions').delete().eq('id', q.id);
              if (error) throw error;
              if (q.image_path) await db().storage.from(POST_IMAGE_BUCKET).remove([q.image_path]);
            })
          }
          icon={<Trash2 className="size-4" />}
        />
      </div>
    </div>
  );
}

const splitLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const splitKeywords = (s: string) => s.split(',').map((w) => w.trim()).filter(Boolean);

function QuestionForm({
  existing,
  existingKey,
  kind: initialKind,
  sectionId,
  position,
  userId,
  onDone,
}: {
  existing?: TestQuestion;
  existingKey?: TestKey;
  kind: 'choice' | 'written';
  sectionId: string;
  position: number;
  userId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const photoInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState(initialKind);
  const [prompt, setPrompt] = useState(existing?.prompt ?? '');
  const [optionsText, setOptionsText] = useState((existing?.options ?? []).join('\n'));
  const [answer, setAnswer] = useState(existingKey?.answer ?? '');
  const [groups, setGroups] = useState<{ label: string; keywords: string }[]>(
    (existingKey?.keyword_groups ?? [{ label: 'Key point', keywords: [] }]).map((g: KeywordGroup) => ({ label: g.label, keywords: g.keywords.join(', ') })),
  );
  const [rubric, setRubric] = useState(existingKey?.rubric ?? '');
  const [imagePath, setImagePath] = useState(existing?.image_path ?? null);
  const [newPhoto, setNewPhoto] = useState<{ file: File; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const options = splitLines(optionsText);

  function problem(): string | null {
    if (!prompt.trim()) return 'Write the question.';
    if (kind === 'choice') {
      if (options.length < 2) return 'Add at least two options, one per line.';
      if (new Set(options).size !== options.length) return 'Two options are the same.';
      if (!options.includes(answer)) return 'Choose the correct answer.';
    } else {
      if (groups.length === 0) return 'Add at least one keyword group.';
      if (groups.some((g) => !g.label.trim() || splitKeywords(g.keywords).length === 0)) return 'Each keyword group needs a name and at least one keyword.';
    }
    return null;
  }

  async function save() {
    const p = problem();
    if (p) return toast(p, 'error');
    setSaving(true);
    try {
      const image_path = newPhoto ? await uploadTestImage(newPhoto.file, userId) : imagePath;
      const row = { section_id: sectionId, position, kind, prompt: prompt.trim(), image_path, options: kind === 'choice' ? options : [] };
      const saved = existing
        ? await db().from('test_questions').update(row).eq('id', existing.id).select('id').single()
        : await db().from('test_questions').insert(row).select('id').single();
      if (saved.error) throw saved.error;
      const key = {
        question_id: (saved.data as { id: string }).id,
        answer: kind === 'choice' ? answer : null,
        keyword_groups: kind === 'written' ? groups.map((g) => ({ label: g.label.trim(), keywords: splitKeywords(g.keywords) })) : [],
        rubric: kind === 'written' ? rubric.trim() || null : null,
      };
      const keyRes = await db().from('test_keys').upsert(key);
      if (keyRes.error) throw keyRes.error;
      if (existing?.image_path && existing.image_path !== image_path) await db().storage.from(POST_IMAGE_BUCKET).remove([existing.image_path]);
      onDone();
    } catch (e) {
      toast(friendlyError(e), 'error');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-navy/40 bg-raised/40 p-4">
      <div className="flex gap-2">
        {(['choice', 'written'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', kind === k ? 'bg-navy text-bg' : 'bg-surface text-muted hover:text-ink')}>
            {k === 'choice' ? 'Choice' : 'Written'}
          </button>
        ))}
      </div>
      <Field label="Question" htmlFor="q-prompt">
        <Textarea id="q-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={1000} className="min-h-16" />
      </Field>

      <div>
        <div className="mb-1.5 text-sm font-medium">Photo (optional)</div>
        <div className="flex items-center gap-3">
          {newPhoto ? <img src={newPhoto.url} alt="" className="size-20 rounded-xl border border-line object-contain" /> : imagePath && <QuestionImage path={imagePath} className="size-20" />}
          <Button size="sm" onClick={() => photoInput.current?.click()}>
            <ImagePlus className="size-4" />
            {newPhoto || imagePath ? 'Change' : 'Add photo'}
          </Button>
          {(newPhoto || imagePath) && (
            <Button size="sm" variant="ghost" onClick={() => { setNewPhoto(null); setImagePath(null); }}>
              <X className="size-4" />
              Remove
            </Button>
          )}
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setNewPhoto({ file: f, url: URL.createObjectURL(f) }); }} />
        </div>
      </div>

      {kind === 'choice' ? (
        <>
          <Field label="Options, one per line" htmlFor="q-options" hint={<button type="button" className="text-navy underline" onClick={() => setOptionsText('True\nFalse')}>Make it true/false</button>}>
            <Textarea id="q-options" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} className="min-h-24" />
          </Field>
          <Field label="Correct answer" htmlFor="q-answer">
            <Select id="q-answer" value={options.includes(answer) ? answer : ''} onChange={(e) => setAnswer(e.target.value)}>
              <option value="">Choose…</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
        </>
      ) : (
        <>
          <div>
            <div className="mb-1 text-sm font-medium">Keyword groups</div>
            <p className="mb-2 text-xs text-muted">Each group is worth 1 point. An answer earns it if it contains any of the group's keywords (capital letters do not matter). Separate keywords with commas.</p>
            <div className="space-y-2">
              {groups.map((g, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-line bg-surface p-2.5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input value={g.label} onChange={(e) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Group name, for example Primary use" aria-label="Group name" />
                    <Textarea value={g.keywords} onChange={(e) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, keywords: e.target.value } : x)))} placeholder="drill, hole, bore" aria-label="Keywords" className="min-h-16" />
                  </div>
                  <IconButton label="Remove group" onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))} icon={<X className="size-4" />} />
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-2" onClick={() => setGroups((gs) => [...gs, { label: '', keywords: '' }])}>
              <Plus className="size-4" />
              Keyword group
            </Button>
          </div>
          <Field label="What a full answer covers (teachers only)" htmlFor="q-rubric" hint="Shown in the pass log next to missed answers.">
            <Textarea id="q-rubric" value={rubric} onChange={(e) => setRubric(e.target.value)} maxLength={2000} className="min-h-16" />
          </Field>
        </>
      )}

      <div className="flex gap-2">
        <Button variant="primary" onClick={() => void save()} loading={saving}>
          Save question
        </Button>
        <Button onClick={onDone} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
