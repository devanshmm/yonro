import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import {
  House,
  ListTodo,
  Timer,
  ChartNoAxesCombined,
  Settings2,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { useProductivity } from '@/stores/productivity';
import { useFocus } from '@/stores/focus';
import { useResources } from '@/stores/resources';
import { useTimerClock } from './FocusTimer';
import { Button } from './ui/button';
import { ErrorState, LoadingState } from './common';
import { errorMessage, dateLabel } from '@/lib/utils';
const links = [
  { to: '/', label: 'Home', icon: House },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];
export function Sidebar({ open, close }) {
  const user = useAuth((s) => s.user),
    logout = useAuth((s) => s.logout),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function signOut() {
    const state = useFocus.getState();
    if (
      (state.phase === 'running' || state.phase === 'paused' || state.pending) &&
      !confirm('Log out and discard your current focus session?')
    )
      return;
    setBusy(true);
    try {
      await logout();
      state.reset();
      useProductivity.getState().clear();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'visible' : ''}`} onClick={close} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/" className="brand" onClick={close}>
          <span className="brand-mark">
            L<span />
          </span>
          LOCKIN<span className="brand-period">.</span>
        </NavLink>
        <button className="mobile-close" aria-label="Close menu" onClick={close}>
          <X size={20} />
        </button>
        <div className="workspace-tag">
          <span className="status-dot" /> PERSONAL WORKSPACE
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={close}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === 'Home' && <span className="nav-active-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={20} />
          <h3>
            Small steps.
            <br />
            Real momentum.
          </h3>
          <p>
            Show up for yourself today.
            <br />
            The rest will follow.
          </p>
          <NavLink to="/focus" onClick={close}>
            Find your focus
            <ArrowUpRight size={15} />
          </NavLink>
        </div>
        <div className="profile">
          <div className="avatar">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>@{user.username}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            onClick={signOut}
            disabled={busy}
          >
            <LogOut size={17} />
          </Button>
        </div>
        {error && <ErrorState error={error} />}
      </aside>
    </>
  );
}
export function TopBar({ openMenu }) {
  const location = useLocation(),
    date = useProductivity((s) => s.today?.productivityDate),
    page = links.find((l) => l.to === location.pathname)?.label || 'Workspace';
  return (
    <header className="topbar">
      <div>
        <button className="mobile-menu" aria-label="Open menu" onClick={openMenu}>
          <Menu size={20} />
        </button>
        <span className="breadcrumb-brand">Workspace</span>
        <ChevronRight size={13} />
        <span>{page}</span>
      </div>
      <div className="topbar-right">
        <span className="status-dot" />
        <span>
          {date
            ? dateLabel(date, { weekday: 'long', month: 'short', day: 'numeric' })
            : 'Your daily workspace'}
        </span>
        <span className="phase-badge">PHASE 01</span>
      </div>
    </header>
  );
}
export function Layout() {
  const user = useAuth((s) => s.user),
    ready = useAuth((s) => s.ready),
    refresh = useProductivity((s) => s.refresh),
    today = useProductivity((s) => s.today),
    [open, setOpen] = useState(false);
  const userId = user?.id;
  useTimerClock();
  useEffect(() => {
    if (!userId) return;
    useFocus.getState().bindUser(userId);
    void refresh();
    const interval = setInterval(refresh, 60000);
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [userId, refresh]);
  useEffect(() => {
    if (!today?.dayEndsAt) return;
    const ms = Math.max(100, Date.parse(today.dayEndsAt) - Date.now() + 100);
    const timeout = setTimeout(() => {
      useResources.getState().invalidate();
      void refresh();
    }, Math.min(ms, 2147483647));
    return () => clearTimeout(timeout);
  }, [today?.dayEndsAt, refresh]);
  if (!ready) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Sidebar open={open} close={() => setOpen(false)} />
      <div className="main-shell">
        <TopBar openMenu={() => setOpen(true)} />
        <main>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>A little better, every day.</span>
          <span>
            LOCKIN <span className="text-primary">✦</span> BUILT FOR YOUR PROGRESS
          </span>
        </footer>
      </div>
    </div>
  );
}
