import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Check, Pencil, Save, Trash2, UserPlus, X } from 'lucide-react';
import type { Group, GroupJoinRequest, GroupMember } from '@/types';
import { useAuthStore } from '@/features/auth/store';

interface GroupDetailResponse {
  group: Group;
  members: GroupMember[];
  pending_request: boolean;
}

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSiteAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<'overview' | 'members' | 'requests'>('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'group', id],
    queryFn: () => apiClient.get<GroupDetailResponse>(`/groups/${id}`),
    enabled: !!id,
  });

  if (isLoading || !data) {
    return <p className="text-sm text-text-muted">Loading...</p>;
  }

  const { group, members } = data;
  const canManage = isSiteAdmin || group.my_role === 'admin';

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/groups')}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft size={14} /> Back to groups
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{group.name}</h1>
          <p className="text-sm text-text-muted">
            {group.member_count ?? 0} member(s) · Created {new Date(group.created_at).toLocaleDateString()}
          </p>
        </div>
        {isSiteAdmin && (
          <DeleteGroupButton groupId={group.id} onDeleted={() => navigate('/groups')} />
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
        <TabButton active={tab === 'members'} onClick={() => setTab('members')}>
          Members ({members.length})
        </TabButton>
        {canManage && (
          <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>Join requests</TabButton>
        )}
      </div>

      {tab === 'overview' && <OverviewTab group={group} canManage={canManage} />}
      {tab === 'members' && <MembersTab groupId={group.id} members={members} canManage={canManage} />}
      {tab === 'requests' && canManage && <RequestsTab groupId={group.id} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'text-text' : 'text-text-muted hover:text-text'
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent" />}
    </button>
  );
}

function OverviewTab({ group, canManage }: { group: Group; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      apiClient.put(`/admin/groups/${group.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'group', String(group.id)] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
      setEditing(false);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!editing) {
    return (
      <div className="rounded-xl border border-border bg-panel p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Name</p>
          <p className="text-sm text-text">{group.name}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Description</p>
          <p className="text-sm text-text whitespace-pre-wrap">
            {group.description || <span className="text-text-muted/60">No description</span>}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-accent-subtle hover:text-text transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-6 space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors resize-none"
        />
      </div>
      {error && <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate({ name: name.trim(), description: description.trim() })}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-hover disabled:opacity-60 transition-colors"
        >
          <Save size={12} /> Save
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setName(group.name);
            setDescription(group.description ?? '');
            setError(null);
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-accent-subtle hover:text-text transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MembersTab({
  groupId,
  members,
  canManage,
}: {
  groupId: number;
  members: GroupMember[];
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<'member' | 'admin'>('member');
  const [actionError, setActionError] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'group', String(groupId)] });
  };

  const addMutation = useMutation({
    mutationFn: (p: { user_id: number; role: string }) => apiClient.post(`/admin/groups/${groupId}/members`, p),
    onSuccess: () => {
      invalidateAll();
      setAddUserId('');
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiClient.put(`/admin/groups/${groupId}/members/${userId}`, { role }),
    onSuccess: () => {
      invalidateAll();
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => apiClient.delete(`/admin/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      invalidateAll();
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-xl border border-border bg-panel p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">User ID</label>
            <input
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              type="number"
              placeholder="123"
              className="w-32 rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Role</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as 'member' | 'admin')}
              className="rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            >
              <option value="member">Member</option>
              <option value="admin">Group admin</option>
            </select>
          </div>
          <button
            disabled={addMutation.isPending || !addUserId}
            onClick={() => addMutation.mutate({ user_id: Number(addUserId), role: addRole })}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-60 transition-colors"
          >
            <UserPlus size={14} /> Add member
          </button>
          {actionError && (
            <p className="w-full rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {actionError}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">User</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Role</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Joined</th>
              {canManage && <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-text-muted">
                  No members yet
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.user_id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text">
                  <span className="font-medium">{m.username ?? `#${m.user_id}`}</span>
                  <span className="ml-2 text-xs text-text-muted">#{m.user_id}</span>
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={(e) => updateRoleMutation.mutate({ userId: m.user_id, role: e.target.value })}
                      className="rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs text-text outline-none focus:border-accent"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Group admin</option>
                    </select>
                  ) : (
                    <span className="inline-flex rounded-full bg-accent-subtle/40 px-2 py-0.5 text-xs font-medium text-accent capitalize">
                      {m.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">{new Date(m.joined_at).toLocaleDateString()}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${m.username ?? m.user_id}?`)) removeMutation.mutate(m.user_id);
                      }}
                      className="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestsTab({ groupId }: { groupId: number }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'group', String(groupId), 'requests', statusFilter],
    queryFn: () =>
      apiClient.get<{ requests: GroupJoinRequest[] }>(`/admin/groups/${groupId}/requests?status=${statusFilter}`),
  });

  const decideMutation = useMutation({
    mutationFn: ({ requestId, decision }: { requestId: number; decision: 'approved' | 'rejected' }) =>
      apiClient.post(`/admin/groups/${groupId}/requests/${requestId}/decide`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'group', String(groupId)] });
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const requests = data?.requests ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
              statusFilter === s
                ? 'bg-accent text-bg'
                : 'border border-border text-text-muted hover:bg-accent-subtle hover:text-text'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{actionError}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">User</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Message</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Requested</th>
              <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No {statusFilter} requests
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text">
                  <span className="font-medium">{r.username ?? `#${r.user_id}`}</span>
                </td>
                <td className="px-4 py-3 text-text-muted max-w-md">
                  {r.message || <span className="text-text-muted/60">—</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'pending' && (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => decideMutation.mutate({ requestId: r.id, decision: 'approved' })}
                        disabled={decideMutation.isPending}
                        className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/20 transition-colors disabled:opacity-60"
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        onClick={() => decideMutation.mutate({ requestId: r.id, decision: 'rejected' })}
                        disabled={decideMutation.isPending}
                        className="flex items-center gap-1 rounded-lg bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-60"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    approved: 'bg-success/15 text-success',
    rejected: 'bg-danger/15 text-danger',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? ''}`}>
      {status}
    </span>
  );
}

function DeleteGroupButton({ groupId, onDeleted }: { groupId: number; onDeleted: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/admin/groups/${groupId}`),
    onSuccess: onDeleted,
  });
  return (
    <button
      onClick={() => {
        if (confirm('Delete this group? This cannot be undone.')) deleteMutation.mutate();
      }}
      disabled={deleteMutation.isPending}
      className="flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors disabled:opacity-60"
    >
      <Trash2 size={12} /> Delete group
    </button>
  );
}
