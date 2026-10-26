// Practice questions built only from what the tool entries already say, so no
// question can disagree with the entries. Nothing here counts toward the Tool
// Safety Checkpoint, and no results are saved.

import { tools } from '../../content/tools';
import type { PpeId, Tool } from '../../content/types';

export type Question =
  | { kind: 'ppe'; tool: Tool; answer: PpeId[]; source: string }
  | { kind: 'which-tool'; prompt: string; options: Tool[]; answer: string }
  | { kind: 'order'; tool: Tool; steps: string[]; source: string }
  | { kind: 'gloves'; tool: Tool; answer: boolean; source: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function ppeQuestion(): Question {
  const tool = pick(tools);
  return { kind: 'ppe', tool, answer: tool.ppe, source: tool.operation.find((s) => s.startsWith('Put on')) ?? '' };
}

function whichToolQuestion(): Question {
  const tool = pick(tools);
  const prompt = pick(tool.designedFor);
  // Wrong answers share no job with the right tool and do not list the same line,
  // so only one option can be correct.
  const distractors = shuffle(
    tools.filter((t) => t.slug !== tool.slug && !t.picker.objectives.some((o) => tool.picker.objectives.includes(o)) && !t.designedFor.includes(prompt)),
  ).slice(0, 3);
  return { kind: 'which-tool', prompt, options: shuffle([tool, ...distractors]), answer: tool.slug };
}

function orderQuestion(): Question {
  const tool = pick(tools);
  const idx = shuffle(tool.operation.map((_, i) => i))
    .slice(0, 4)
    .sort((a, b) => a - b);
  return { kind: 'order', tool, steps: idx.map((i) => tool.operation[i]), source: tool.name };
}

function glovesQuestion(): Question | null {
  // Only tools whose entry says something definite about gloves.
  const candidates = tools.filter((t) => t.noGloves || t.ppe.includes('gloves'));
  const tool = pick(candidates);
  if (tool.noGloves) {
    const rule = [...tool.safety, ...tool.operation].find((s) => /gloves/i.test(s)) ?? '';
    return { kind: 'gloves', tool, answer: false, source: rule };
  }
  return { kind: 'gloves', tool, answer: true, source: tool.operation.find((s) => s.startsWith('Put on')) ?? '' };
}

export function makeRound(count = 10): Question[] {
  const makers = [ppeQuestion, whichToolQuestion, orderQuestion, glovesQuestion, ppeQuestion, whichToolQuestion, orderQuestion];
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const q = makers[out.length % makers.length]();
    if (!q) continue;
    const key = q.kind === 'which-tool' ? `w:${q.prompt}` : `${q.kind}:${q.tool.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
