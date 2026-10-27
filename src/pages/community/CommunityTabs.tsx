import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router';
import { cx } from '../../components/ui';

// The tabs scroll sideways on narrow phones, where four do not fit. The
// current tab is scrolled into view so it is never cut off.
export function CommunityTabs() {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current;
    const current = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && current) el.scrollLeft = Math.max(0, current.offsetLeft + current.offsetWidth - el.clientWidth + 8);
  }, []);
  const tab = ({ isActive }: { isActive: boolean }) =>
    cx('shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition', isActive ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink');
  return (
    <div ref={row} className="scrollbar-none max-w-full overflow-x-auto">
      <div className="inline-flex rounded-xl border border-line bg-raised p-1">
        <NavLink to="/community" end className={tab}>
          Posts
        </NavLink>
        <NavLink to="/groups" className={tab}>
          Project groups
        </NavLink>
        <NavLink to="/community/announcements" className={tab}>
          Announcements
        </NavLink>
        <NavLink to="/community/roster" className={tab}>
          Roster
        </NavLink>
      </div>
    </div>
  );
}
