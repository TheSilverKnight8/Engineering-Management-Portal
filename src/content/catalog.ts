// Labels and lists shared by the tool library, picker, and safety pages.
// Only the owner edits this file.

import type { Material, MaterialId, Objective, ObjectiveId, PpeId, Precision, ToolCategory } from './types';

export const materials: Material[] = [
  { id: 'wood', name: 'Wood', notes: [] },
  { id: 'acrylic', name: 'Acrylic', notes: [] },
  { id: 'polycarbonate', name: 'Polycarbonate', notes: [] },
  { id: 'metal', name: 'Metal', notes: [] },
];

// Labels come from the objectives in the first Shop Manual's picker.
// Add a hint to show a one-line explanation under the label in the picker.
export const objectives: Objective[] = [
  { id: 'straight-cuts', label: 'Straight cuts' },
  { id: 'long-cuts', label: 'Long cuts' },
  { id: 'curved-cuts', label: 'Curved cuts' },
  { id: 'precise-cuts', label: 'Precise cuts' },
  { id: 'cutouts', label: 'Cutouts' },
  { id: 'straight-bore', label: 'Straight bore' },
  { id: 'detailed-bore', label: 'Detailed bore' },
  { id: 'driving-screws', label: 'Driving screws' },
  { id: 'surface-finishing', label: 'Surface finishing' },
  { id: 'sharpening', label: 'Sharpening' },
  { id: 'demolition', label: 'Demolition' },
];

export const ppeLabels: Record<PpeId, string> = {
  'safety-glasses': 'Safety glasses',
  'hearing-protection': 'Hearing protection',
  'dust-mask': 'Dust mask',
  'face-shield': 'Face shield',
  gloves: 'Gloves',
  'heat-resistant-gloves': 'Heat-resistant gloves',
  'long-sleeves': 'Long sleeves',
  'laser-goggles': 'Laser safety goggles',
};

export const categoryLabels: Record<ToolCategory, string> = {
  saws: 'Saws',
  drilling: 'Drilling and driving',
  abrasives: 'Sanding and grinding',
  machines: 'Machines',
};

export const precisionLabels: Record<Precision, string> = {
  1: 'Rough',
  2: 'Medium',
  3: 'Fine',
};

export const materialById = Object.fromEntries(materials.map((m) => [m.id, m])) as Record<MaterialId, Material>;
export const objectiveById = Object.fromEntries(objectives.map((o) => [o.id, o])) as Record<ObjectiveId, Objective>;
