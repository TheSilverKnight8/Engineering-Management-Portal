// The test editor's Export and Import. The test lives only in the database
// (never in the public repository), so an exported file is its backup.
// Photos are inside the file as data URLs, so a file works on its own.

import type { TestSectionWithQuestions } from '../../../lib/queries';
import type { KeywordGroup, TestKey } from '../../../lib/types';
import { db, postImageUrl, POST_IMAGE_BUCKET } from '../../../lib/supabase';
import { compressImage } from '../../../lib/image';

const FORMAT = 'engineering-portal-safety-test';

export interface TestFileQuestion {
  kind: 'choice' | 'written';
  prompt: string;
  /** A data URL in files; a storage path once uploaded. */
  image?: string | null;
  options?: string[];
  answer?: string | null;
  keyword_groups?: KeywordGroup[];
  rubric?: string | null;
}

export interface TestFile {
  format: typeof FORMAT;
  version: 1;
  sections: { title: string; description?: string | null; questions: TestFileQuestion[] }[];
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function buildTestFile(sections: TestSectionWithQuestions[], keysById: Map<string, TestKey>): Promise<TestFile> {
  const out: TestFile = { format: FORMAT, version: 1, sections: [] };
  for (const s of sections) {
    const questions: TestFileQuestion[] = [];
    for (const q of s.questions) {
      const key = keysById.get(q.id);
      let image: string | null = null;
      if (q.image_path) {
        const res = await fetch(postImageUrl(q.image_path));
        if (res.ok) image = await blobToDataUrl(await res.blob());
      }
      questions.push(
        q.kind === 'choice'
          ? { kind: 'choice', prompt: q.prompt, image, options: q.options, answer: key?.answer ?? null }
          : { kind: 'written', prompt: q.prompt, image, keyword_groups: key?.keyword_groups ?? [], rubric: key?.rubric ?? null },
      );
    }
    out.sections.push({ title: s.title, description: s.description, questions });
  }
  return out;
}

export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Checks a file's shape and returns it, or throws with a message for the teacher. */
export function parseTestFile(text: string): TestFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not a test file.');
  }
  const f = data as Partial<TestFile>;
  if (f.format !== FORMAT || !Array.isArray(f.sections)) throw new Error('That file is not a test file from this app.');
  for (const s of f.sections) {
    if (!s.title?.trim() || !Array.isArray(s.questions)) throw new Error('A section in the file has no title or questions.');
    for (const q of s.questions) {
      if (!q.prompt?.trim()) throw new Error(`A question in "${s.title}" has no text.`);
      if (q.kind === 'choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`"${q.prompt}" needs at least two options.`);
        if (!q.answer || !q.options.includes(q.answer)) throw new Error(`"${q.prompt}" has no correct answer among its options.`);
      } else if (q.kind === 'written') {
        if (!Array.isArray(q.keyword_groups) || q.keyword_groups.length === 0) throw new Error(`"${q.prompt}" has no keyword groups.`);
      } else {
        throw new Error(`"${q.prompt}" has an unknown question type.`);
      }
    }
  }
  return f as TestFile;
}

/** Compresses a photo and uploads it into the signed-in member's folder. Returns its storage path. */
export async function uploadTestImage(file: File | Blob, userId: string): Promise<string> {
  const { blob, ext } = await compressImage(file instanceof File ? file : new File([file], 'image', { type: file.type }));
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(POST_IMAGE_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

/**
 * Replaces the whole test with the file's contents. Photos upload first; then
 * one database call swaps the test, so a failure leaves the old test in place.
 */
export async function importTestFile(file: TestFile, userId: string, onProgress: (text: string) => void): Promise<number> {
  const total = file.sections.reduce((n, s) => n + s.questions.filter((q) => q.image?.startsWith('data:')).length, 0);
  let done = 0;
  const sections = [];
  for (const s of file.sections) {
    const questions = [];
    for (const q of s.questions) {
      let image_path: string | null = q.image && !q.image.startsWith('data:') ? q.image : null;
      if (q.image?.startsWith('data:')) {
        onProgress(`Uploading photo ${done + 1} of ${total}`);
        image_path = await uploadTestImage(await (await fetch(q.image)).blob(), userId);
        done += 1;
      }
      questions.push({ ...q, image: undefined, image_path });
    }
    sections.push({ title: s.title, description: s.description ?? null, questions });
  }
  onProgress('Saving the test');
  const { data, error } = await db().rpc('replace_safety_test', { sections });
  if (error) throw error;
  return data as number;
}
