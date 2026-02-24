import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Play, Zap, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { ProblemComponent, TestResult, StressTestResult } from '@/types';

interface Props {
  problemId: string;
}

const verdictColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  accepted: { bg: 'bg-success/15', text: 'text-success', icon: CheckCircle },
  wrong_answer: { bg: 'bg-error/15', text: 'text-error', icon: XCircle },
  time_limit_exceeded: { bg: 'bg-warning/15', text: 'text-warning', icon: Clock },
  runtime_error: { bg: 'bg-error/15', text: 'text-error', icon: AlertTriangle },
  compilation_error: { bg: 'bg-error/15', text: 'text-error', icon: XCircle },
};

export function TestingTab({ problemId }: Props) {
  const [selectedSolution, setSelectedSolution] = useState('');
  const [stressBruteId, setStressBruteId] = useState('');
  const [stressIterations, setStressIterations] = useState(100);

  const { data: solutionsData } = useQuery({
    queryKey: ['admin', 'problem', problemId, 'solutions'],
    queryFn: () =>
      apiClient.get<{ solutions: ProblemComponent[] }>(`/admin/problems/${problemId}/solutions`),
  });

  const solutions = solutionsData?.solutions ?? [];

  const testMutation = useMutation({
    mutationFn: (solutionId: string) =>
      apiClient.post<{ results: TestResult[]; overall_verdict: string }>(
        `/admin/problems/${problemId}/test-solutions`,
        { solution_id: solutionId },
      ),
  });

  const stressMutation = useMutation({
    mutationFn: (payload: { solution_id: string; brute_solution_id: string; iterations: number }) =>
      apiClient.post<StressTestResult>(
        `/admin/problems/${problemId}/stress-test`,
        payload,
      ),
  });

  const handleTestSolution = () => {
    if (!selectedSolution) return;
    testMutation.mutate(selectedSolution);
  };

  const handleStressTest = () => {
    if (!selectedSolution || !stressBruteId) return;
    stressMutation.mutate({
      solution_id: selectedSolution,
      brute_solution_id: stressBruteId,
      iterations: stressIterations,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── Test Solution ─── */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-4">
        <h3 className="text-sm font-semibold text-text">Test Solution Against All Tests</h3>

        <div className="flex items-center gap-3">
          <select
            value={selectedSolution}
            onChange={(e) => setSelectedSolution(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Select a solution...</option>
            {solutions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.solution_type ?? 'main'})
              </option>
            ))}
          </select>
          <button
            onClick={handleTestSolution}
            disabled={!selectedSolution || testMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
          >
            <Play size={14} /> {testMutation.isPending ? 'Running...' : 'Run Tests'}
          </button>
        </div>

        {/* Results */}
        {testMutation.isSuccess && testMutation.data && (
          <div className="space-y-3">
            <div className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              testMutation.data.overall_verdict === 'accepted'
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error',
            )}>
              {testMutation.data.overall_verdict === 'accepted' ? (
                <CheckCircle size={16} />
              ) : (
                <XCircle size={16} />
              )}
              Overall: {testMutation.data.overall_verdict.replace(/_/g, ' ').toUpperCase()}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-secondary">
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Verdict</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Memory</th>
                  </tr>
                </thead>
                <tbody>
                  {testMutation.data.results.map((r) => {
                    const v = verdictColors[r.verdict] ?? verdictColors.runtime_error;
                    const Icon = v.icon;
                    return (
                      <tr key={r.test_index} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text-muted">{r.test_index + 1}</td>
                        <td className="px-3 py-2">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', v.bg, v.text)}>
                            <Icon size={12} />
                            {r.verdict.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-muted">{r.time_ms} ms</td>
                        <td className="px-3 py-2 text-text-muted">{Math.round(r.memory_kb / 1024)} MB</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {testMutation.isError && (
          <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {testMutation.error instanceof Error ? testMutation.error.message : 'Test run failed'}
          </div>
        )}
      </div>

      {/* ─── Stress Test ─── */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-4">
        <h3 className="text-sm font-semibold text-text">Stress Test</h3>
        <p className="text-xs text-text-muted">
          Compares a main solution against a brute-force solution on randomly generated inputs.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs text-text-muted">Main Solution</label>
            <select
              value={selectedSolution}
              onChange={(e) => setSelectedSolution(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="">Select...</option>
              {solutions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Brute Solution</label>
            <select
              value={stressBruteId}
              onChange={(e) => setStressBruteId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="">Select...</option>
              {solutions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Iterations</label>
            <input
              type="number"
              value={stressIterations}
              onChange={(e) => setStressIterations(Number(e.target.value))}
              min={1}
              max={1000}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          onClick={handleStressTest}
          disabled={!selectedSolution || !stressBruteId || stressMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-warning/20 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/30 disabled:opacity-50"
        >
          <Zap size={14} /> {stressMutation.isPending ? 'Running...' : 'Start Stress Test'}
        </button>

        {stressMutation.isSuccess && stressMutation.data && (
          <div className={cn(
            'rounded-lg border px-3 py-3 text-sm space-y-2',
            stressMutation.data.status === 'passed'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error',
          )}>
            <p className="font-medium">
              {stressMutation.data.status === 'passed'
                ? `All ${stressMutation.data.iterations_run} iterations passed`
                : `Mismatch found after ${stressMutation.data.iterations_run} iteration(s)`}
            </p>
            {stressMutation.data.failing_input && (
              <div>
                <p className="text-xs mb-1">Failing Input:</p>
                <pre className="max-h-32 overflow-auto rounded bg-bg p-2 text-xs font-mono text-text">
                  {stressMutation.data.failing_input}
                </pre>
              </div>
            )}
            {stressMutation.data.main_output && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs mb-1">Main Output:</p>
                  <pre className="max-h-24 overflow-auto rounded bg-bg p-2 text-xs font-mono text-text">
                    {stressMutation.data.main_output}
                  </pre>
                </div>
                <div>
                  <p className="text-xs mb-1">Brute Output:</p>
                  <pre className="max-h-24 overflow-auto rounded bg-bg p-2 text-xs font-mono text-text">
                    {stressMutation.data.brute_output}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
