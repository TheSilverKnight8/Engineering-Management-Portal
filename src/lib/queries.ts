// Data loading for the Supabase-backed parts of the app (inventory, groups,
// posts, moderation). Results are cached so moving between screens is instant,
// and refreshed when the app comes back into focus.

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from './supabase';
import { useAuth } from './auth';
import type { Announcement, Checkout, Group, GroupMember, InventoryItem, LogEntry, Message, Post, Profile, Report, TestAttempt, TestKey, TestQuestion, TestSection } from './types';

export const keys = {
  roster: ['roster'] as const,
  inventory: ['inventory'] as const,
  activeCheckouts: ['checkouts', 'active'] as const,
  itemCheckouts: (id: string) => ['checkouts', 'item', id] as const,
  log: (itemId?: string) => ['log', itemId ?? 'all'] as const,
  groups: ['groups'] as const,
  groupMembers: ['group_members'] as const,
  messages: (groupId: string) => ['messages', groupId] as const,
  posts: ['posts'] as const,
  announcements: ['announcements'] as const,
  announcementsSeen: ['announcement_reads'] as const,
  reports: ['reports'] as const,
  joinCode: ['join_code'] as const,
  safetyTest: ['safety_test'] as const,
  testKeys: ['test_keys'] as const,
  attempts: (who: 'mine' | 'all') => ['test_attempts', who] as const,
};

/** True when signed in and in the class, so Supabase queries can run. */
export function useLive() {
  return useAuth().status === 'ready';
}

async function run<T>(promise: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return data as T;
}

export function useRoster() {
  const live = useLive();
  const q = useQuery({
    queryKey: keys.roster,
    enabled: live,
    staleTime: 5 * 60_000,
    queryFn: () => run<Profile[]>(db().from('profiles').select('*').order('full_name')),
  });
  const byId = useMemo(() => new Map((q.data ?? []).map((p) => [p.id, p])), [q.data]);
  return { ...q, byId };
}

export function useInventory() {
  const live = useLive();
  return useQuery({
    queryKey: keys.inventory,
    enabled: live,
    queryFn: () => run<InventoryItem[]>(db().from('inventory_items').select('*').order('name')),
  });
}

/** Checkouts that have not ended and were not canceled. */
export function useActiveCheckouts() {
  const live = useLive();
  return useQuery({
    queryKey: keys.activeCheckouts,
    enabled: live,
    refetchInterval: 60_000,
    queryFn: () =>
      run<Checkout[]>(
        db().from('checkouts').select('*').is('canceled_at', null).gt('ends_at', new Date().toISOString()).order('starts_at'),
      ),
  });
}

export function useItemCheckouts(itemId: string) {
  const live = useLive();
  return useQuery({
    queryKey: keys.itemCheckouts(itemId),
    enabled: live,
    queryFn: () =>
      run<Checkout[]>(db().from('checkouts').select('*').eq('item_id', itemId).order('starts_at', { ascending: false }).limit(30)),
  });
}

export function useLog(itemId?: string, limit = 100) {
  const live = useLive();
  return useQuery({
    queryKey: [...keys.log(itemId), limit],
    enabled: live,
    queryFn: () => {
      let q = db().from('inventory_log').select('*').order('at', { ascending: false }).limit(limit);
      if (itemId) q = q.eq('item_id', itemId);
      return run<LogEntry[]>(q);
    },
  });
}

export function useGroups() {
  const live = useLive();
  return useQuery({
    queryKey: keys.groups,
    enabled: live,
    queryFn: () => run<Group[]>(db().from('groups').select('*').is('archived_at', null).order('created_at', { ascending: false })),
  });
}

export function useGroupMembers() {
  const live = useLive();
  return useQuery({
    queryKey: keys.groupMembers,
    enabled: live,
    queryFn: () => run<GroupMember[]>(db().from('group_members').select('*')),
  });
}

/** The last 200 messages in a group's channel, kept current with Supabase Realtime. */
export function useMessages(groupId: string, enabled: boolean) {
  const live = useLive();
  const qc = useQueryClient();
  const key = keys.messages(groupId);

  const q = useQuery({
    queryKey: key,
    enabled: live && enabled,
    queryFn: async () => {
      const rows = await run<Message[]>(
        db().from('messages').select('*').eq('group_id', groupId).order('created_at', { ascending: false }).limit(200),
      );
      return rows.reverse();
    },
  });

  useEffect(() => {
    if (!live || !enabled) return;
    const channel = db()
      .channel(`messages:${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        const msg = payload.new as Message;
        qc.setQueryData<Message[]>(key, (old) => (old && !old.some((m) => m.id === msg.id) ? [...old, msg] : old));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        const msg = payload.new as Message;
        qc.setQueryData<Message[]>(key, (old) => old?.map((m) => (m.id === msg.id ? msg : m)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const id = (payload.old as Partial<Message>).id;
        qc.setQueryData<Message[]>(key, (old) => old?.filter((m) => m.id !== id));
      })
      .subscribe();
    return () => {
      void db().removeChannel(channel);
    };
  }, [live, enabled, groupId, qc]);

  return q;
}

export function usePosts() {
  const live = useLive();
  return useQuery({
    queryKey: keys.posts,
    enabled: live,
    queryFn: () => run<Post[]>(db().from('posts').select('*').order('created_at', { ascending: false }).limit(100)),
  });
}

export function useAnnouncements() {
  const live = useLive();
  return useQuery({
    queryKey: keys.announcements,
    enabled: live,
    queryFn: () => run<Announcement[]>(db().from('announcements').select('*').order('created_at', { ascending: false }).limit(100)),
  });
}

/** Refreshes announcements as soon as a new one is added, so the alert bell updates live. */
export function useAnnouncementsLive() {
  const live = useLive();
  const qc = useQueryClient();
  useEffect(() => {
    if (!live) return;
    const channel = db()
      .channel('announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
        void qc.invalidateQueries({ queryKey: keys.announcements });
      })
      .subscribe();
    return () => {
      void db().removeChannel(channel);
    };
  }, [live, qc]);
}

/** When the signed-in member last opened Announcements. Before the first visit, the day they joined. */
export function useAnnouncementsSeen() {
  const live = useLive();
  const { profile } = useAuth();
  const q = useQuery({
    queryKey: keys.announcementsSeen,
    enabled: live,
    queryFn: () => run<{ seen_at: string }[]>(db().from('announcement_reads').select('seen_at')),
  });
  return q.data ? (q.data[0]?.seen_at ?? profile?.created_at ?? null) : null;
}

/** Announcements for the alert bell: new since the last visit, not written by me, and not "joined". */
export function useUnreadAnnouncements() {
  const { profile } = useAuth();
  const announcements = useAnnouncements();
  const seen = useAnnouncementsSeen();
  if (!seen || !profile) return 0;
  return (announcements.data ?? []).filter((a) => a.kind !== 'joined' && !a.removed_at && a.author_id !== profile.id && new Date(a.created_at) > new Date(seen)).length;
}

export function useReports(enabled: boolean) {
  const live = useLive();
  return useQuery({
    queryKey: keys.reports,
    enabled: live && enabled,
    queryFn: () => run<Report[]>(db().from('reports').select('*').order('created_at', { ascending: false }).limit(100)),
  });
}

export function useJoinCode(enabled: boolean) {
  const live = useLive();
  return useQuery({
    queryKey: keys.joinCode,
    enabled: live && enabled,
    queryFn: async () => {
      const rows = await run<{ join_code: string }[]>(db().from('class_settings').select('join_code'));
      return rows[0]?.join_code ?? null;
    },
  });
}

export type TestSectionWithQuestions = TestSection & { questions: TestQuestion[] };

/** The safety test's sections and questions in order, without the answer key. */
export function useSafetyTest() {
  const live = useLive();
  return useQuery({
    queryKey: keys.safetyTest,
    enabled: live,
    queryFn: async (): Promise<TestSectionWithQuestions[]> => {
      const [sections, questions] = await Promise.all([
        run<TestSection[]>(db().from('test_sections').select('*').order('position')),
        run<TestQuestion[]>(db().from('test_questions').select('*').order('position')),
      ]);
      return sections.map((s) => ({ ...s, questions: questions.filter((q) => q.section_id === s.id) }));
    },
  });
}

/** The answer key, by question id. The database only returns it to teachers and the developer. */
export function useTestKeys(enabled: boolean) {
  const live = useLive();
  const q = useQuery({
    queryKey: keys.testKeys,
    enabled: live && enabled,
    queryFn: () => run<TestKey[]>(db().from('test_keys').select('*')),
  });
  const byId = useMemo(() => new Map((q.data ?? []).map((k) => [k.question_id, k])), [q.data]);
  return { ...q, byId };
}

/** The signed-in member's own attempts, newest first. */
export function useMyAttempts() {
  const live = useLive();
  const { profile } = useAuth();
  return useQuery({
    queryKey: keys.attempts('mine'),
    enabled: live && !!profile,
    queryFn: () => run<TestAttempt[]>(db().from('test_attempts').select('*').eq('user_id', profile!.id).order('submitted_at', { ascending: false })),
  });
}

/** Every attempt, newest first. Only teachers and the developer get rows. */
export function useAllAttempts(enabled: boolean) {
  const live = useLive();
  return useQuery({
    queryKey: keys.attempts('all'),
    enabled: live && enabled,
    queryFn: () => run<TestAttempt[]>(db().from('test_attempts').select('*').order('submitted_at', { ascending: false })),
  });
}

