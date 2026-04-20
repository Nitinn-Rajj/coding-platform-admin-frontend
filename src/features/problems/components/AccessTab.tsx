import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import type { ProblemAccess, AccessRole } from '@/types';

interface Props {
  problemId: string;
}

export function AccessTab({ problemId }: Props) {
  const queryClient = useQueryClient();
  const [showGrant, setShowGrant] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantRole, setGrantRole] = useState<AccessRole>('viewer');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'problem', problemId, 'access'],
    queryFn: () =>
      apiClient.get<{ access: ProblemAccess[] }>(`/admin/problems/${problemId}/access`),
  });

  const grantMutation = useMutation({
    mutationFn: (payload: { user_id: number; role: string }) =>
      apiClient.post(`/admin/problems/${problemId}/access`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId, 'access'] });
      setShowGrant(false);
      setGrantUserId('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) =>
      apiClient.delete(`/admin/problems/${problemId}/access/${userId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId, 'access'] }),
  });

  const accessList = data?.access ?? [];

  const roleColors: Record<string, string> = {
    owner: 'bg-accent-subtle text-accent',
    editor: 'bg-success/15 text-success',
    tester: 'bg-warning/15 text-warning',
    viewer: 'bg-bg-secondary text-text-muted',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowGrant(!showGrant)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          <Plus size={14} /> Grant Access
        </button>
        <span className="ml-auto text-sm text-text-muted">{accessList.length} user(s)</span>
      </div>

      {/* Grant form */}
      {showGrant && (
        <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-text">Grant Problem Access</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">User ID</label>
              <input
                type="number"
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                placeholder="User ID"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Role</label>
              <select
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value as AccessRole)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              >
                <option value="viewer">Viewer</option>
                <option value="tester">Tester</option>
                <option value="editor">Editor</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() =>
                  grantMutation.mutate({
                    user_id: Number(grantUserId),
                    role: grantRole,
                  })
                }
                disabled={!grantUserId || grantMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
              >
                <UserPlus size={14} /> Grant
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-text-muted">Loading access list...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                <th className="px-4 py-3 text-left font-medium text-text-muted">User</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Role</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Granted</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessList.map((entry) => (
                <tr key={entry.user_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-text">{entry.username}</span>
                    <span className="ml-1 text-xs text-text-muted">#{entry.user_id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[entry.role] ?? ''}`}>
                      {entry.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(entry.granted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Revoke access for ${entry.username}?`))
                          revokeMutation.mutate(entry.user_id);
                      }}
                      className="rounded p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {accessList.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-muted">No access entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
