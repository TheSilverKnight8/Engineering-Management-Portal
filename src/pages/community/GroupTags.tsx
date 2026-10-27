import { useMemo } from 'react';
import { Link } from 'react-router';
import { Users } from 'lucide-react';
import { useGroupMembers, useGroups } from '../../lib/queries';
import type { Group } from '../../lib/types';

/** Each member's project groups, sorted by name. Archived groups are left out. */
export function useGroupsByMember() {
  const groups = useGroups();
  const members = useGroupMembers();
  return useMemo(() => {
    const byId = new Map((groups.data ?? []).map((g) => [g.id, g]));
    const out = new Map<string, Group[]>();
    for (const m of members.data ?? []) {
      const g = byId.get(m.group_id);
      if (!g) continue;
      out.set(m.user_id, [...(out.get(m.user_id) ?? []), g]);
    }
    for (const list of out.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [groups.data, members.data]);
}

/** Group tags. Each one opens that group. */
export function GroupTags({ groups }: { groups: Group[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((g) => (
        <Link
          key={g.id}
          to={`/groups/${g.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-xs font-medium leading-none text-ink transition hover:border-navy/40"
        >
          <Users className="size-3.5 text-muted" />
          {g.name}
        </Link>
      ))}
    </div>
  );
}
