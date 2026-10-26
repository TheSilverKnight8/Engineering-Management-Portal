// ASD-STE100 (Simplified Technical English) section. Only the owner edits this file.
//
// This is a short summary for students. The exact rule wording is in the
// official standard, which ASD gives out free at asd-ste100.org.

export const steFacts = {
  name: 'ASD-STE100 Simplified Technical English',
  issue: 'Issue 9',
  published: 'January 2025',
  maintainer: 'STEMG, a working group of ASD',
  ruleCount: 53,
  url: 'https://www.asd-ste100.org/',
};

export interface SteRule {
  title: string;
  detail: string;
}

export const steRules: SteRule[] = [
  { title: 'Use approved words only', detail: 'Each approved word has one meaning and one part of speech. Use it only in that way.' },
  { title: 'One instruction in each sentence', detail: 'A procedure step tells the reader to do one thing. Two actions become two sentences.' },
  { title: 'Commands for procedures', detail: 'Start a procedure sentence with the verb: "Remove the battery."' },
  { title: 'Short sentences', detail: 'A maximum of 20 words in a procedure sentence, and 25 words in a descriptive sentence.' },
  { title: 'Active voice', detail: 'Say who or what does the action. Do not write "The blade is lowered." Write "Lower the blade."' },
  { title: 'Keep the small words', detail: 'Do not remove "the" and "a" to save space. They make the meaning clear.' },
];

export interface SteExample {
  text: string;
  tool: string;
  shows: string;
}

// Real sentences from the tool entries.
export const steExamples: SteExample[] = [
  { text: 'Set the power switch to OFF before you make adjustments.', tool: 'drill-press', shows: 'One instruction. The verb comes first. The condition comes after it.' },
  { text: 'Lower the bit slowly with the feed handle. Do not apply too much force.', tool: 'drill-press', shows: 'Two instructions, so two sentences.' },
  { text: 'Do not touch the blade after a cut. It can be hot.', tool: 'jigsaw', shows: 'The warning comes first. The reason is a separate sentence.' },
  { text: 'It drills straight holes at an exact location and depth.', tool: 'drill-press', shows: 'A descriptive sentence: present tense, active voice.' },
];
