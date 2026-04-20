import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';
import type { Group } from '@/types';

export function ContestCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scoringType, setScoringType] = useState<'icpc' | 'ioi'>('icpc');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isRated, setIsRated] = useState(true);
  const [freezeMinutes, setFreezeMinutes] = useState<number>(0);
  const [penaltySeconds, setPenaltySeconds] = useState<number>(1200);
  const [allowVirtual, setAllowVirtual] = useState(false);
  const [groupId, setGroupId] = useState<string>('');
  const [proctored, setProctored] = useState(false);
  const [gradeVisibility, setGradeVisibility] = useState<'private' | 'group'>('private');
  const [error, setError] = useState('');

  // Fetch available groups for group-based contests
  const { data: groupsData } = useQuery({
    queryKey: ['admin', 'groups-options'],
    queryFn: () => apiClient.get<{ groups: Group[] }>(`/groups`),
  });
  const groups = groupsData?.groups ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post<{ id: number }>('/admin/contests', payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contests'] });
      navigate(`/contests/${data.id}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create contest'),
  });

  const isGroupContest = groupId !== '';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({
      title,
      description,
      scoring_type: scoringType,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      // Group contests are forced unrated server-side; reflect that here.
      is_rated: isGroupContest ? false : isRated,
      freeze_time_minutes: freezeMinutes > 0 ? freezeMinutes : null,
      penalty_time_seconds: penaltySeconds,
      allow_virtual: allowVirtual,
      group_id: isGroupContest ? Number(groupId) : null,
      proctored,
      grade_visibility: gradeVisibility,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/contests')}
          className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle hover:text-text"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-text">Create Contest</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Codeforces Round #999"
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
            <label className="mb-1 block text-sm font-medium text-text-muted">Scoring Type</label>
            <select
              value={scoringType}
              onChange={(e) => setScoringType(e.target.value as 'icpc' | 'ioi')}
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="icpc">ICPC</option>
              <option value="ioi">IOI</option>
            </select>
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
            <label className="mb-1 block text-sm font-medium text-text-muted">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Freeze Time (minutes before end)</label>
            <input
              type="number"
              value={freezeMinutes}
              onChange={(e) => setFreezeMinutes(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">
              Associate with Group (optional)
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="">— None (global contest) —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {isGroupContest && (
              <p className="mt-1 text-xs text-text-muted">
                Group contests are unrated and visible only to group members.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Grade Visibility</label>
            <select
              value={gradeVisibility}
              onChange={(e) => setGradeVisibility(e.target.value as 'private' | 'group')}
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="private">Private — only students see their own grades</option>
              <option value="group">Group — all participants see all grades</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-3">
            <label className={cn('flex items-center gap-2 text-sm', isGroupContest ? 'text-text-muted/40' : 'text-text-muted')}>
              <input
                type="checkbox"
                checked={isRated}
                onChange={(e) => setIsRated(e.target.checked)}
                disabled={isGroupContest}
                className="rounded"
              />
              Rated contest
            </label>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={allowVirtual}
                onChange={(e) => setAllowVirtual(e.target.checked)}
                className="rounded"
              />
              Allow virtual participation
            </label>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={proctored}
                onChange={(e) => setProctored(e.target.checked)}
                className="rounded"
              />
              Proctored mode (detect tab/fullscreen exits)
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg transition-colors',
              createMutation.isPending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent-hover',
            )}
          >
            <Save size={16} />
            {createMutation.isPending ? 'Creating...' : 'Create Contest'}
          </button>
        </div>
      </form>
    </div>
  );
}
