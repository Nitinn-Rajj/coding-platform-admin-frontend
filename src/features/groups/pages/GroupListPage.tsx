import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient, buildQueryString } from '@/lib/api-client';
import { Plus, Search, Users } from 'lucide-react';
import type { Group } from '@/types';
import { useAuthStore } from '@/features/auth/store';

export function GroupListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSiteAdmin = user?.role === 'admin';
  const isGlobalAdmin = user ? ['admin', 'setter', 'tester'].includes(user.role) : false;
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'groups', search, onlyMine, isGlobalAdmin],
    queryFn: () =>
      apiClient.get<{ groups: Group[] }>(
        `/groups${buildQueryString({ search, member: (!isGlobalAdmin || onlyMine) ? 'me' : undefined })}`,
      ),
  });

  const groups = (data?.groups ?? []).filter((group) => isGlobalAdmin || group.my_role === 'admin');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Groups</h1>
          <p className="text-sm text-text-muted">
            Organize users into groups for classroom-style contests and assignments.
          </p>
        </div>
        {isSiteAdmin && (
          <button
            onClick={() => navigate('/groups/new')}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} /> New Group
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full rounded-lg border border-border bg-panel py-2 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            disabled={!isGlobalAdmin}
            className="rounded border-border bg-panel accent-accent"
          />
          {isGlobalAdmin ? 'My groups only' : 'Managed groups'}
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">Name</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Description</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Members</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Your role</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">Loading...</td>
              </tr>
            )}
            {!isLoading && groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No groups found</td>
              </tr>
            )}
            {groups.map((g) => (
              <tr
                key={g.id}
                className="border-b border-border last:border-0 hover:bg-accent-subtle/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <td className="px-4 py-3 font-medium text-text">{g.name}</td>
                <td className="px-4 py-3 text-text-muted line-clamp-1 max-w-lg">
                  {g.description || <span className="text-text-muted/60">—</span>}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} /> {g.member_count ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {g.my_role ? (
                    <span className="inline-flex rounded-full bg-accent-subtle/40 px-2 py-0.5 text-xs font-medium text-accent capitalize">
                      {g.my_role}
                    </span>
                  ) : (
                    <span className="text-text-muted/60">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(g.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
