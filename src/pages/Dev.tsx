import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserMinus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useRoster, keys } from '../lib/queries';
import type { MemberRole, Profile } from '../lib/types';
import { db } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { formatDate } from '../lib/time';
import { tools } from '../content/tools';
import { projects } from '../content/projects';
import { PageHeader } from '../components/PageHeader';
import { Avatar, Button, Card, Input, LoadingBlock, RoleBadges, SectionTitle, Select } from '../components/ui';
import { JoinCodeCard } from './JoinCodeCard';
import NotFound from './NotFound';

// Developer page: only the owner (is_dev) sees it. The owner decides who the
// mod students are and who has the teacher role.
export default function Dev() {
  const { profile } = useAuth();
  const roster = useRoster();
  const [q, setQ] = useState('');
  if (!profile?.is_dev) return <NotFound />;

  const people = (roster.data ?? []).filter((p) => p.full_name.toLowerCase().includes(q.trim().toLowerCase()));
  const videos = tools.flatMap((t) => t.videos);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Developer" title="Developer" subtitle="Roles, mods, and the join code. App content is edited in the repository." />

      <JoinCodeCard />

      <section>
        <SectionTitle action={<span className="text-sm text-muted">{roster.data?.length ?? 0} members</span>}>Class members</SectionTitle>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" className="mb-3" />
        {roster.isLoading ? (
          <LoadingBlock />
        ) : (
          <Card className="divide-y divide-line">
            {people.map((p) => (
              <MemberRow key={p.id} p={p} self={p.id === profile.id} />
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>Content status</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Tool entries', tools.length],
            ['Videos added', `${videos.filter((v) => v.youtubeId).length}/${videos.length}`],
            ['Graphics added', tools.reduce((n, t) => n + t.graphics.length, 0)],
            ['Projects ready', `${projects.filter((p) => p.status === 'ready').length}/${projects.length}`],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <div className="font-display text-3xl">{value}</div>
              <div className="text-sm text-muted">{label}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function MemberRow({ p, self }: { p: Profile; self: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { refreshProfile } = useAuth();

  const setAccess = useMutation({
    mutationFn: async ({ role, isMod }: { role: MemberRole; isMod: boolean }) => {
      const { error } = await db().rpc('set_member_access', { target: p.id, new_role: role, new_is_mod: isMod });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.roster });
      if (self) void refreshProfile();
      toast(`Updated ${p.full_name}.`);
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('remove_member', { target: p.id });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.roster });
      toast(`${p.full_name} is out of the class.`);
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <Avatar name={p.full_name} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{p.full_name}</span>
          <RoleBadges role={p.role} isMod={p.is_mod} isDev={p.is_dev} />
        </div>
        <div className="text-xs text-muted">Joined {formatDate(p.created_at)}</div>
      </div>
      <Select value={p.role} onChange={(e) => setAccess.mutate({ role: e.target.value as MemberRole, isMod: p.is_mod })} wrapperClassName="w-32" className="h-9 text-sm" aria-label={`Role for ${p.full_name}`}>
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.is_mod} onChange={(e) => setAccess.mutate({ role: p.role, isMod: e.target.checked })} className="size-4 accent-[var(--accent)]" />
        Mod
      </label>
      {!self && (
        <Button size="sm" variant="ghost" onClick={() => confirm(`Remove ${p.full_name} from the class? They would need the join code to come back.`) && remove.mutate()} aria-label={`Remove ${p.full_name}`}>
          <UserMinus className="size-4" />
        </Button>
      )}
    </div>
  );
}
