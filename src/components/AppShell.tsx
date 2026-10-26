import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BookOpen, GraduationCap, House, MessagesSquare, Search, ShieldCheck, Warehouse, Wrench, Settings, type LucideIcon } from 'lucide-react';
import { AppMark } from '../graphics/Icons';
import { CroswellLogo } from '../graphics/Logo';
import { APP_NAME, CLASS_NAME, SCHOOL_NAME } from '../config';
import { useAuth } from '../lib/auth';
import { canModerate } from '../lib/types';
import { useReports } from '../lib/queries';
import { Avatar, Kbd, cx } from './ui';
import { SearchPalette } from './SearchPalette';

interface NavSection {
  to: string;
  label: string;
  icon: LucideIcon;
  match: string[];
  children?: { to: string; label: string }[];
}

const sections: NavSection[] = [
  { to: '/', label: 'Home', icon: House, match: [] },
  {
    to: '/tools',
    label: 'Tools',
    icon: Wrench,
    match: ['/tools', '/picker'],
    children: [
      { to: '/picker', label: 'Tool picker' },
      { to: '/tools', label: 'Tool library' },
    ],
  },
  {
    to: '/shop',
    label: 'Shop',
    icon: Warehouse,
    match: ['/shop'],
    children: [
      { to: '/shop', label: 'Inventory' },
      { to: '/shop/log', label: 'Changelog' },
    ],
  },
  {
    to: '/learn',
    label: 'Learn',
    icon: GraduationCap,
    match: ['/learn'],
    children: [
      { to: '/learn/safety', label: 'Safety' },
      { to: '/learn/projects', label: 'Practice projects' },
      { to: '/learn/materials', label: 'Materials' },
      { to: '/learn/ste', label: 'Simplified Technical English' },
    ],
  },
  {
    to: '/community',
    label: 'Community',
    icon: MessagesSquare,
    match: ['/community', '/groups'],
    children: [
      { to: '/community', label: 'Posts' },
      { to: '/groups', label: 'Project groups' },
    ],
  },
];

function isActive(section: NavSection, path: string) {
  if (section.to === '/') return path === '/';
  return section.match.some((m) => path === m || path.startsWith(m + '/'));
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { profile, status } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const isMod = canModerate(profile);
  const reports = useReports(isMod);
  const openReports = (reports.data ?? []).filter((r) => !r.resolved_at).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Braces matter: newer browsers return a Promise from scrollTo, and React
  // would treat a returned value as a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // A group channel fills the screen like a chat app, so it skips the page stripes.
  const immersive = /^\/groups\/[^/]+$/.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col lg:pl-[17rem]">
      {/* Computer: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-line bg-surface lg:flex">
        <Link to="/" className="flex items-center gap-3 px-5 pb-4 pt-5">
          <AppMark size={38} />
          <div className="leading-tight">
            <div className="font-display text-xl uppercase leading-none tracking-wide">
              {APP_NAME}
            </div>
            <div className="text-xs text-muted">
              {SCHOOL_NAME} · {CLASS_NAME}
            </div>
          </div>
        </Link>

        <button
          onClick={() => setSearchOpen(true)}
          className="mx-4 mb-3 flex h-10 items-center gap-2 rounded-xl border border-line bg-raised px-3 text-sm text-muted transition hover:text-ink"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search</span>
          <Kbd>Ctrl K</Kbd>
        </button>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.map((s) => {
            const active = isActive(s, pathname);
            return (
              <div key={s.to} className="mb-1">
                <NavLink
                  to={s.to}
                  end={s.to === '/'}
                  className={cx(
                    'flex items-center gap-3 rounded-xl px-3 py-2 font-display text-[1.0625rem] uppercase tracking-[0.05em] transition',
                    active ? 'bg-accent text-on-accent' : 'text-ink hover:bg-raised',
                  )}
                >
                  <s.icon className="size-[1.15rem]" />
                  {s.label}
                </NavLink>
                {s.children && active && (
                  <div className="ml-[1.35rem] mt-1 space-y-0.5 border-l border-line py-1 pl-3">
                    {s.children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        end
                        className={({ isActive: a }) => cx('block rounded-lg px-2.5 py-1.5 text-sm transition', a ? 'font-medium text-ink' : 'text-muted hover:text-ink')}
                      >
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isMod && (
            <NavLink
              to="/mod"
              className={({ isActive: a }) => cx('mt-3 flex items-center gap-3 rounded-xl px-3 py-2 font-display text-[1.0625rem] uppercase tracking-[0.05em] transition', a ? 'bg-accent text-on-accent' : 'text-ink hover:bg-raised')}
            >
              <ShieldCheck className="size-[1.15rem]" />
              <span className="flex-1">Moderation</span>
              {openReports > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-bg">{openReports}</span>}
            </NavLink>
          )}
          {profile?.is_dev && (
            <NavLink
              to="/dev"
              className={({ isActive: a }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 font-display text-[1.0625rem] uppercase tracking-[0.05em] transition', a ? 'bg-accent text-on-accent' : 'text-ink hover:bg-raised')}
            >
              <Settings className="size-[1.15rem]" />
              Developer
            </NavLink>
          )}
        </nav>

        <div className="border-t border-line p-3">
          {profile ? (
            <NavLink to="/me" className={({ isActive: a }) => cx('flex items-center gap-3 rounded-xl p-2 transition', a ? 'bg-raised' : 'hover:bg-raised')}>
              <Avatar name={profile.full_name} size={36} />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium">{profile.full_name}</div>
                <div className="text-xs capitalize text-muted">{profile.role}</div>
              </div>
            </NavLink>
          ) : status === 'preview' ? (
            <div className="flex items-center gap-2 rounded-xl bg-warn/10 p-3 text-xs text-warn">
              <BookOpen className="size-4 shrink-0" />
              Content preview. Connect Supabase to sign in.
            </div>
          ) : null}
          {/* The logo stays in the bottom-left corner of every screen, as on the title slide. */}
          <CroswellLogo className="mx-2 mb-1 mt-4 w-[13rem] text-ink" />
        </div>
      </aside>

      {/* Phone: top bar */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <AppMark size={30} />
            <span className="whitespace-nowrap font-display text-[1.1875rem] uppercase leading-none tracking-wide">
              {APP_NAME}
            </span>
          </Link>
          <div className="flex-1" />
          <button onClick={() => setSearchOpen(true)} className="rounded-full p-2 text-muted hover:bg-raised hover:text-ink" aria-label="Search">
            <Search className="size-5" />
          </button>
          {isMod && (
            <Link to="/mod" className="relative rounded-full p-2 text-muted hover:bg-raised hover:text-ink" aria-label="Moderation">
              <ShieldCheck className="size-5" />
              {openReports > 0 && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-danger ring-2 ring-bg" />}
            </Link>
          )}
          {profile && (
            <Link to="/me" aria-label="Your profile">
              <Avatar name={profile.full_name} size={32} />
            </Link>
          )}
        </div>
      </header>

      {!immersive && <div className="stripes stripes-tl mt-3 lg:mt-5" aria-hidden />}
      <main className={cx('mx-auto w-full max-w-6xl flex-1 px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8', immersive ? 'pb-0' : 'pb-10 lg:pb-14')}>{children}</main>
      {!immersive && (
        <footer className="mb-5">
          {/* Phones: the bars have no room, so the logo sits at the bottom-left of every page.
              Computers show it in the sidebar instead. */}
          <CroswellLogo className="mb-5 ml-4 w-44 text-ink sm:ml-6 lg:hidden" />
          <div className="stripes stripes-br" aria-hidden />
        </footer>
      )}
      {/* Room for the phone tab bar. */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />

      {/* Phone: bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {sections.map((s) => {
            const active = isActive(s, pathname);
            return (
              <Link key={s.to} to={s.to} className="relative flex flex-col items-center justify-center gap-1" aria-current={active ? 'page' : undefined}>
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
                <s.icon className={cx('size-[1.35rem] transition', active ? 'text-accent' : 'text-muted')} strokeWidth={active ? 2.3 : 1.9} />
                <span className={cx('font-display text-[0.75rem] uppercase tracking-[0.06em]', active ? 'text-ink' : 'text-muted')}>{s.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
