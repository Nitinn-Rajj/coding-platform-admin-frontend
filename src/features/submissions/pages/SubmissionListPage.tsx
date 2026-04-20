import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient, buildQueryString } from '@/lib/api-client';
import { ChevronLeft, ChevronRight, Lock, MessageSquare } from 'lucide-react';
import type { AdminSubmissionSummary, PaginatedResponse, ProblemType, SubmissionStatus } from '@/types';
import { StatusBadge } from '../components/StatusBadge';

const PROBLEM_TYPES: Array<{ value: '' | ProblemType; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'standard', label: 'Standard' },
  { value: 'subjective', label: 'Subjective' },
];

const STATUS_OPTIONS: Array<{ value: '' | SubmissionStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'wrong_answer', label: 'Wrong answer' },
  { value: 'time_limit_exceeded', label: 'Time limit' },
  { value: 'memory_limit_exceeded', label: 'Memory limit' },
  { value: 'runtime_error', label: 'Runtime error' },
  { value: 'compilation_error', label: 'Compilation error' },
  { value: 'partial', label: 'Partial' },
];

export function SubmissionListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | SubmissionStatus>('');
  const [problemType, setProblemType] = useState<'' | ProblemType>('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [contestIdFilter, setContestIdFilter] = useState('');
  const [lockedFilter, setLockedFilter] = useState<'' | 'true' | 'false'>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'submissions', page, status, problemType, userIdFilter, contestIdFilter, lockedFilter],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AdminSubmissionSummary>>(
        `/admin/submissions${buildQueryString({
          page,
          status,
          problem_type: problemType,
          user_id: userIdFilter,
          contest_id: contestIdFilter,
          locked: lockedFilter,
        })}`,
      ),
  });

  const rows = data?.data ?? [];
  const totalPages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text">Submissions</h1>
        <p className="text-sm text-text-muted">
          View and grade all submissions across users, contests and problems.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-panel p-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as '' | SubmissionStatus); setPage(1); }}
            className="rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Type</label>
          <select
            value={problemType}
            onChange={(e) => { setProblemType(e.target.value as '' | ProblemType); setPage(1); }}
            className="rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          >
            {PROBLEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Contest ID</label>
          <input
            value={contestIdFilter}
            onChange={(e) => { setContestIdFilter(e.target.value); setPage(1); }}
            type="number"
            className="w-28 rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">User ID</label>
          <input
            value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
            type="number"
            className="w-28 rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Locked</label>
          <select
            value={lockedFilter}
            onChange={(e) => { setLockedFilter(e.target.value as '' | 'true' | 'false'); setPage(1); }}
            className="rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Any</option>
            <option value="true">Locked</option>
            <option value="false">Unlocked</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">#</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">User</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Problem</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Contest</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Lang</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Score</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">No submissions found</td></tr>
            )}
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => navigate(`/submissions/${s.id}`)}
                className="border-b border-border last:border-0 cursor-pointer hover:bg-accent-subtle/30 transition-colors"
              >
                <td className="px-4 py-3 text-text-muted font-mono text-xs">#{s.id}</td>
                <td className="px-4 py-3 text-text">
                  <span className="font-medium">{s.username}</span>
                  <span className="ml-2 text-xs text-text-muted">#{s.user_id}</span>
                </td>
                <td className="px-4 py-3 text-text">
                  <span className="font-medium">{s.problem_slug}</span>
                  {s.problem_type === 'subjective' && (
                    <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                      SUBJECTIVE
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {s.contest_name || <span className="text-text-muted/60">—</span>}
                </td>
                <td className="px-4 py-3 text-text-muted uppercase text-xs">{s.language}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={s.status} />
                    {s.is_locked && (
                      <span title="Locked">
                        <Lock size={12} className="text-warning" />
                      </span>
                    )}
                    {s.has_feedback && (
                      <span title="Has feedback">
                        <MessageSquare size={12} className="text-accent" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {s.manual_score !== null && s.manual_score !== undefined
                    ? <span className="font-mono text-text">{s.manual_score}</span>
                    : (s.total_count > 0 ? <span className="text-xs">{s.passed_count}/{s.total_count}</span> : <span className="text-text-muted/60">—</span>)}
                </td>
                <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                  {new Date(s.submitted_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Page {page} of {totalPages} · {total} submissions
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
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
