import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient, buildQueryString } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Plus, Search, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Problem, PaginatedResponse, ProblemStatus } from '@/types';

export function ProblemListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState<'' | ProblemStatus>('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'problems', page, search, difficulty, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Problem>>(
        `/admin/problems${buildQueryString({ page, search, difficulty, status })}`,
      ),
  });

  const problems = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pages ?? Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Problems</h1>
        <button
          onClick={() => navigate('/problems/new')}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          New Problem
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search problems..."
            className="w-full rounded-lg border border-border bg-panel py-2 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent transition-colors"
          />
        </div>
        <select
          value={difficulty}
          onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as '' | ProblemStatus); setPage(1); }}
          className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">Title</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Difficulty</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Type</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Tests</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Creator</th>
              <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">Loading...</td>
              </tr>
            )}
            {!isLoading && problems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">No problems found</td>
              </tr>
            )}
            {problems.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border last:border-0 hover:bg-accent-subtle/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/problems/${p.id}`)}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-text">{p.title}</p>
                    <p className="text-xs text-text-muted">{p.slug}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      p.status === 'published'
                        ? 'bg-success/15 text-success'
                        : 'bg-warning/15 text-warning',
                    )}
                    title={
                      p.status === 'published'
                        ? `Visible to students since ${p.published_at ?? ''}`
                        : 'Hidden from students until published'
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      p.difficulty === 'easy' && 'bg-success/15 text-success',
                      p.difficulty === 'medium' && 'bg-warning/15 text-warning',
                      p.difficulty === 'hard' && 'bg-error/15 text-error',
                    )}
                  >
                    {p.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    p.problem_type === 'subjective'
                      ? 'bg-accent-subtle/50 text-accent'
                      : 'bg-bg-secondary text-text-muted',
                  )}>
                    {p.problem_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{p.test_count ?? 0}</td>
                <td className="px-4 py-3 text-text-muted">{p.creator_name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/problems/${p.id}`)}
                      className="rounded p-1.5 text-text-muted hover:bg-accent-subtle hover:text-accent"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => navigate(`/problems/${p.id}/edit`)}
                      className="rounded p-1.5 text-text-muted hover:bg-accent-subtle hover:text-accent"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-subtle hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-subtle hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
