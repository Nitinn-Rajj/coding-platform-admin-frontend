import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Trophy,
  Users,
  UsersRound,
  ClipboardCheck,
  ScrollText,
  Sun,
  Moon,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store';

/* ─── Navigation Items ─── */
interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Problems', to: '/problems', icon: <FileText size={18} /> },
  { label: 'Contests', to: '/contests', icon: <Trophy size={18} /> },
  { label: 'Groups', to: '/groups', icon: <UsersRound size={18} /> },
  { label: 'Submissions', to: '/submissions', icon: <ClipboardCheck size={18} /> },
  { label: 'Users', to: '/users', icon: <Users size={18} />, roles: ['admin'] },
  { label: 'Audit Log', to: '/audit-log', icon: <ScrollText size={18} />, roles: ['admin'] },
];

/* ─── Theme hook ─── */
function useTheme() {
  const [light, setLight] = useState(() =>
    typeof window !== 'undefined'
      ? document.documentElement.classList.contains('light')
      : false,
  );

  const toggle = useCallback(() => {
    setLight((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('light', next);
      localStorage.setItem('admin_theme', next ? 'light' : 'dark');
      return next;
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('admin_theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light');
      setLight(true);
    }
  }, []);

  return { light, toggle };
}

/* ─── Sidebar ─── */
function Sidebar() {
  const { light, toggle } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-bg-secondary transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* ─── Logo ─── */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Shield size={20} className="shrink-0 text-accent" />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-text">
            ByteCode Admin
          </span>
        )}
      </div>

      {/* ─── Navigation Links ─── */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-subtle text-accent'
                  : 'text-text-muted hover:bg-accent-subtle/50 hover:text-text',
                collapsed && 'justify-center px-2',
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ─── Bottom Actions ─── */}
      <div className="space-y-1 border-t border-border px-2 py-3">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-accent-subtle/50 hover:text-text',
            collapsed && 'justify-center px-2',
          )}
        >
          {light ? <Moon size={18} /> : <Sun size={18} />}
          {!collapsed && <span>{light ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-accent-subtle/50 hover:text-text',
            collapsed && 'justify-center px-2',
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* User info + logout */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            collapsed && 'justify-center px-2',
          )}
        >
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-text">{user.username}</p>
              <p className="text-xs text-text-muted capitalize">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Admin Layout ─── */
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Sidebar />
      <main
        className="min-h-screen ml-56 transition-all duration-200"
        style={{ padding: '24px' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
