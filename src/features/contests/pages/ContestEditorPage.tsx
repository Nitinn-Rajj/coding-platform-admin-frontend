import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQueryString } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { isoToLocalInput, localInputToISO } from '@/lib/datetime';
import {
  ArrowLeft, Save, Plus, Trash2, Globe, CheckCircle, Settings,
  Shield, FileDown, ListChecks, AlertCircle,
} from 'lucide-react';
import type {
  Contest, ContestProblem, Group,
  ProctorEvent, ProctorUserSummary,
  Problem, PaginatedResponse,
} from '@/types';
import { useAuthStore } from '@/features/auth/store';

type Tab = 'settings' | 'problems' | 'proctor';

export function ContestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [problemSearch, setProblemSearch] = useState('');
  const [problemPage, setProblemPage] = useState(1);
  const [addMaxPoints, setAddMaxPoints] = useState(100);
  const [addScoringMode, setAddScoringMode] = useState<'all_or_nothing' | 'partial'>('all_or_nothing');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: contest, isLoading } = useQuery({
    queryKey: ['admin', 'contest', id],
    queryFn: () => apiClient.get<Contest>(`/admin/contests/${id}`),
    enabled: !!id,
  });

  const clearAction = () => { setActionError(''); setActionSuccess(''); };
  const asMsg = (e: unknown) => (e instanceof Error ? e.message : 'Request failed');

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.put(`/admin/contests/${id}`, payload),
    onMutate: clearAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] });
      setActionSuccess('Settings saved.');
    },
    onError: (e) => setActionError(asMsg(e)),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/contests/${id}/publish`),
    onMutate: clearAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'contests'] });
      setActionSuccess('Contest published — it is now visible to students.');
    },
    onError: (e) => setActionError(asMsg(e)),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/contests/${id}/finalize`),
    onMutate: clearAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'contests'] });
      setActionSuccess('Contest finalized — submissions are now locked.');
    },
    onError: (e) => setActionError(asMsg(e)),
  });

  const addProblemMutation = useMutation({
    mutationFn: (payload: {
      problem_id: number; max_points: number; problem_order: number; scoring_mode: string;
    }) => apiClient.post(`/admin/contests/${id}/problems`, payload),
    onMutate: clearAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] });
      setShowAddProblem(false);
      setSelectedProblem(null);
      setProblemSearch('');
      setProblemPage(1);
      setActionSuccess('Problem added to contest.');
    },
    onError: (e) => setActionError(asMsg(e)),
  });

  // Master problem list for the picker. We intentionally do NOT pass a status
  // filter so that both draft and published problems appear — contest admins
  // can legitimately add an unpublished problem to a contest.
  const { data: problemPage1, isLoading: problemsLoading } = useQuery({
    queryKey: ['admin', 'problems', 'picker', problemPage, problemSearch],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Problem>>(
        `/admin/problems${buildQueryString({ page: problemPage, search: problemSearch })}`,
      ),
    enabled: showAddProblem,
  });

  const removeProblemMutation = useMutation({
    mutationFn: (cpId: number) =>
      apiClient.delete(`/admin/contests/${id}/problems/${cpId}`),
    onMutate: clearAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'contest', id] }),
    onError: (e) => setActionError(asMsg(e)),
  });

  const handleExportCSV = async () => {
    if (!contest) return;
    try {
      const safeName = contest.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      await apiClient.download(
        `/admin/contests/${contest.id}/export.csv`,
        `contest_${contest.id}_${safeName}.csv`,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    }
  };

  if (isLoading) {
    return <p className="py-20 text-center text-text-muted">Loading contest...</p>;
  }

  if (!contest) {
    return <p className="py-20 text-center text-error">Contest not found</p>;
  }

  const problems: ContestProblem[] = contest.problems ?? [];

  return (
    <div className="space-y-4">
      {(actionError || actionSuccess) && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
            actionError
              ? 'border-error/30 bg-error/10 text-error'
              : 'border-success/30 bg-success/10 text-success',
          )}
        >
          {actionError ? <AlertCircle size={14} className="mt-0.5" /> : <CheckCircle size={14} className="mt-0.5" />}
          <span className="flex-1">{actionError || actionSuccess}</span>
          <button
            onClick={() => { setActionError(''); setActionSuccess(''); }}
            className="opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

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
            <p className="text-xs text-text-muted">
              {contest.status} · {contest.scoring_type.toUpperCase()}
              {contest.group_name && <> · group: <span className="text-accent">{contest.group_name}</span></>}
              {contest.proctored && <> · <span className="text-warning">proctored</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/submissions${buildQueryString({ contest_id: contest.id, contest_name: contest.title })}`)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-text hover:bg-accent-subtle/50"
          >
            <ListChecks size={14} /> View submissions
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-text hover:bg-accent-subtle/50"
          >
            <FileDown size={14} /> Export CSV
          </button>
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
        <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
          <Settings size={14} className="mr-1 inline" /> Settings
        </TabButton>
        <TabButton active={activeTab === 'problems'} onClick={() => setActiveTab('problems')}>
          <ListChecks size={14} className="mr-1 inline" /> Problems ({problems.length})
        </TabButton>
        {contest.proctored && (
          <TabButton active={activeTab === 'proctor'} onClick={() => setActiveTab('proctor')}>
            <Shield size={14} className="mr-1 inline" /> Proctoring
          </TabButton>
        )}
      </div>

      {activeTab === 'settings' && (
        <ContestSettingsForm
          contest={contest}
          onSave={(payload) => updateMutation.mutate(payload)}
          isPending={updateMutation.isPending}
        />
      )}

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

          {showAddProblem && (() => {
            const pickerProblems = problemPage1?.data ?? [];
            const pickerTotal = problemPage1?.total ?? 0;
            const pickerPages = problemPage1?.pages ?? 1;
            const existingIds = new Set(problems.map((cp) => cp.problem_id));
            return (
              <div className="rounded-xl border border-border bg-panel p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text">Add Problem to Contest</h3>
                  <p className="text-xs text-text-muted">
                    Drafts can be added — they become visible to participants only through this contest.
                  </p>
                </div>

                {/* Search + picker */}
                <div>
                  <input
                    value={problemSearch}
                    onChange={(e) => { setProblemSearch(e.target.value); setProblemPage(1); }}
                    placeholder="Search problems by title or slug..."
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-secondary">
                        <th className="px-3 py-2 text-left font-medium text-text-muted">ID</th>
                        <th className="px-3 py-2 text-left font-medium text-text-muted">Title</th>
                        <th className="px-3 py-2 text-left font-medium text-text-muted">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-text-muted">Type</th>
                        <th className="px-3 py-2 text-right font-medium text-text-muted">Pick</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problemsLoading && (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-text-muted">Loading...</td></tr>
                      )}
                      {!problemsLoading && pickerProblems.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-text-muted">No problems found</td></tr>
                      )}
                      {pickerProblems.map((p) => {
                        const alreadyAdded = existingIds.has(p.id);
                        const isSelected = selectedProblem?.id === p.id;
                        return (
                          <tr
                            key={p.id}
                            className={cn(
                              'border-b border-border last:border-0',
                              isSelected && 'bg-accent-subtle/30',
                            )}
                          >
                            <td className="px-3 py-2 font-mono text-xs text-text-muted">#{p.id}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium text-text">{p.title}</p>
                              <p className="text-xs text-text-muted">{p.slug}</p>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                                  p.status === 'published'
                                    ? 'bg-success/15 text-success'
                                    : 'bg-warning/15 text-warning',
                                )}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-text-muted capitalize">{p.problem_type}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedProblem(p)}
                                disabled={alreadyAdded}
                                title={alreadyAdded ? 'Already added to this contest' : undefined}
                                className={cn(
                                  'rounded-lg border px-2 py-1 text-xs font-medium transition-colors',
                                  alreadyAdded
                                    ? 'cursor-not-allowed border-border text-text-muted opacity-60'
                                    : isSelected
                                      ? 'border-accent bg-accent text-bg'
                                      : 'border-border text-text hover:border-accent hover:text-accent',
                                )}
                              >
                                {alreadyAdded ? 'Added' : isSelected ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pickerPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{pickerTotal} problems</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setProblemPage((p) => Math.max(1, p - 1))}
                        disabled={problemPage === 1}
                        className="rounded border border-border px-2 py-1 hover:bg-accent-subtle disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span>{problemPage} / {pickerPages}</span>
                      <button
                        onClick={() => setProblemPage((p) => Math.min(pickerPages, p + 1))}
                        disabled={problemPage === pickerPages}
                        className="rounded border border-border px-2 py-1 hover:bg-accent-subtle disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected problem summary + scoring settings */}
                {selectedProblem ? (
                  <div className="rounded-lg border border-accent/40 bg-accent-subtle/20 p-3 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-text-muted">Selected problem</p>
                        <p className="text-sm font-medium text-text">
                          #{selectedProblem.id} · {selectedProblem.title}
                        </p>
                        <p className="text-xs text-text-muted">
                          {selectedProblem.slug} · <span className="capitalize">{selectedProblem.problem_type}</span> · <span className="capitalize">{selectedProblem.status}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProblem(null)}
                        className="text-xs text-text-muted hover:text-text"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-text-muted">Max Points</label>
                        <input
                          type="number"
                          value={addMaxPoints}
                          onChange={(e) => setAddMaxPoints(Number(e.target.value))}
                          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-text-muted">Scoring Mode</label>
                        <select
                          value={addScoringMode}
                          onChange={(e) => setAddScoringMode(e.target.value as 'all_or_nothing' | 'partial')}
                          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                        >
                          <option value="all_or_nothing">All-or-nothing</option>
                          <option value="partial">Partial (per test case)</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        addProblemMutation.mutate({
                          problem_id: selectedProblem.id,
                          max_points: addMaxPoints,
                          // Let the backend auto-assign the next order (it does
                          // MAX(problem_order)+1 when we pass 0).
                          problem_order: 0,
                          scoring_mode: addScoringMode,
                        })
                      }
                      disabled={addProblemMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
                    >
                      <Save size={14} /> {addProblemMutation.isPending ? 'Adding...' : 'Add to Contest'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">Pick a problem from the list above to add it to this contest.</p>
                )}
              </div>
            );
          })()}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-secondary">
                  <th className="px-4 py-3 text-left font-medium text-text-muted">#</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Problem ID</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Problem</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Max Points</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Scoring Mode</th>
                  <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((cp) => (
                  <tr key={cp.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-bold text-accent">{cp.problem_order}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">#{cp.problem_id}</td>
                    <td className="px-4 py-3 text-text">
                      <p className="font-medium">{cp.title}</p>
                      <p className="text-xs text-text-muted">{cp.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-text-muted capitalize">{cp.problem_type}</td>
                    <td className="px-4 py-3 text-text-muted">{cp.max_points}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {cp.scoring_mode === 'partial' ? 'Partial' : 'All-or-nothing'}
                    </td>
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
                    <td colSpan={7} className="px-4 py-6 text-center text-text-muted">No problems added yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'proctor' && contest.proctored && (
        <ProctorPanel contestId={contest.id} />
      )}
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium',
        active ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  );
}

/* ─── Contest Settings Form ─── */
function ContestSettingsForm({
  contest, onSave, isPending,
}: {
  contest: Contest;
  onSave: (payload: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const { user } = useAuthStore();
  const isGlobalAdmin = user ? ['admin', 'setter', 'tester'].includes(user.role) : false;
  const [title, setTitle] = useState(contest.title);
  const [description, setDescription] = useState(contest.description ?? '');
  const [startTime, setStartTime] = useState(isoToLocalInput(contest.start_time));
  const [endTime, setEndTime] = useState(isoToLocalInput(contest.end_time));
  const [isRated, setIsRated] = useState(contest.is_rated);
  const [freezeMinutes, setFreezeMinutes] = useState(contest.freeze_time_minutes ?? 0);
  const [penaltySeconds, setPenaltySeconds] = useState(contest.penalty_time_seconds ?? 0);
  const [allowVirtual, setAllowVirtual] = useState(contest.allow_virtual ?? false);
  const [groupId, setGroupId] = useState<string>(contest.group_id ? String(contest.group_id) : '');
  const [proctored, setProctored] = useState(contest.proctored);
  const [gradeVisibility, setGradeVisibility] = useState<'private' | 'group'>(contest.grade_visibility);

  const { data: groupsData } = useQuery({
    queryKey: ['admin', 'groups-options', isGlobalAdmin],
    queryFn: () =>
      apiClient.get<{ groups: Group[] }>(
        isGlobalAdmin ? '/groups' : '/groups?member=me',
      ),
  });
  const groups = (groupsData?.groups ?? []).filter((group) => isGlobalAdmin || group.my_role === 'admin');

  const isGroupContest = groupId !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      title,
      description,
      start_time: localInputToISO(startTime),
      end_time: localInputToISO(endTime),
      is_rated: isGroupContest ? false : isRated,
      freeze_time_minutes: freezeMinutes > 0 ? freezeMinutes : null,
      penalty_time_seconds: penaltySeconds,
      allow_virtual: allowVirtual,
      proctored,
      grade_visibility: gradeVisibility,
    };
    if (!isGlobalAdmin && groupId === '') {
      return;
    }
    if (groupId === '') {
      payload.clear_group = true;
    } else {
      payload.group_id = Number(groupId);
    }
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">
            Associate with Group {isGlobalAdmin ? '' : '(required)'}
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required={!isGlobalAdmin}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            {isGlobalAdmin && <option value="">— None (global contest) —</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {isGroupContest && (
            <p className="mt-1 text-xs text-text-muted">
              Group contests are unrated and only visible to members.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Grade Visibility</label>
          <select
            value={gradeVisibility}
            onChange={(e) => setGradeVisibility(e.target.value as 'private' | 'group')}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="private">Private</option>
            <option value="group">Group</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <label className={cn('flex items-center gap-2 text-sm', isGroupContest ? 'text-text-muted/40' : 'text-text-muted')}>
          <input
            type="checkbox"
            checked={isRated}
            onChange={(e) => setIsRated(e.target.checked)}
            disabled={isGroupContest}
          />
          Rated
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={allowVirtual} onChange={(e) => setAllowVirtual(e.target.checked)} />
          Allow virtual
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={proctored} onChange={(e) => setProctored(e.target.checked)} />
          Proctored
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

/* ─── Proctor Panel ─── */
function ProctorPanel({ contestId }: { contestId: number }) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['admin', 'contest', contestId, 'proctor-summary'],
    queryFn: () =>
      apiClient.get<{ summary: ProctorUserSummary[] }>(
        `/admin/contests/${contestId}/proctor-summary`,
      ),
  });

  const { data: events, isLoading: evLoading } = useQuery({
    queryKey: ['admin', 'contest', contestId, 'proctor-events', selectedUserId],
    queryFn: () =>
      apiClient.get<{ events: ProctorEvent[] }>(
        `/admin/contests/${contestId}/proctor-events${buildQueryString({ user_id: selectedUserId ?? undefined, limit: 500 })}`,
      ),
    enabled: selectedUserId !== null,
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[360px_1fr]">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text">Participants</h3>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                <th className="px-3 py-2 text-left font-medium text-text-muted">User</th>
                <th className="px-3 py-2 text-right font-medium text-text-muted">Events</th>
              </tr>
            </thead>
            <tbody>
              {sumLoading && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-text-muted">Loading...</td>
                </tr>
              )}
              {!sumLoading && (summary?.summary ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-text-muted">
                    No proctor events recorded.
                  </td>
                </tr>
              )}
              {(summary?.summary ?? []).map((s) => (
                <tr
                  key={s.user_id}
                  onClick={() => setSelectedUserId(s.user_id)}
                  className={cn(
                    'cursor-pointer border-b border-border last:border-0 hover:bg-accent-subtle/30',
                    selectedUserId === s.user_id && 'bg-accent-subtle/40',
                  )}
                >
                  <td className="px-3 py-2 text-text">{s.username}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      s.total_events > 10
                        ? 'bg-error/15 text-error'
                        : s.total_events > 3
                        ? 'bg-warning/15 text-warning'
                        : 'bg-text-muted/15 text-text-muted',
                    )}>
                      {s.total_events}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text">
          Events {selectedUserId ? `for user #${selectedUserId}` : '(select a participant)'}
        </h3>
        {selectedUserId === null ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
            Pick a participant on the left to see their proctor event log.
          </div>
        ) : evLoading ? (
          <p className="py-8 text-center text-text-muted">Loading events...</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-secondary">
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Time</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Event</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {(events?.events ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium text-text">{e.event_type}</td>
                    <td className="px-3 py-2 text-text-muted">
                      <code className="text-xs">{JSON.stringify(e.details ?? {})}</code>
                    </td>
                  </tr>
                ))}
                {(events?.events ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-text-muted">
                      No events logged for this user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
