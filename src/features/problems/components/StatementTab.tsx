import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Save } from 'lucide-react';
import type { Problem } from '@/types';

interface Props {
  problem: Problem;
}

export function StatementTab({ problem }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(problem.title);
  const [description, setDescription] = useState(problem.description);
  const [difficulty, setDifficulty] = useState(problem.difficulty);
  const [timeLimit, setTimeLimit] = useState(problem.time_limit_ms);
  const [memoryLimit, setMemoryLimit] = useState(problem.memory_limit_kb);
  const [tagsInput, setTagsInput] = useState((problem.tags ?? []).join(', '));
  const [changeSummary, setChangeSummary] = useState('');

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.put(`/admin/problems/${problem.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problem.id] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    updateMutation.mutate({
      title,
      description,
      difficulty,
      time_limit_ms: timeLimit,
      memory_limit_kb: memoryLimit,
      tags,
      change_summary: changeSummary || `Updated problem statement`,
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
        <label className="mb-1 block text-sm font-medium text-text-muted">Description (Markdown)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Memory Limit (KB)</label>
          <input
            type="number"
            value={memoryLimit}
            onChange={(e) => setMemoryLimit(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Tags (comma-separated)</label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Change Summary</label>
        <input
          value={changeSummary}
          onChange={(e) => setChangeSummary(e.target.value)}
          placeholder="Brief description of changes"
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
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
