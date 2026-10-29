import { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { useGroupMembers, useGroups, useRoster } from '../../lib/queries';
import { formatDate } from '../../lib/time';
import { PageHeader } from '../../components/PageHeader';
import { Avatar, Card, Chip, EmptyState, Input, LoadingBlock, RoleBadges, Select } from '../../components/ui';
import { CommunityTabs } from './CommunityTabs';
import { GroupTags, useGroupsByMember } from './GroupTags';

export default function Roster() {
  const roster = useRoster();
  const groups = useGroups();
  const members = useGroupMembers();
  const groupsOf = useGroupsByMember();
  const [q, setQ] = useState('');
  const [groupId, setGroupId] = useState('');

  const all = roster.data ?? [];
  // Teachers first, then everyone A to Z by first name.
  const people = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const inGroup = groupId ? new Set((members.data ?? []).filter((m) => m.group_id === groupId).map((m) => m.user_id)) : null;
    return all
      .filter((p) => (!needle || p.full_name.toLowerCase().includes(needle)) && (!inGroup || inGroup.has(p.id)))
      .sort((a, b) => Number(b.role === 'teacher') - Number(a.role === 'teacher') || a.full_name.localeCompare(b.full_name));
  }, [all, q, groupId, members.data]);

  return (
    <div>
      <PageHeader eyebrow="Community" title="Roster" subtitle="Everyone in the class, their role, and their project groups." />
      <div className="mb-5">
        <CommunityTabs />
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search by name" className="pl-10" />
          </div>
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Filter by group" wrapperClassName="sm:w-60">
            <option value="">All groups</option>
            {(groups.data ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <p className="mb-3 text-sm text-muted">
          {people.length === all.length ? `${all.length} ${all.length === 1 ? 'member' : 'members'}` : `${people.length} of ${all.length} members`}
        </p>

        {roster.isLoading ? (
          <LoadingBlock />
        ) : people.length === 0 ? (
          <EmptyState title="No one matches">Try a different name or group.</EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {people.map((p) => {
              const theirGroups = groupsOf.get(p.id) ?? [];
              return (
                <div key={p.id} className="flex gap-3 p-4">
                  <Avatar name={p.full_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{p.full_name}</span>
                      <RoleBadges role={p.role} isMod={p.is_mod} isDev={p.is_dev} />
                      {p.safety_passed_at && (
                        <Chip tone="ok" icon={<ShieldCheck className="size-3.5" />}>
                          Safety passed
                        </Chip>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">Joined {formatDate(p.created_at)}</div>
                    {theirGroups.length > 0 && (
                      <div className="mt-2.5">
                        <GroupTags groups={theirGroups} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
