import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  AlertCircle, CheckCircle, Download, FileDown, Play, ShieldAlert, Users,
} from 'lucide-react';

interface PlagCheckPair {
  problem_id: number;
  problem_slug: string;
  user_a_id: number;
  user_a_username: string;
  submission_a_id: number;
  user_b_id: number;
  user_b_username: string;
  submission_b_id: number;
  similarity: number;
  hamming_distance: number;
}

interface PlagCheckCluster {
  problem_id: number;
  problem_slug: string;
  user_ids: number[];
  usernames: string[];
}

interface PlagCheckResponse {
  threshold: number;
  compared_count: number;
  eligible_count: number;
  matched_user_count: number;
  matches: PlagCheckPair[];
  clusters: PlagCheckCluster[];
  duration_ms: number;
}

interface Props {
  contestId: number;
  contestTitle: string;
}

export function PlagCheckTab({ contestId, contestTitle }: Props) {
  const [thresholdPct, setThresholdPct] = useState(90);
  const [sortKey, setSortKey] = useState<'similarity' | 'problem' | 'user_a'>('similarity');

  const mutation = useMutation({
    mutationFn: (threshold: number) =>
      apiClient.post<PlagCheckResponse>(
        `/admin/contests/${contestId}/plag-check`,
        { threshold },
      ),
  });

  const handleStart = () => {
    mutation.mutate(thresholdPct / 100);
  };

  const data = mutation.data;

  const sortedMatches = useMemo(() => {
    if (!data) return [] as PlagCheckPair[];
    const copy = [...data.matches];
    copy.sort((a, b) => {
      if (sortKey === 'similarity') return b.similarity - a.similarity;
      if (sortKey === 'problem') {
        if (a.problem_id !== b.problem_id) return a.problem_id - b.problem_id;
        return b.similarity - a.similarity;
      }
      if (a.user_a_id !== b.user_a_id) return a.user_a_id - b.user_a_id;
      return b.similarity - a.similarity;
    });
    return copy;
  }, [data, sortKey]);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'problem_id', 'problem_slug',
      'user_a_id', 'user_a_username', 'submission_a_id',
      'user_b_id', 'user_b_username', 'submission_b_id',
      'similarity', 'hamming_distance',
    ];
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = sortedMatches.map((m) => [
      m.problem_id, m.problem_slug,
      m.user_a_id, m.user_a_username, m.submission_a_id,
      m.user_b_id, m.user_b_username, m.submission_b_id,
      m.similarity.toFixed(4), m.hamming_distance,
    ].map(escape).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safe = contestTitle.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'contest';
    link.href = url;
    link.download = `plag_check_${contestId}_${safe}_${thresholdPct}pct.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safe = contestTitle.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'contest';
    link.href = url;
    link.download = `plag_check_${contestId}_${safe}_${thresholdPct}pct.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-panel p-4">
        <div className="flex-1 min-w-[260px]">
          <label className="mb-1 block text-xs text-text-muted">
            Similarity threshold (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={99}
              value={thresholdPct}
              onChange={(e) => setThresholdPct(Number(e.target.value))}
              className="flex-1 accent-accent"
              disabled={mutation.isPending}
            />
            <input
              type="number"
              min={50}
              max={99}
              value={thresholdPct}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setThresholdPct(Math.min(99, Math.max(50, n)));
              }}
              className="w-20 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              disabled={mutation.isPending}
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Pairs with similarity &ge; {thresholdPct}% will be flagged. Default 85%.
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={mutation.isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg',
            mutation.isPending ? 'opacity-60' : 'hover:bg-accent-hover',
          )}
        >
          <Play size={14} />
          {mutation.isPending ? 'Analyzing...' : 'Start'}
        </button>

        {data && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text hover:bg-accent-subtle/50"
              title="Download pairs as CSV"
            >
              <FileDown size={14} /> CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text hover:bg-accent-subtle/50"
              title="Download full results as JSON"
            >
              <Download size={14} /> JSON
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {mutation.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <AlertCircle size={14} />
          {mutation.error instanceof Error ? mutation.error.message : 'Plagiarism check failed'}
        </div>
      )}

      {/* Empty / intro state */}
      {!data && !mutation.isPending && !mutation.isError && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-panel/50 px-4 py-12 text-center">
          <ShieldAlert size={28} className="text-text-muted" />
          <p className="text-sm text-text-muted">
            Click <span className="font-medium text-text">Start</span> to compare the latest submission per
            user per problem using SimHash.
          </p>
          <p className="text-xs text-text-muted">
            Runs synchronously. No results are stored; re-run any time.
          </p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Matched users" value={data.matched_user_count} highlight={data.matched_user_count > 0} />
            <StatCard label="Matched pairs" value={data.matches.length} />
            <StatCard label="Eligible submissions" value={`${data.eligible_count} / ${data.compared_count}`} />
            <StatCard label="Duration" value={`${data.duration_ms} ms`} />
          </div>

          {data.matches.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle size={14} />
              No similar submissions found above {Math.round(data.threshold * 100)}%.
            </div>
          ) : (
            <>
              {/* Clusters */}
              {data.clusters.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border bg-panel p-4">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-accent" />
                    <h3 className="text-sm font-medium text-text">
                      Similar-user clusters ({data.clusters.length})
                    </h3>
                  </div>
                  <p className="text-xs text-text-muted">
                    Users grouped together submitted near-identical code for the same problem.
                  </p>
                  <div className="space-y-2">
                    {data.clusters.map((cluster) => (
                      <div
                        key={`${cluster.problem_id}-${cluster.user_ids.join('-')}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2"
                      >
                        <span className="rounded bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                          {cluster.problem_slug}
                        </span>
                        <span className="text-xs text-text-muted">
                          {cluster.usernames.length} users:
                        </span>
                        {cluster.usernames.map((name, idx) => (
                          <span
                            key={cluster.user_ids[idx]}
                            className="rounded bg-error/10 px-2 py-0.5 text-xs text-error"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pairs table */}
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-2">
                  <h3 className="text-sm font-medium text-text">
                    Matched pairs ({data.matches.length})
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>Sort:</span>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                      className="rounded border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                    >
                      <option value="similarity">Similarity (desc)</option>
                      <option value="problem">Problem</option>
                      <option value="user_a">User A</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-secondary">
                        <th className="px-4 py-2 text-left font-medium text-text-muted">Problem</th>
                        <th className="px-4 py-2 text-left font-medium text-text-muted">User A</th>
                        <th className="px-4 py-2 text-left font-medium text-text-muted">User B</th>
                        <th className="px-4 py-2 text-right font-medium text-text-muted">Similarity</th>
                        <th className="px-4 py-2 text-right font-medium text-text-muted">Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMatches.map((m) => (
                        <tr
                          key={`${m.submission_a_id}-${m.submission_b_id}`}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-2">
                            <span className="rounded bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                              {m.problem_slug}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <a
                              href={`/submissions/${m.submission_a_id}`}
                              className="font-medium text-text hover:text-accent hover:underline"
                            >
                              {m.user_a_username}
                            </a>
                            <p className="font-mono text-xs text-text-muted">#{m.submission_a_id}</p>
                          </td>
                          <td className="px-4 py-2">
                            <a
                              href={`/submissions/${m.submission_b_id}`}
                              className="font-medium text-text hover:text-accent hover:underline"
                            >
                              {m.user_b_username}
                            </a>
                            <p className="font-mono text-xs text-text-muted">#{m.submission_b_id}</p>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                m.similarity >= 0.95
                                  ? 'bg-error/20 text-error'
                                  : m.similarity >= 0.9
                                    ? 'bg-warning/20 text-warning'
                                    : 'bg-accent-subtle text-accent',
                              )}
                            >
                              {(m.similarity * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-text-muted">
                            {m.hamming_distance} / 64
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, highlight = false,
}: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        highlight ? 'border-error/40 bg-error/10' : 'border-border bg-panel',
      )}
    >
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn('text-lg font-semibold', highlight ? 'text-error' : 'text-text')}>{value}</p>
    </div>
  );
}
