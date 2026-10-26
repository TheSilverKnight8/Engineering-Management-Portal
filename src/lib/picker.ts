// Tool picker logic. The rules are the same as the first Shop Manual's picker:
//   material and objective must be in the tool's lists,
//   the tool's precision must be at least the chosen precision,
//   thickness must be at most the tool's max thickness,
//   the longer side must fit the tool's max length and the shorter side its max width.
// The difference: every answer is optional, results update as you go, and
// tools that do not fit say why.

import { materialById, objectiveById, precisionLabels } from '../content/catalog';
import type { MaterialId, ObjectiveId, Precision, Tool } from '../content/types';
import { formatInches } from './units';

export interface PickerInput {
  material?: MaterialId;
  objective?: ObjectiveId;
  precision?: Precision;
  thickness?: number;
  length?: number;
  width?: number;
}

export interface Check {
  key: 'material' | 'objective' | 'precision' | 'thickness' | 'size';
  ok: boolean;
  text: string;
}

export interface Evaluated {
  tool: Tool;
  checks: Check[];
  failed: Check[];
}

export function evaluateTool(tool: Tool, input: PickerInput): Evaluated {
  const p = tool.picker;
  const checks: Check[] = [];

  if (input.material) {
    const ok = p.materials.includes(input.material);
    const name = materialById[input.material].name.toLowerCase();
    checks.push({ key: 'material', ok, text: ok ? `Works with ${name}` : `Not for ${name}` });
  }
  if (input.objective) {
    const ok = p.objectives.includes(input.objective);
    const label = objectiveById[input.objective].label.toLowerCase();
    checks.push({ key: 'objective', ok, text: ok ? `Made for ${label}` : `Not made for ${label}` });
  }
  if (input.precision) {
    const ok = p.precision >= input.precision;
    checks.push({
      key: 'precision',
      ok,
      text: ok ? `${precisionLabels[p.precision]} precision` : `Only ${precisionLabels[p.precision].toLowerCase()} precision`,
    });
  }
  if (input.thickness !== undefined) {
    const ok = p.maxThickness === null || input.thickness <= p.maxThickness;
    checks.push({
      key: 'thickness',
      ok,
      text: p.maxThickness === null ? 'Any thickness' : ok ? `Up to ${formatInches(p.maxThickness)} thick` : `Max ${formatInches(p.maxThickness)} thick`,
    });
  }
  const sides = [input.length, input.width].filter((n): n is number => n !== undefined).sort((a, b) => b - a);
  if (sides.length > 0) {
    const [long, wide] = sides;
    const longOk = p.maxLength === null || long <= p.maxLength;
    const wideOk = wide === undefined || p.maxWidth === null || wide <= p.maxWidth;
    const limits = [p.maxLength !== null && `${formatInches(p.maxLength)} long`, p.maxWidth !== null && `${formatInches(p.maxWidth)} wide`].filter(Boolean).join(' × ');
    checks.push({
      key: 'size',
      ok: longOk && wideOk,
      text: !limits ? 'Any size' : longOk && wideOk ? `Fits (max ${limits})` : `Too big (max ${limits})`,
    });
  }

  return { tool, checks, failed: checks.filter((c) => !c.ok) };
}

export function runPicker(tools: Tool[], input: PickerInput) {
  const all = tools.map((t) => evaluateTool(t, input));
  const byName = (a: Evaluated, b: Evaluated) => a.tool.name.localeCompare(b.tool.name);
  return {
    matches: all.filter((e) => e.failed.length === 0).sort(byName),
    nearMisses: all.filter((e) => e.failed.length === 1).sort(byName),
    others: all.filter((e) => e.failed.length > 1).sort(byName),
  };
}

export const hasAnyInput = (i: PickerInput) => Object.values(i).some((v) => v !== undefined);
