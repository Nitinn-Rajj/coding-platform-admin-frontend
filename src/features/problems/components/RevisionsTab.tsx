import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { RotateCcw, Clock } from 'lucide-react';
import type { ProblemRevision } from '@/types';

interface Props {
  problemId: string;
}

export function RevisionsTab({ problemId }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'problem', problemId, 'revisions'],
    queryFn: () =>
      apiClient.get<{ revisions: ProblemRevision[] }>(`/admin/problems/${problemId}/revisions`),
  });

  const activateMutation = useMutation({
    mutationFn: (rev: number) =>
      apiClient.post(`/admin/problems/${problemId}/revisions/${rev}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId, 'revisions'] });
    },
  });

  const revisions = data?.revisions ?? [];

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading revisions...</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text">{revisions.length} revision(s)</h3>

      {revisions.map((rev) => (
        <div
          key={rev.revision}
          className={cn(
            'rounded-lg border bg-panel px-4 py-3',
            rev.revision === revisions[0]?.revision
              ? 'border-accent/40'
              : 'border-border',
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-accent-subtle text-xs font-bold text-accent">
                {rev.revision}
              </span>
              <div>
                <p className="text-sm font-medium text-text">{rev.title}</p>
                <p className="text-xs text-text-muted">
                  {rev.difficulty} · {rev.time_limit_ms}ms · {rev.memory_limit_mb}MB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="flex items-center gap-1 text-xs text-text-muted">
                  <Clock size={10} />
                  {new Date(rev.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Activate revision ${rev.revision}? This will overwrite the current statement.`))
                    activateMutation.mutate(rev.revision);
                }}
                disabled={activateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-accent-subtle hover:text-text disabled:opacity-50"
              >
                <RotateCcw size={12} /> Restore
              </button>
            </div>
          </div>
        </div>
      ))}

      {revisions.length === 0 && (
        <p className="py-6 text-center text-sm text-text-muted">No revisions yet</p>
      )}
    </div>
  );
}
