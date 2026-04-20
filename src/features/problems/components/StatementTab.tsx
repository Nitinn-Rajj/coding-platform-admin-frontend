import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Save } from 'lucide-react';
import type { Problem, ProblemType } from '@/types';

interface Props {
  problem: Problem;
}

export function StatementTab({ problem }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(problem.title);
  const [statement, setStatement] = useState(problem.statement ?? '');
  const [difficulty, setDifficulty] = useState(problem.difficulty);
  const [timeLimit, setTimeLimit] = useState(problem.time_limit_ms);
  const [memoryLimit, setMemoryLimit] = useState(problem.memory_limit_mb);
  const [problemType, setProblemType] = useState<ProblemType>(problem.problem_type);
  const [points, setPoints] = useState<number | ''>(problem.points ?? '');

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.put(`/admin/problems/${problem.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problem.id] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      title,
      statement,
      difficulty,
      time_limit_ms: timeLimit,
      memory_limit_mb: memoryLimit,
      problem_type: problemType,
      points: points === '' ? null : Number(points),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {updateMutation.isSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Problem updated successfully (new revision created).
        </div>
      )}
      {updateMutation.isError && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {updateMutation.error instanceof Error ? updateMutation.error.message : 'Update failed'}
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
        <label className="mb-1 block text-sm font-medium text-text-muted">Problem Type</label>
        <div className="flex gap-3">
          <label className={cn(
            'flex-1 cursor-pointer rounded-lg border p-3 text-sm',
            problemType === 'standard'
              ? 'border-accent bg-accent-subtle/30 text-text'
              : 'border-border bg-panel text-text-muted hover:border-accent/30',
          )}>
            <input
              type="radio"
              checked={problemType === 'standard'}
              onChange={() => setProblemType('standard')}
              className="mr-2"
            />
            <span className="font-medium">Standard</span>
            <p className="mt-1 text-xs">Auto-judged against test cases.</p>
          </label>
          <label className={cn(
            'flex-1 cursor-pointer rounded-lg border p-3 text-sm',
            problemType === 'subjective'
              ? 'border-accent bg-accent-subtle/30 text-text'
              : 'border-border bg-panel text-text-muted hover:border-accent/30',
          )}>
            <input
              type="radio"
              checked={problemType === 'subjective'}
              onChange={() => setProblemType('subjective')}
              className="mr-2"
            />
            <span className="font-medium">Subjective</span>
            <p className="mt-1 text-xs">Manually graded by an admin.</p>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Statement (Markdown)</label>
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={16}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent font-mono"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Time Limit (ms)</label>
          <input
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            disabled={problemType === 'subjective'}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Memory Limit (MB)</label>
          <input
            type="number"
            value={memoryLimit}
            onChange={(e) => setMemoryLimit(Number(e.target.value))}
            disabled={problemType === 'subjective'}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">
          Default Points (optional)
        </label>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          placeholder="100"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg transition-colors',
            updateMutation.isPending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent-hover',
          )}
        >
          <Save size={16} />
          {updateMutation.isPending ? 'Saving...' : 'Save & Create Revision'}
        </button>
      </div>
    </form>
  );
}
