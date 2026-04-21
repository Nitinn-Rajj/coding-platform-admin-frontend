import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Lock, Play, Save, Unlock } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { AdminSubmissionDetail, SubmissionStatus } from '@/types';
import { StatusBadge } from '../components/StatusBadge';

interface SandboxResult {
  verdict?: string;
  stdout?: string;
  stderr?: string;
  time_ms?: number;
  memory_kb?: number;
  error?: string;
}

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const navigationState = location.state as { backTo?: string; backLabel?: string } | null;
  const backTo = navigationState?.backTo || '/submissions';
  const backLabel = navigationState?.backLabel || 'Back to submissions';

  const { data: submission, isLoading } = useQuery({
    queryKey: ['admin', 'submission', id],
    queryFn: () => apiClient.get<AdminSubmissionDetail>(`/admin/submissions/${id}`),
    enabled: !!id,
  });

  const [manualScore, setManualScore] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [statusOverride, setStatusOverride] = useState<SubmissionStatus | ''>('');
  const [input, setInput] = useState<string>('');
  const [runResult, setRunResult] = useState<SandboxResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (submission) {
      setManualScore(
        submission.manual_score !== null && submission.manual_score !== undefined
          ? String(submission.manual_score)
          : '',
      );
      setFeedback(submission.feedback ?? '');
      setStatusOverride(submission.status);
    }
  }, [submission]);

  const gradeMutation = useMutation({
    mutationFn: (payload: {
      manual_score?: number | null;
      feedback?: string;
      status?: string;
      lock?: boolean;
    }) => apiClient.put(`/admin/submissions/${id}/grade`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'submission', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const runMutation = useMutation({
    mutationFn: (payload: { input: string }) =>
      apiClient.post<SandboxResult>(`/admin/submissions/${id}/run`, payload),
    onSuccess: (r) => {
      setRunResult(r);
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (isLoading || !submission) {
    return <p className="text-sm text-text-muted">Loading...</p>;
  }

  const editorLanguage = (() => {
    switch (submission.language) {
      case 'cpp': return 'cpp';
      case 'c': return 'c';
      case 'python': return 'python';
      case 'java': return 'java';
      case 'javascript': case 'js': return 'javascript';
      case 'typescript': case 'ts': return 'typescript';
      case 'go': return 'go';
      case 'rust': return 'rust';
      default: return 'plaintext';
    }
  })();

  const saveGrade = () => {
    const payload: Parameters<typeof gradeMutation.mutate>[0] = {};
    const parsed = manualScore === '' ? null : Number(manualScore);
    if (parsed !== null && Number.isNaN(parsed)) {
      setActionError('Score must be a number');
      return;
    }
    payload.manual_score = parsed;
    payload.feedback = feedback;
    if (statusOverride && statusOverride !== submission.status) {
      payload.status = statusOverride;
    }
    gradeMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(backTo)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft size={14} /> {backLabel}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">
            Submission #{submission.id}
          </h1>
          <p className="text-sm text-text-muted">
            <span className="font-medium text-text">{submission.username}</span> on{' '}
            <span className="font-medium text-text">{submission.problem_slug}</span>
            {submission.contest_name && <> · {submission.contest_name}</>} ·{' '}
            {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={submission.status} />
          {submission.problem_type === 'subjective' && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
              SUBJECTIVE
            </span>
          )}
          {submission.is_locked ? (
            <button
              disabled={gradeMutation.isPending}
              onClick={() => gradeMutation.mutate({ lock: false })}
              className="flex items-center gap-1 rounded-lg border border-warning/40 px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/10 transition-colors disabled:opacity-60"
            >
              <Unlock size={12} /> Unlock
            </button>
          ) : (
            <button
              disabled={gradeMutation.isPending}
              onClick={() => gradeMutation.mutate({ lock: true })}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-accent-subtle hover:text-text transition-colors disabled:opacity-60"
            >
              <Lock size={12} /> Lock
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{actionError}</p>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Source Code */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="overflow-hidden rounded-xl border border-border bg-panel">
            <div className="flex items-center justify-between border-b border-border bg-bg-secondary px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-text-muted">
                Source · {submission.language}
              </p>
              {submission.total_count > 0 && (
                <p className="text-xs text-text-muted">
                  Tests: {submission.passed_count}/{submission.total_count}
                </p>
              )}
            </div>
            <Editor
              height="440px"
              theme="vs-dark"
              language={editorLanguage}
              value={submission.source_code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
              }}
            />
          </div>

          {/* Run in sandbox */}
          <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text">Run in sandbox</h3>
              <button
                onClick={() => runMutation.mutate({ input })}
                disabled={runMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-hover disabled:opacity-60 transition-colors"
              >
                <Play size={12} /> {runMutation.isPending ? 'Running...' : 'Run'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-text-muted mb-1">Input (stdin)</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-xs font-mono text-text outline-none focus:border-accent resize-none"
                  placeholder="Optional input passed to the program"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Output</label>
                <pre className="min-h-[148px] rounded-lg border border-border bg-bg-secondary p-2 text-xs text-text font-mono overflow-auto whitespace-pre-wrap break-words">
                  {runResult ? (
                    <>
                      {runResult.verdict && (
                        <div className="text-text-muted mb-1">verdict: <span className="text-text">{runResult.verdict}</span></div>
                      )}
                      {typeof runResult.time_ms === 'number' && (
                        <div className="text-text-muted mb-1">time: <span className="text-text">{runResult.time_ms}ms</span></div>
                      )}
                      {runResult.stdout && <div className="text-text whitespace-pre-wrap">{runResult.stdout}</div>}
                      {runResult.stderr && <div className="text-danger whitespace-pre-wrap">{runResult.stderr}</div>}
                      {runResult.error && <div className="text-danger whitespace-pre-wrap">{runResult.error}</div>}
                    </>
                  ) : (
                    <span className="text-text-muted/70">No output yet</span>
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Grading sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
            <h3 className="text-sm font-medium text-text">Grade</h3>

            <div>
              <label className="block text-xs text-text-muted mb-1">
                Manual score{submission.max_points ? ` (out of ${submission.max_points})` : ''}
              </label>
              <input
                value={manualScore}
                onChange={(e) => setManualScore(e.target.value)}
                type="number"
                disabled={submission.is_locked}
                className="w-full rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Override status</label>
              <select
                value={statusOverride}
                onChange={(e) => setStatusOverride(e.target.value as SubmissionStatus)}
                disabled={submission.is_locked}
                className="w-full rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-60"
              >
                {[
                  'pending',
                  'pending_review',
                  'accepted',
                  'rejected',
                  'wrong_answer',
                  'time_limit_exceeded',
                  'memory_limit_exceeded',
                  'runtime_error',
                  'compilation_error',
                  'partial',
                ].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Feedback to student</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text outline-none focus:border-accent resize-none"
                placeholder="Notes on correctness, style, efficiency…"
              />
            </div>

            <button
              onClick={saveGrade}
              disabled={gradeMutation.isPending || submission.is_locked}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-60 transition-colors"
            >
              <Save size={14} /> {gradeMutation.isPending ? 'Saving...' : 'Save grade'}
            </button>

            {submission.grader_name && (
              <p className="text-xs text-text-muted">
                Last graded by <span className="text-text">{submission.grader_name}</span>
                {submission.graded_at && <> · {new Date(submission.graded_at).toLocaleString()}</>}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-panel p-4 space-y-2 text-sm">
            <h3 className="text-sm font-medium text-text">Submission info</h3>
            <Row label="User" value={`${submission.username} (#${submission.user_id})`} />
            <Row label="Problem" value={submission.problem_slug} />
            {submission.contest_name && <Row label="Contest" value={submission.contest_name} />}
            <Row label="Language" value={submission.language} />
            {submission.total_count > 0 && (
              <Row label="Tests" value={`${submission.passed_count} / ${submission.total_count}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <span className="text-sm text-text">{value}</span>
    </div>
  );
}
