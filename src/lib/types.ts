// Row shapes for the Supabase tables in supabase/migrations/0001_schema.sql.

export type MemberRole = 'student' | 'teacher';

export interface Profile {
  id: string;
  full_name: string;
  role: MemberRole;
  is_mod: boolean;
  is_dev: boolean;
  created_at: string;
  /** Set when the member passes the Tool Safety Checkpoint. */
  safety_passed_at: string | null;
}

export type ToolStatus = 'operational' | 'needs_maintenance';

export interface InventoryItem {
  id: string;
  name: string;
  tool_slug: string | null;
  location: string | null;
  status: ToolStatus;
  status_note: string | null;
  notes: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface Checkout {
  id: string;
  item_id: string;
  user_id: string;
  borrower: string;
  note: string | null;
  starts_at: string;
  ends_at: string;
  returned_at: string | null;
  canceled_at: string | null;
  created_at: string;
}

export interface LogEntry {
  id: number;
  at: string;
  actor_id: string | null;
  actor_name: string | null;
  item_id: string | null;
  item_name: string | null;
  checkout_id: string | null;
  action:
    | 'item.created'
    | 'item.updated'
    | 'item.archived'
    | 'item.restored'
    | 'checkout.created'
    | 'checkout.updated'
    | 'checkout.returned'
    | 'checkout.canceled';
  changes: Record<string, { from: unknown; to: unknown }> | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  added_by: string | null;
  joined_at: string;
}

export interface Message {
  id: string;
  group_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  removed_at: string | null;
  removed_by: string | null;
}

export type PostKind = 'paper' | 'competition' | 'build';

export interface Post {
  id: string;
  author_id: string | null;
  kind: PostKind;
  title: string;
  body: string | null;
  link_url: string | null;
  deadline: string | null;
  image_paths: string[];
  created_at: string;
  updated_at: string;
  removed_at: string | null;
  removed_by: string | null;
}

/** Posted by a teacher or the developer, or added by the database when someone joins (joined_id). */
export interface Announcement {
  id: string;
  author_id: string | null;
  joined_id: string | null;
  title: string | null;
  body: string | null;
  link_url: string | null;
  image_paths: string[];
  created_at: string;
  updated_at: string;
  removed_at: string | null;
  removed_by: string | null;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  target_type: 'post' | 'message' | 'announcement';
  target_id: string;
  reason: string | null;
  snapshot: {
    title?: string;
    body?: string | null;
    link_url?: string | null;
    author_id?: string | null;
    author_name?: string | null;
    group_id?: string;
    group_name?: string;
  } | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution: 'removed' | 'dismissed' | null;
}

export const canModerate = (p: Profile | null | undefined) => !!p && (p.role === 'teacher' || p.is_mod || p.is_dev);
export const canSeeJoinCode = (p: Profile | null | undefined) => !!p && (p.role === 'teacher' || p.is_dev);
export const canAnnounce = (p: Profile | null | undefined) => !!p && (p.role === 'teacher' || p.is_dev);
/** Edit the safety test, read every attempt, and mark attempts as passed. */
export const canManageTest = (p: Profile | null | undefined) => !!p && (p.role === 'teacher' || p.is_dev);

// The Tool Safety Checkpoint (supabase/migrations/0006_safety_test.sql).
export interface TestSection {
  id: string;
  position: number;
  title: string;
  description: string | null;
}

export interface TestQuestion {
  id: string;
  section_id: string;
  position: number;
  kind: 'choice' | 'written';
  prompt: string;
  image_path: string | null;
  options: string[];
}

export interface KeywordGroup {
  label: string;
  keywords: string[];
}

/** The answer key. Only teachers and the developer can read it. */
export interface TestKey {
  question_id: string;
  answer: string | null;
  keyword_groups: KeywordGroup[];
  rubric: string | null;
}

export interface TestResult {
  question_id: string;
  prompt: string;
  kind: 'choice' | 'written';
  earned: number;
  possible: number;
}

export interface TestAttempt {
  id: string;
  user_id: string;
  period: string;
  submitted_at: string;
  responses: Record<string, string>;
  results: TestResult[];
  score: number;
  possible: number;
  passed: boolean;
  passed_by: string | null;
  passed_by_teacher_at: string | null;
}
