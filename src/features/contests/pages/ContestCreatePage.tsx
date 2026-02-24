import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';

export function ContestCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scoringType, setScoringType] = useState('icpc');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [freezeMinutes, setFreezeMinutes] = useState(60);
  const [penaltySeconds, setPenaltySeconds] = useState(1200);
  const [allowVirtual, setAllowVirtual] = useState(false);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post<{ id: string }>('/admin/contests', payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contests'] });
      navigate(`/contests/${data.id}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create contest'),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({
      title,
      description,
      scoring_type: scoringType,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      is_public: isPublic,
      freeze_time_minutes: freezeMinutes || null,
      penalty_time_seconds: penaltySeconds,
      allow_virtual: allowVirtual,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
              onChange={(e) => setScoringType(e.target.value)}
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
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              Public contest
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
