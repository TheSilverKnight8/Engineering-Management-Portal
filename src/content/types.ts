// Shapes of the curated content in src/content. This content lives in the repo,
// not in Supabase, so only someone who can push to the repo can change it, and
// it costs nothing in database storage or bandwidth.

export type MaterialId = 'wood' | 'acrylic' | 'polycarbonate' | 'metal' | 'plastic';

export type ObjectiveId =
  | 'straight-bore'
  | 'detailed-bore'
  | 'curved-cuts'
  | 'straight-cuts'
  | 'long-cuts'
  | 'precise-cuts'
  | 'cutouts'
  | 'demolition'
  | 'driving-screws'
  | 'surface-finishing'
  | 'sharpening'
  | 'engraving'
  | 'advanced-fabrication'
  | 'turning';

export type PpeId =
  | 'safety-glasses'
  | 'hearing-protection'
  | 'dust-mask'
  | 'face-shield'
  | 'gloves'
  | 'heat-resistant-gloves'
  | 'long-sleeves'
  | 'laser-goggles';

export type ToolCategory = 'saws' | 'drilling' | 'abrasives' | 'machines';

/** 1 = rough, 2 = medium, 3 = fine */
export type Precision = 1 | 2 | 3;

export interface VideoSlot {
  title: string;
  /** YouTube video ID. Empty shows a "coming soon" placeholder. */
  youtubeId: string;
}

export interface Graphic {
  /** Path under public/, for example "media/tools/drill/chuck.webp" */
  src: string;
  caption: string;
}

export interface Tool {
  slug: string;
  name: string;
  category: ToolCategory;
  form: 'stationary' | 'handheld';
  summary: string;
  ppe: PpeId[];
  /** The entry's own text says not to wear gloves with this tool. */
  noGloves: boolean;
  picker: {
    materials: MaterialId[];
    objectives: ObjectiveId[];
    precision: Precision;
    /** Inches. null means no limit. */
    maxThickness: number | null;
    maxLength: number | null;
    maxWidth: number | null;
  };
  designedFor: string[];
  notDesignedFor: string[];
  safety: string[];
  operation: string[];
  videos: VideoSlot[];
  graphics: Graphic[];
}

export interface Material {
  id: MaterialId;
  name: string;
  /** Owner-written notes. Empty shows a placeholder. */
  notes: string[];
}

export interface Objective {
  id: ObjectiveId;
  label: string;
  /** Optional one-line explanation shown in the picker. */
  hint?: string;
}

export interface Project {
  slug: string;
  title: string;
  /** "draft" projects show as coming soon. */
  status: 'draft' | 'ready';
  summary: string;
  tools: string[];
  materials: MaterialId[];
  steps: string[];
  safety: string[];
  videos: VideoSlot[];
  graphics: Graphic[];
}
