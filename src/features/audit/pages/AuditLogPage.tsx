import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { AuditLogEntry, PaginatedResponse } from '@/types';

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-log', page, actionFilter, entityFilter],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AuditLogEntry>>(
        `/admin/audit-log?page=${page}&limit=${limit}${actionFilter ? `&action=${actionFilter}` : ''}${entityFilter ? `&entity_type=${entityFilter}` : ''}`,
      ),
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const actionColors: Record<string, string> = {
    create: 'text-success',
    update: 'text-accent',
    delete: 'text-error',
    publish: 'text-warning',
    activate: 'text-accent',
    grant_access: 'text-success',
    revoke_access: 'text-error',
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-text">Audit Log</h1>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={16} className="text-text-muted" />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="publish">Publish</option>
          <option value="activate">Activate</option>
          <option value="grant_access">Grant Access</option>
          <option value="revoke_access">Revoke Access</option>
        </select>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All entities</option>
          <option value="problem">Problem</option>
          <option value="contest">Contest</option>
          <option value="test_case">Test Case</option>
          <option value="generator">Generator</option>
          <option value="validator">Validator</option>
          <option value="checker">Checker</option>
          <option value="solution">Solution</option>
          <option value="user">User</option>
        </select>
        <span className="ml-auto text-sm text-text-muted">{total} entries</span>
      </div>

      {/* Log entries */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-muted">Time</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">User</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Action</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Entity</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">Loading...</td>
              </tr>
            )}
            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No audit entries found</td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text">{entry.username}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={actionColors[entry.action] ?? 'text-text-muted'}>
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text-muted">{entry.entity_type}</span>
                  <span className="ml-1 text-xs text-text-muted/50">#{entry.entity_id}</span>
                </td>
                <td className="px-4 py-3">
                  {entry.details && (
                    <pre className="max-w-xs truncate text-xs text-text-muted">
                      {JSON.stringify(entry.details)}
                    </pre>
                  )}
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
