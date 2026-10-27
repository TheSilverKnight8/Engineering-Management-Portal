import { NavLink } from 'react-router';
import { cx } from '../../components/ui';

export function CommunityTabs() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    cx('rounded-lg px-3.5 py-1.5 text-sm font-medium transition', isActive ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink');
  return (
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
    </div>
  );
}
