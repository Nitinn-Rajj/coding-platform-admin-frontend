import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import type { AdminUser, PaginatedResponse } from '@/types';

const roleColors: Record<string, string> = {
  admin: 'bg-error/15 text-error',
  setter: 'bg-accent-subtle text-accent',
  tester: 'bg-warning/15 text-warning',
  user: 'bg-bg-secondary text-text-muted',
};

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AdminUser>>(
        `/admin/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}${roleFilter ? `&role=${roleFilter}` : ''}`,
      ),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiClient.put(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditingUserId(null);
    },
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-text">User Management</h1>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by username or email..."
            className="w-full rounded-lg border border-border bg-panel py-2 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="setter">Setter</option>
          <option value="tester">Tester</option>
          <option value="user">User</option>
        </select>
      </div>

      {updateRoleMutation.isError && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {updateRoleMutation.error instanceof Error ? updateRoleMutation.error.message : 'Failed to update role'}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">ID</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Username</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Email</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Role</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Rating</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Joined</th>
              <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">Loading...</td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">No users found</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text-muted">{u.id}</td>
                <td className="px-4 py-3 font-medium text-text">{u.username}</td>
                <td className="px-4 py-3 text-text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  {editingUserId === u.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="rounded border border-border bg-bg px-2 py-1 text-xs text-text outline-none"
                      >
                        <option value="user">user</option>
                        <option value="tester">tester</option>
                        <option value="setter">setter</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        onClick={() => updateRoleMutation.mutate({ userId: u.id, role: editRole })}
                        disabled={updateRoleMutation.isPending}
                        className="rounded bg-accent px-2 py-1 text-xs text-bg hover:bg-accent-hover"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="rounded px-2 py-1 text-xs text-text-muted hover:bg-accent-subtle"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', roleColors[u.role])}>
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">{u.rating}</td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingUserId !== u.id && (
                    <button
                      onClick={() => { setEditingUserId(u.id); setEditRole(u.role); }}
                      className="flex items-center gap-1 rounded p-1.5 text-text-muted hover:bg-accent-subtle hover:text-accent"
                      title="Change role"
                    >
                      <Shield size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm text-text-muted">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
