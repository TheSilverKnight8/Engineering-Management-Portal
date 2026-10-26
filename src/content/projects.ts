// Practice projects. Only the owner edits this file.
//
// Set status to 'ready' when a project is complete. Draft projects show in the
// list as "coming soon" so students know they exist.
// tools: slugs from tools.ts. Each one links to that tool's entry.

import type { Project } from './types';

export const projects: Project[] = [
  {
    slug: 'wood-block',
    title: 'Wood Block Practice Project',
    status: 'draft',
    summary: '',
    tools: [],
    materials: ['wood'],
    steps: [],
    safety: [],
    videos: [{ title: 'Project walkthrough', youtubeId: '' }],
    graphics: [],
  },
];
