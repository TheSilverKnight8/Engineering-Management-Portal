import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useRoster } from '../../lib/queries';
import { Avatar, Input, cx } from '../../components/ui';

// Choose classmates from the class roster.
export function MemberPicker({ exclude, picked, onChange }: { exclude: string[]; picked: string[]; onChange: (ids: string[]) => void }) {
  const roster = useRoster();
  const [q, setQ] = useState('');
  const people = (roster.data ?? []).filter((p) => !exclude.includes(p.id) && p.full_name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="rounded-xl border border-line">
      <div className="relative border-b border-line p-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search classmates" className="h-9 border-0 bg-transparent pl-9 focus:ring-0" />
      </div>
      <ul className="max-h-56 overflow-y-auto p-1.5">
        {people.length === 0 && <li className="p-3 text-center text-sm text-muted">No one to add.</li>}
        {people.map((p) => {
          const on = picked.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onChange(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
                className={cx('flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm transition', on ? 'bg-accent/8' : 'hover:bg-raised')}
              >
                <Avatar name={p.full_name} size={28} />
                <span className="flex-1 font-medium">{p.full_name}</span>
                <span className={cx('flex size-5 items-center justify-center rounded-md border', on ? 'border-accent bg-accent text-on-accent' : 'border-line')}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
