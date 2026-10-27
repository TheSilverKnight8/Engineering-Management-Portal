// Safety section content. Only the owner edits this file.
//
// The sections in studyGuide match the "Shop Floor Safety Study Guide" PDF.
// When the PDF is in the repo, move its content into `items` for each section.
// A section with no items shows as "coming from the study guide".

export const safetyCheckpoint = {
  title: 'Tool Safety Checkpoint',
  url: 'https://sites.google.com/k12.hi.us/shop-floor-safety-checkpoint-2?usp=sharing',
  requirement: 'You must score 100% on the Tool Safety Checkpoint to earn shop access.',
};

export interface StudyGuideSection {
  id: string;
  title: string;
  items: string[];
}

export const studyGuide: StudyGuideSection[] = [
  { id: 'ppe-dress-code', title: 'PPE and dress code', items: [] },
  { id: 'shop-rules', title: 'General shop rules', items: [] },
  { id: 'tool-table', title: 'Tool table: primary use and key hazard', items: [] },
  { id: 'matching', title: 'Blade, bit, and sandpaper grit matching', items: [] },
  { id: 'pre-use-checklist', title: 'Pre-use safety checklist', items: [] },
];

// Shown at the top of every tool entry. The same text is on every tool.
export const toolDisclaimer = {
  title: 'Read this first',
  lines: [
    'This guide gives information about the tool. You must also get training from your teacher.',
    'Do not use a tool before you pass the Tool Safety Checkpoint and your teacher gives you approval.',
    'Obey the instructions from your teacher and from the manufacturer’s manual at all times.',
    'This guide can have errors. If this guide and your teacher give different instructions, obey your teacher.',
    'Use each tool only for the work that it is designed for. Incorrect use can cause serious injury.',
    'If you are not sure how to do a step, stop. Ask your teacher.',
    'If a person gets an injury or a tool has damage, stop work. Tell your teacher immediately.',
  ],
};
