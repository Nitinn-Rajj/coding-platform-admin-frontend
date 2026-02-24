import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Plus, Trash2, Globe, CheckCircle, Settings } from 'lucide-react';
import type { Contest, ContestProblem } from '@/types';

export function ContestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'problems'>('settings');
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [addProblemId, setAddProblemId] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addMaxPoints, setAddMaxPoints] = useState(100);

  const { data: contest, isLoading } = useQuery({
    queryKey: ['admin', 'contest', id],
    queryFn: () => apiClient.get<Contest & { problems: ContestProblem[] }>(`/admin/contests/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.put(`/admin/contests/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/contests/${id}/publish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] }),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/contests/${id}/finalize`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] }),
  });

  const addProblemMutation = useMutation({
    mutationFn: (payload: { problem_id: string; label: string; order_index: number; max_points: number }) =>
      apiClient.post(`/admin/contests/${id}/problems`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] });
      setShowAddProblem(false);
      setAddProblemId('');
      setAddLabel('');
    },
  });

  const removeProblemMutation = useMutation({
    mutationFn: (cpId: string) =>
      apiClient.delete(`/admin/contests/${id}/problems/${cpId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] }),
  });

  if (isLoading) {
    return <p className="py-20 text-center text-text-muted">Loading contest...</p>;
  }

  if (!contest) {
    return <p className="py-20 text-center text-error">Contest not found</p>;
  }

  const problems: ContestProblem[] = (contest as Contest & { problems: ContestProblem[] }).problems ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/contests')}
            className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle hover:text-text"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text">{contest.title}</h1>
            <p className="text-xs text-text-muted capitalize">
              {contest.status} · {contest.scoring_type.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contest.status === 'draft' && (
            <button
              onClick={() => { if (confirm('Publish this contest?')) publishMutation.mutate(); }}
              disabled={publishMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50"
            >
              <Globe size={14} /> Publish
            </button>
          )}
          {(contest.status === 'ended' || contest.status === 'running') && (
            <button
              onClick={() => { if (confirm('Finalize? This locks the contest.')) finalizeMutation.mutate(); }}
              disabled={finalizeMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning hover:bg-warning/20 disabled:opacity-50"
            >
              <CheckCircle size={14} /> Finalize
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium',
            activeTab === 'settings' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text',
          )}
        >
          <Settings size={14} className="mr-1 inline" /> Settings
        </button>
        <button
          onClick={() => setActiveTab('problems')}
          className={cn(
            'whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium',
            activeTab === 'problems' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text',
          )}
        >
          Problems ({problems.length})
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <ContestSettingsForm
          contest={contest}
          onSave={(payload) => updateMutation.mutate(payload)}
          isPending={updateMutation.isPending}
          isSuccess={updateMutation.isSuccess}
        />
      )}

      {/* Problems Tab */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddProblem(!showAddProblem)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover"
            >
              <Plus size={14} /> Add Problem
            </button>
          </div>

          {showAddProblem && (
            <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
              <h3 className="text-sm font-medium text-text">Add Problem to Contest</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Problem ID</label>
                  <input
                    value={addProblemId}
                    onChange={(e) => setAddProblemId(e.target.value)}
                    placeholder="UUID"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Label</label>
                  <input
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="A"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Max Points</label>
                  <input
                    type="number"
                    value={addMaxPoints}
                    onChange={(e) => setAddMaxPoints(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </div>
              </div>
              <button
                onClick={() =>
                  addProblemMutation.mutate({
                    problem_id: addProblemId,
                    label: addLabel,
                    order_index: problems.length,
                    max_points: addMaxPoints,
                  })
                }
                disabled={addProblemMutation.isPending || !addProblemId}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
              >
                <Save size={14} /> Add
              </button>
            </div>
          )}

          {/* Problem list */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-secondary">
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Label</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Problem</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Max Points</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((cp) => (
                  <tr key={cp.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-bold text-accent">{cp.label}</td>
                    <td className="px-4 py-3 text-text">{cp.problem_title || cp.problem_id}</td>
                    <td className="px-4 py-3 text-text-muted">{cp.max_points}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Remove this problem?')) removeProblemMutation.mutate(cp.id);
                        }}
                        className="rounded p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {problems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-text-muted">No problems added yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Contest Settings Form ─── */
function ContestSettingsForm({
  contest,
  onSave,
  isPending,
  isSuccess,
}: {
  contest: Contest;
  onSave: (payload: Record<string, unknown>) => void;
  isPending: boolean;
  isSuccess: boolean;
}) {
  const [title, setTitle] = useState(contest.title);
  const [description, setDescription] = useState(contest.description);
  const [startTime, setStartTime] = useState(contest.start_time.slice(0, 16));
  const [endTime, setEndTime] = useState(contest.end_time.slice(0, 16));
  const [isPublic, setIsPublic] = useState(contest.is_public);
  const [freezeMinutes, setFreezeMinutes] = useState(contest.freeze_time_minutes ?? 0);
  const [penaltySeconds, setPenaltySeconds] = useState(contest.penalty_time_seconds);
  const [allowVirtual, setAllowVirtual] = useState(contest.allow_virtual);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      is_public: isPublic,
      freeze_time_minutes: freezeMinutes || null,
      penalty_time_seconds: penaltySeconds,
      allow_virtual: allowVirtual,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Contest updated successfully.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Freeze Time (min before end)</label>
          <input
            type="number"
            value={freezeMinutes}
            onChange={(e) => setFreezeMinutes(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Penalty (seconds)</label>
          <input
            type="number"
            value={penaltySeconds}
            onChange={(e) => setPenaltySeconds(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={allowVirtual} onChange={(e) => setAllowVirtual(e.target.checked)} />
          Allow virtual
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg',
            isPending ? 'opacity-60' : 'hover:bg-accent-hover',
          )}
        >
          <Save size={16} /> {isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
