import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Contest, PaginatedResponse } from '@/types';

const statusColors: Record<string, string> = {
  draft: 'bg-text-muted/15 text-text-muted',
  upcoming: 'bg-accent-subtle text-accent',
  running: 'bg-success/15 text-success',
  ended: 'bg-warning/15 text-warning',
  finalized: 'bg-bg-secondary text-text-muted',
};

export function ContestListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'contests', page, statusFilter],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Contest>>(
        `/admin/contests?page=${page}&limit=${limit}${statusFilter ? `&status=${statusFilter}` : ''}`,
      ),
  });

  const contests = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Contests</h1>
        <button
          onClick={() => navigate('/contests/new')}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} /> New Contest
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="upcoming">Upcoming</option>
          <option value="running">Running</option>
          <option value="ended">Ended</option>
          <option value="finalized">Finalized</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">Title</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Scoring</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Start</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Problems</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Participants</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">Loading...</td>
              </tr>
            )}
            {!isLoading && contests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">No contests found</td>
              </tr>
            )}
            {contests.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border last:border-0 hover:bg-accent-subtle/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/contests/${c.id}`)}
              >
                <td className="px-4 py-3 font-medium text-text">{c.title}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusColors[c.status])}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 uppercase text-text-muted">{c.scoring_type}</td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(c.start_time).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-text-muted">{c.duration_minutes}m</td>
                <td className="px-4 py-3 text-text-muted">{c.problems_count}</td>
                <td className="px-4 py-3 text-text-muted">{c.participants_count}</td>
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
              className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm text-text-muted">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
