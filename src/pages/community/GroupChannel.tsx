import { Fragment, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Flag, LogOut, RotateCcw, Send, ShieldOff, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import { useAuth, useMe } from '../../lib/auth';
import { useGroupMembers, useGroups, useMessages, useRoster, keys } from '../../lib/queries';
import { canModerate, type Message } from '../../lib/types';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { dayLabel, formatTime } from '../../lib/time';
import { Sheet } from '../../components/Sheet';
import { Avatar, Button, LoadingBlock, cx } from '../../components/ui';
import { MemberPicker } from './MemberPicker';
import { ReportSheet } from './ReportSheet';
import NotFound from '../NotFound';

export default function GroupChannel() {
  const { id = '' } = useParams();
  const me = useMe();
  const { profile } = useAuth();
  const isMod = canModerate(profile);
  const groups = useGroups();
  const members = useGroupMembers();
  const roster = useRoster();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [showMembers, setShowMembers] = useState(false);
  const [reporting, setReporting] = useState<{ type: 'message'; id: string } | null>(null);

  const group = groups.data?.find((g) => g.id === id);
  const groupMembers = (members.data ?? []).filter((m) => m.group_id === id);
  const isMember = groupMembers.some((m) => m.user_id === me.id);
  const messages = useMessages(id, isMember || isMod);
  const name = (uid: string | null) => (uid && roster.byId.get(uid)?.full_name) || 'Former member';

  const invalidateMembers = () => void qc.invalidateQueries({ queryKey: keys.groupMembers });

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await db().from('group_members').insert({ group_id: id, user_id: me.id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateMembers();
      void qc.invalidateQueries({ queryKey: keys.messages(id) });
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const leave = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db().from('group_members').delete().eq('group_id', id).eq('user_id', userId);
      if (error) throw error;
      return userId;
    },
    onSuccess: (userId) => {
      invalidateMembers();
      if (userId === me.id) {
        toast('You left the group.');
        navigate('/groups');
      }
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  if (groups.isLoading || members.isLoading) return <LoadingBlock />;
  if (!group) return <NotFound what="group" />;

  return (
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-4rem-env(safe-area-inset-bottom)-1.25rem)] flex-col lg:h-[calc(100dvh-2rem)]">
      <div className="flex shrink-0 items-center gap-3 border-b border-line pb-3">
        <Link to="/groups" className="-ml-1 rounded-full p-1.5 text-muted hover:bg-raised hover:text-ink" aria-label="Back to groups">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">{group.name}</h1>
          {group.description && <p className="truncate text-xs text-muted">{group.description}</p>}
        </div>
        <button onClick={() => setShowMembers(true)} className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5 text-sm hover:bg-raised">
          <div className="flex -space-x-1.5">
            {groupMembers.slice(0, 3).map((m) => (
              <span key={m.user_id} className="rounded-full ring-2 ring-bg">
                <Avatar name={name(m.user_id)} size={22} />
              </span>
            ))}
          </div>
          <span className="hidden sm:inline">{groupMembers.length} members</span>
          <Users className="size-4 sm:hidden" />
        </button>
      </div>

      {!isMember && !isMod ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-navy/10 text-navy">
            <Users className="size-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Join {group.name} to read the channel</h2>
            <p className="text-sm text-muted">Only group members can read and post here.</p>
          </div>
          <Button variant="primary" onClick={() => join.mutate()} loading={join.isPending}>
            Join group
          </Button>
        </div>
      ) : (
        <>
          {!isMember && isMod && (
            <div className="mt-3 shrink-0 rounded-xl bg-navy/8 px-3 py-2 text-xs text-navy">You are viewing this channel as a moderator. You are not a member.</div>
          )}
          <MessageList
            messages={messages.data ?? []}
            loading={messages.isLoading}
            meId={me.id}
            isMod={isMod}
            name={name}
            groupId={id}
            onReport={(mid) => setReporting({ type: 'message', id: mid })}
          />
          {isMember && <Composer groupId={id} />}
        </>
      )}

      <Sheet open={showMembers} onClose={() => setShowMembers(false)} title={`${group.name} members`}>
        <ul className="mb-5 divide-y divide-line rounded-xl border border-line">
          {groupMembers.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 p-3">
              <Avatar name={name(m.user_id)} size={32} />
              <span className="flex-1 text-sm font-medium">
                {name(m.user_id)}
                {m.user_id === me.id && <span className="text-muted"> (you)</span>}
              </span>
              {m.user_id === me.id ? (
                <Button size="sm" variant="ghost" onClick={() => confirm(`Leave ${group.name}?`) && leave.mutate(me.id)}>
                  <LogOut className="size-4" />
                  Leave
                </Button>
              ) : (
                (isMember || isMod) && (
                  <Button size="sm" variant="ghost" onClick={() => confirm(`Remove ${name(m.user_id)} from ${group.name}?`) && leave.mutate(m.user_id)} aria-label={`Remove ${name(m.user_id)}`}>
                    <UserMinus className="size-4" />
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
        {(isMember || isMod) && <AddMembers groupId={id} existing={groupMembers.map((m) => m.user_id)} onDone={invalidateMembers} />}
        {!isMember && (
          <Button variant="primary" className="w-full" onClick={() => join.mutate()} loading={join.isPending}>
            Join this group
          </Button>
        )}
      </Sheet>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}

function AddMembers({ groupId, existing, onDone }: { groupId: string; existing: string[]; onDone: () => void }) {
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await db()
        .from('group_members')
        .insert(picked.map((user_id) => ({ group_id: groupId, user_id })));
      if (error) throw error;
    },
    onSuccess: () => {
      setPicked([]);
      onDone();
      toast('Added.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <UserPlus className="size-4" /> Add classmates
      </div>
      <MemberPicker exclude={existing} picked={picked} onChange={setPicked} />
      <Button className="mt-3 w-full" variant="primary" disabled={picked.length === 0} loading={add.isPending} onClick={() => add.mutate()}>
        Add {picked.length || ''}
      </Button>
    </div>
  );
}

function MessageList({ messages, loading, meId, isMod, name, groupId, onReport }: { messages: Message[]; loading: boolean; meId: string; isMod: boolean; name: (id: string | null) => string; groupId: string; onReport: (id: string) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Stay at the bottom as new messages arrive, unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('messages').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => qc.setQueryData<Message[]>(keys.messages(groupId), (old) => old?.filter((m) => m.id !== id)),
    onError: (e) => toast(friendlyError(e), 'error'),
  });
  const moderate = useMutation({
    mutationFn: async ({ id, remove }: { id: string; remove: boolean }) => {
      const { error } = await db().rpc('moderate_content', { target_type: 'message', target_id: id, remove });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.messages(groupId) });
      void qc.invalidateQueries({ queryKey: keys.reports });
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  if (loading) return <LoadingBlock />;

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="flex-1 overflow-y-auto py-4"
    >
      {messages.length === 0 && <div className="flex h-full items-center justify-center text-sm text-muted">No messages yet. Say hello.</div>}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || dayLabel(new Date(prev.created_at)) !== dayLabel(new Date(m.created_at));
        const grouped = !newDay && prev.author_id === m.author_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
        const mine = m.author_id === meId;
        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="label-caps text-muted">{dayLabel(new Date(m.created_at))}</span>
                <div className="h-px flex-1 bg-line" />
              </div>
            )}
            {/* tabIndex lets a tap on a phone reveal the message actions. */}
            <div tabIndex={0} className={cx('group relative flex gap-3 rounded-lg px-2 py-0.5 outline-none hover:bg-raised/60 focus:bg-raised/60', !grouped && 'mt-3', m.removed_at && 'opacity-60')}>
              <div className="w-9 shrink-0">{!grouped && <Avatar name={name(m.author_id)} size={36} />}</div>
              <div className="min-w-0 flex-1">
                {!grouped && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{name(m.author_id)}</span>
                    <span className="text-xs text-muted">{formatTime(new Date(m.created_at))}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed">{m.body}</p>
                {m.removed_at && <div className="text-xs font-medium text-danger">Removed by a moderator. Only moderators see this.</div>}
              </div>
              <div className="absolute right-2 top-0 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-card group-hover:flex group-focus-within:flex">
                {mine && (
                  <button onClick={() => del.mutate(m.id)} className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-danger" aria-label="Delete message">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                {!mine && !m.removed_at && (
                  <button onClick={() => onReport(m.id)} className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-ink" aria-label="Report message">
                    <Flag className="size-3.5" />
                  </button>
                )}
                {isMod && !mine && (
                  <button onClick={() => moderate.mutate({ id: m.id, remove: !m.removed_at })} className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-ink" aria-label={m.removed_at ? 'Restore message' : 'Remove message'}>
                    {m.removed_at ? <RotateCcw className="size-3.5" /> : <ShieldOff className="size-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function Composer({ groupId }: { groupId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await db().from('messages').insert({ group_id: groupId, body }).select().single();
      if (error) throw error;
      return data as Message;
    },
    onSuccess: (msg) => qc.setQueryData<Message[]>(keys.messages(groupId), (old) => (old && !old.some((m) => m.id === msg.id) ? [...old, msg] : old)),
    onError: (e, body) => {
      setText(body);
      toast(friendlyError(e), 'error');
    },
  });

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    send.mutate(body);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-line py-3">
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-1.5 focus-within:border-navy focus-within:ring-3 focus-within:ring-navy/15">
        <textarea
          ref={area}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          maxLength={2000}
          placeholder="Message the group"
          className="max-h-40 flex-1 resize-none bg-transparent px-2.5 py-2 text-[0.9375rem] outline-none placeholder:text-muted"
        />
        <button type="submit" disabled={!text.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent transition disabled:opacity-40" aria-label="Send">
          <Send className="size-4" />
        </button>
      </div>
    </form>
  );
}
