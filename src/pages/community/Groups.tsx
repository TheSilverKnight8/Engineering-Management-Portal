import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare, Plus, Users } from 'lucide-react';
import { useMe } from '../../lib/auth';
import { useGroupMembers, useGroups, useRoster, keys } from '../../lib/queries';
import type { Group } from '../../lib/types';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { PageHeader } from '../../components/PageHeader';
import { Sheet } from '../../components/Sheet';
import { Avatar, Button, EmptyState, Field, Input, LoadingBlock, Textarea } from '../../components/ui';
import { CommunityTabs } from './CommunityTabs';
import { MemberPicker } from './MemberPicker';

export default function Groups() {
  const me = useMe();
  const groups = useGroups();
  const members = useGroupMembers();
  const roster = useRoster();
  const [creating, setCreating] = useState(false);

  const membersOf = (gid: string) => (members.data ?? []).filter((m) => m.group_id === gid);
  const { mine, others } = useMemo(() => {
    const all = groups.data ?? [];
    const isMine = (g: Group) => (members.data ?? []).some((m) => m.group_id === g.id && m.user_id === me.id);
    return { mine: all.filter(isMine), others: all.filter((g) => !isMine(g)) };
  }, [groups.data, members.data, me.id]);

  const card = (g: Group, member: boolean) => {
    const ms = membersOf(g.id);
    return (
      <Link key={g.id} to={`/groups/${g.id}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue/12 text-blue">
            <MessagesSquare className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{g.name}</h3>
            <div className="text-xs text-muted">
              {ms.length} {ms.length === 1 ? 'member' : 'members'}
            </div>
          </div>
        </div>
        {g.description && <p className="mb-3 line-clamp-2 text-sm text-muted">{g.description}</p>}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex -space-x-2">
            {ms.slice(0, 6).map((m) => (
              <span key={m.user_id} className="rounded-full ring-2 ring-surface">
                <Avatar name={roster.byId.get(m.user_id)?.full_name ?? '?'} size={28} />
              </span>
            ))}
          </div>
          <span className="text-sm font-medium text-blue">{member ? 'Open channel' : 'View'}</span>
        </div>
      </Link>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title="Project groups"
        subtitle="Each group has its own text channel. Anyone in the class can start a group or join one."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New group
          </Button>
        }
      />
      <div className="mb-6">
        <CommunityTabs />
      </div>

      {groups.isLoading ? (
        <LoadingBlock />
      ) : (groups.data ?? []).length === 0 ? (
        <EmptyState art={<Users className="size-10" />} title="No groups yet" action={<Button onClick={() => setCreating(true)}>Start a group</Button>}>
          Start a group for your project and add your teammates.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {mine.length > 0 && (
            <section>
              <h2 className="label-mono mb-3 text-muted">Your groups</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mine.map((g) => card(g, true))}</div>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h2 className="label-mono mb-3 text-muted">Other groups</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{others.map((g) => card(g, false))}</div>
            </section>
          )}
        </div>
      )}

      <NewGroupSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await db().from('groups').insert({ name: name.trim(), description: description.trim() || null }).select().single();
      if (error) throw error;
      const g = data as Group;
      const others = picked.filter((id) => id !== me.id);
      if (others.length) {
        const { error: e2 } = await db()
          .from('group_members')
          .insert(others.map((user_id) => ({ group_id: g.id, user_id })));
        if (e2) throw e2;
      }
      return g;
    },
    onSuccess: (g) => {
      void qc.invalidateQueries({ queryKey: keys.groups });
      void qc.invalidateQueries({ queryKey: keys.groupMembers });
      setName('');
      setDescription('');
      setPicked([]);
      onClose();
      navigate(`/groups/${g.id}`);
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) create.mutate();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New project group"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="group-form" loading={create.isPending} disabled={!name.trim()}>
            Create group
          </Button>
        </div>
      }
    >
      <form id="group-form" onSubmit={submit} className="space-y-4 pt-1">
        <Field label="Group name" htmlFor="gname">
          <Input id="gname" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Bridge Team" />
        </Field>
        <Field label="What is the project?" htmlFor="gdesc">
          <Textarea id="gdesc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="min-h-16" />
        </Field>
        <Field label="Add teammates">
          <MemberPicker exclude={[me.id]} picked={picked} onChange={setPicked} />
        </Field>
      </form>
    </Sheet>
  );
}
