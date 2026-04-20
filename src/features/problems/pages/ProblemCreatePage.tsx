import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProblemType } from '@/types';

interface CreateProblemPayload {
  title: string;
  slug: string;
  statement: string;
  difficulty: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  problem_type: ProblemType;
  points?: number | null;
}

export function ProblemCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [statement, setStatement] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [timeLimit, setTimeLimit] = useState(2000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [problemType, setProblemType] = useState<ProblemType>('standard');
  const [points, setPoints] = useState<number | ''>('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (payload: CreateProblemPayload) =>
      apiClient.post<{ id: number }>('/admin/problems', payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] });
      navigate(`/problems/${data.id}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create problem'),
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim(),
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({
      title,
      slug,
      statement,
      difficulty,
      time_limit_ms: timeLimit,
      memory_limit_mb: memoryLimit,
      problem_type: problemType,
      points: points === '' ? null : Number(points),
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/problems')}
          className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle hover:text-text"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-text">Create Problem</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Title</label>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Two Sum"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="two-sum"
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
              <p className="mt-1 text-xs">Manually reviewed by an admin.</p>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Statement (Markdown)</label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent font-mono"
            placeholder="## Problem Statement&#10;&#10;Given an array of integers..."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
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
              min={100}
              max={10000}
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
              min={16}
              disabled={problemType === 'subjective'}
              className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">
            Default Points (optional, used as default in contests)
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
            disabled={createMutation.isPending}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg transition-colors',
              createMutation.isPending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent-hover',
            )}
          >
            <Save size={16} />
            {createMutation.isPending ? 'Creating...' : 'Create Problem'}
          </button>
        </div>
      </form>
    </div>
  );
}
