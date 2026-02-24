import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { FileText, Trophy, Users, Activity } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';

interface DashboardStats {
  problems_count: number;
  contests_count: number;
  users_count: number;
  recent_submissions: number;
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiClient.get<DashboardStats>('/admin/dashboard'),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Dashboard</h1>
        <p className="text-sm text-text-muted">
          Welcome back, <span className="text-text">{user?.username}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Problems"
          value={stats?.problems_count ?? '—'}
          icon={<FileText size={20} />}
        />
        <StatCard
          label="Contests"
          value={stats?.contests_count ?? '—'}
          icon={<Trophy size={20} />}
        />
        <StatCard
          label="Users"
          value={stats?.users_count ?? '—'}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Recent Submissions"
          value={stats?.recent_submissions ?? '—'}
          icon={<Activity size={20} />}
        />
      </div>
    </div>
  );
}
