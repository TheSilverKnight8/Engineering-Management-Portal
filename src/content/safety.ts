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
