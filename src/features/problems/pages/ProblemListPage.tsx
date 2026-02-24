import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Problem, PaginatedResponse } from '@/types';

export function ProblemListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'problems', page, search],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Problem>>(
        `/admin/problems?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
  });

  const problems = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search problems..."
          className="w-full rounded-lg border border-border bg-panel py-2 pl-10 pr-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">Title</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Difficulty</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Tests</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Published</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Tags</th>
              <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading...</td>
              </tr>
            )}
            {!isLoading && problems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">No problems found</td>
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
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      p.difficulty === 'easy' && 'bg-success/15 text-success',
                      p.difficulty === 'medium' && 'bg-warning/15 text-warning',
                      p.difficulty === 'hard' && 'bg-error/15 text-error',
                    )}
                  >
                    {p.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{p.test_count ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex h-2 w-2 rounded-full',
                    p.is_published ? 'bg-success' : 'bg-text-muted',
                  )} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(p.tags ?? []).slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs text-text-muted">{t}</span>
                    ))}
                  </div>
                </td>
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
                    <button className="rounded p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
