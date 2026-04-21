import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Save, Wand2, ShieldCheck, GripVertical,
  AlertCircle, Pencil, X, ChevronDown, ChevronRight,
  CheckSquare, Square, Play, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import type { ProblemComponent, TestCase, ValidateTestsResponse, ValidationFailure } from '@/types';

interface Props {
  problemId: string;
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export function TestCasesTab({ problemId }: Props) {
  const queryClient = useQueryClient();
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId, 'tests'] }),
    [queryClient, problemId],
  );

  /* ── panel visibility ── */
  const [showCreate, setShowCreate]     = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  /* ── create form ── */
  const [newInput, setNewInput]       = useState('');
  const [newOutput, setNewOutput]     = useState('');
  const [newIsSample, setNewIsSample] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ── generate form ── */
  const [genCount, setGenCount]           = useState(10);
  const [genArgs, setGenArgs]             = useState('');
  const [genSolutionId, setGenSolutionId] = useState<string>('');

  /* ── selection ── */
  const [selected, setSelected] = useState<Set<number>>(new Set());

  /* ── run-solution picker for bulk action ── */
  const [bulkSolnId, setBulkSolnId] = useState<string>('');

  /* ── validate result state ── */
  const [validateResult, setValidateResult] = useState<ValidateTestsResponse | null>(null);
  // IDs being edited directly from the validation panel
  const [validationEditingId, setValidationEditingId] = useState<number | null>(null);

  /* ── queries ── */
  const { data: testsData, isLoading } = useQuery({
    queryKey: ['admin', 'problem', problemId, 'tests'],
    queryFn: () =>
      apiClient.get<{ tests: TestCase[]; total: number }>(
        `/admin/problems/${problemId}/tests?limit=500`,
      ),
  });

  const { data: solutionsData } = useQuery({
    queryKey: ['admin', 'problem', problemId, 'solutions'],
    queryFn: () =>
      apiClient.get<{ solutions: ProblemComponent[] }>(
        `/admin/problems/${problemId}/solutions`,
      ),
  });

  const testList  = testsData?.tests   ?? [];
  const solutions = solutionsData?.solutions ?? [];
  const allIds    = testList.map((t) => t.id);
  const allSelected  = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  /* ── mutations ── */
  const createMutation = useMutation({
    mutationFn: (p: { input: string; expected_output: string; is_sample: boolean }) =>
      apiClient.post(`/admin/problems/${problemId}/tests`, p),
    onSuccess: () => {
      invalidate();
      setShowCreate(false); setNewInput(''); setNewOutput(''); setNewIsSample(false); setCreateError(null);
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Failed to create test'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/admin/problems/${problemId}/tests/${id}`),
    onSuccess: invalidate,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.delete(`/admin/problems/${problemId}/tests/bulk`, { ids }),
    onSuccess: () => { invalidate(); setSelected(new Set()); },
  });

  const bulkSampleMutation = useMutation({
    mutationFn: ({ ids, isSample }: { ids: number[]; isSample: boolean }) =>
      apiClient.patch(`/admin/problems/${problemId}/tests/bulk`, { ids, is_sample: isSample }),
    onSuccess: () => { invalidate(); setSelected(new Set()); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input, expected_output, is_sample }: {
      id: number; input: string; expected_output: string; is_sample: boolean;
    }) => apiClient.put(`/admin/problems/${problemId}/tests/${id}`, { input, expected_output, is_sample }),
    onSuccess: invalidate,
  });

  // Run a solution on a single test case to fill expected_output
  const runSolnMutation = useMutation({
    mutationFn: ({ testId, solutionId }: { testId: number; solutionId?: number }) =>
      apiClient.post<{ success: boolean; expected_output: string; status: string; error?: string; time_ms?: number }>(
        `/admin/problems/${problemId}/tests/${testId}/run-solution`,
        solutionId ? { solution_id: solutionId } : {},
      ),
    onSuccess: () => invalidate(),
  });

  // Bulk run solution on all selected tests sequentially
  const [bulkRunProgress, setBulkRunProgress] = useState<null | { done: number; total: number }>(null);
  const handleBulkRunSolution = async () => {
    const ids = [...selected];
    const solnIdNum = bulkSolnId ? Number(bulkSolnId) : undefined;
    setBulkRunProgress({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i++) {
      await apiClient.post(
        `/admin/problems/${problemId}/tests/${ids[i]}/run-solution`,
        solnIdNum ? { solution_id: solnIdNum } : {},
      ).catch(() => {/* skip failures */});
      setBulkRunProgress({ done: i + 1, total: ids.length });
    }
    setBulkRunProgress(null);
    invalidate();
    setSelected(new Set());
  };

  const validateMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ValidateTestsResponse>(`/admin/problems/${problemId}/tests/validate`),
    onSuccess: (data) => setValidateResult(data),
    onError: () => setValidateResult(null),
  });

  // Delete a single failing test directly from the validation panel
  const deleteSingleMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/admin/problems/${problemId}/tests/${id}`),
    onSuccess: (_data, id) => {
      invalidate();
      setValidateResult((prev) =>
        prev ? { ...prev, failures: prev.failures.filter((f) => f.test_id !== id), passed: prev.passed } : null,
      );
    },
  });

  // Delete all failing tests from the validation panel in one request
  const deleteAllFailedMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.delete(`/admin/problems/${problemId}/tests/bulk`, { ids }),
    onSuccess: () => { invalidate(); setValidateResult(null); },
  });

  const generateMutation = useMutation({
    mutationFn: (p: { count: number; args: string; generate_output_with_solution_id?: number }) =>
      apiClient.post(`/admin/problems/${problemId}/tests/generate`, p),
    onSuccess: () => { invalidate(); setShowGenerate(false); },
  });

  /* ── helpers ── */
  const toggleSelect = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selected.size} test case(s)? This cannot be undone.`)) return;
    bulkDeleteMutation.mutate([...selected]);
  };

  const handleGenerate = () => {
    const payload: Parameters<typeof generateMutation.mutate>[0] = { count: genCount, args: genArgs };
    if (genSolutionId) payload.generate_output_with_solution_id = Number(genSolutionId);
    generateMutation.mutate(payload);
  };

  /* ─── render ─── */
  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateError(null); }}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          <Plus size={14} /> Add Test
        </button>
        <button
          onClick={() => setShowGenerate(!showGenerate)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-accent-subtle"
        >
          <Wand2 size={14} /> Generate
        </button>
        <button
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-accent-subtle disabled:opacity-50"
        >
          <ShieldCheck size={14} />
          {validateMutation.isPending ? 'Validating…' : 'Validate All'}
        </button>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="ml-auto flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5">
            <span className="text-xs font-medium text-text-muted">{selected.size} selected</span>

            {/* Run solution on selected — with solution picker */}
            <div className="flex items-center gap-1">
              <select
                value={bulkSolnId}
                onChange={(e) => setBulkSolnId(e.target.value)}
                className="rounded border border-border bg-bg px-2 py-0.5 text-xs text-text outline-none focus:border-accent"
              >
                <option value="">Main solution</option>
                {solutions.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}{s.tag ? ` (${s.tag})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkRunSolution}
                disabled={!!bulkRunProgress}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-accent hover:bg-accent-subtle disabled:opacity-50"
                title="Run solution on selected tests to fill expected output"
              >
                {bulkRunProgress
                  ? <><Loader2 size={12} className="animate-spin" /> {bulkRunProgress.done}/{bulkRunProgress.total}</>
                  : <><Play size={12} /> Run Solution</>}
              </button>
            </div>

            <div className="h-4 w-px bg-border" />
            <button
              onClick={() => bulkSampleMutation.mutate({ ids: [...selected], isSample: true })}
              disabled={bulkSampleMutation.isPending}
              className="rounded px-2 py-1 text-xs font-medium text-accent hover:bg-accent-subtle disabled:opacity-50"
            >Set Sample</button>
            <button
              onClick={() => bulkSampleMutation.mutate({ ids: [...selected], isSample: false })}
              disabled={bulkSampleMutation.isPending}
              className="rounded px-2 py-1 text-xs font-medium text-text-muted hover:bg-accent-subtle disabled:opacity-50"
            >Unset Sample</button>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-error hover:bg-error/10 disabled:opacity-50"
            >
              <Trash2 size={12} /> {bulkDeleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={() => setSelected(new Set())} className="rounded p-1 text-text-muted hover:text-text">
              <X size={14} />
            </button>
          </div>
        )}

        {!someSelected && (
          <span className="ml-auto text-sm text-text-muted">{testList.length} test(s)</span>
        )}
      </div>

      {/* ── Validate error (network / no validator) ── */}
      {validateMutation.isError && (
        <Banner variant="error">
          {validateMutation.error instanceof Error ? validateMutation.error.message : 'Validation failed'}
        </Banner>
      )}

      {/* ── Validate results panel ── */}
      {validateResult && (
        <ValidateResultPanel
          result={validateResult}
          editingId={validationEditingId}
          onSetEditing={setValidationEditingId}
          onDeleteOne={(id) => deleteSingleMutation.mutate(id)}
          onDeleteAllFailed={() => {
            const ids = validateResult.failures.map((f) => f.test_id);
            if (confirm(`Delete all ${ids.length} failing test(s)? This cannot be undone.`))
              deleteAllFailedMutation.mutate(ids);
          }}
          onSave={(id, input, expected_output, is_sample) => {
            updateMutation.mutate({ id, input, expected_output, is_sample });
            setValidationEditingId(null);
          }}
          onDismiss={() => setValidateResult(null)}
          tests={testList}
          problemId={problemId}
          isDeleting={deleteSingleMutation.isPending || deleteAllFailedMutation.isPending}
        />
      )}
      {generateMutation.isSuccess && <Banner variant="success">Tests generated successfully.</Banner>}
      {generateMutation.isError && (
        <Banner variant="error">{generateMutation.error instanceof Error ? generateMutation.error.message : 'Generation failed'}</Banner>
      )}
      {bulkDeleteMutation.isError && (
        <Banner variant="error">{bulkDeleteMutation.error instanceof Error ? bulkDeleteMutation.error.message : 'Bulk delete failed'}</Banner>
      )}
      {bulkSampleMutation.isError && (
        <Banner variant="error">{bulkSampleMutation.error instanceof Error ? bulkSampleMutation.error.message : 'Update failed'}</Banner>
      )}

      {/* ── Create form ── */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-text">New Test Case</h3>
          {createError && <Banner variant="error">{createError}</Banner>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Input <span className="text-error">*</span></label>
              <textarea value={newInput} onChange={(e) => setNewInput(e.target.value)} rows={6}
                placeholder="Paste or type the test input…"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-accent" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Expected Output <span className="opacity-60">(optional)</span>
              </label>
              <textarea value={newOutput} onChange={(e) => setNewOutput(e.target.value)} rows={6}
                placeholder="Paste or type the expected output…"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
              <input type="checkbox" checked={newIsSample} onChange={(e) => setNewIsSample(e.target.checked)} className="rounded" />
              Sample test (visible to users)
            </label>
            <button
              onClick={() => createMutation.mutate({ input: newInput, expected_output: newOutput, is_sample: newIsSample })}
              disabled={createMutation.isPending || !newInput.trim()}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
            >
              <Save size={14} /> {createMutation.isPending ? 'Saving…' : 'Save Test'}
            </button>
          </div>
        </div>
      )}

      {/* ── Generate form ── */}
      {showGenerate && (
        <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-text">Generate Tests from Active Generator</h3>
          <p className="text-xs text-text-muted">
            Runs the <strong>active generator</strong>. Each seed is injected three ways so all
            generator styles work: as <code className="rounded bg-bg px-1">argv[1]</code>, as
            {' '}<code className="rounded bg-bg px-1">stdin</code>, and as the{' '}
            <code className="rounded bg-bg px-1">SEED</code> preprocessor macro (use{' '}
            <code className="rounded bg-bg px-1">srand(SEED)</code> in your generator for reliable
            seeding). Pick a model solution to auto-fill expected output.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Count</label>
              <input type="number" value={genCount}
                onChange={(e) => setGenCount(Math.max(1, Number(e.target.value)))}
                min={1}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Extra Args <span className="opacity-60">(seed appended last)</span>
              </label>
              <input value={genArgs} onChange={(e) => setGenArgs(e.target.value)}
                placeholder="e.g. 100 200"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Model Solution for Expected Output <span className="opacity-60">(optional)</span>
            </label>
            <select value={genSolutionId} onChange={(e) => setGenSolutionId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent">
              <option value="">— inputs only, no expected output —</option>
              {solutions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}{s.tag ? ` (${s.tag})` : ''}{s.expected_verdict ? ` · expect ${s.expected_verdict}` : ''}
                </option>
              ))}
            </select>
            {solutions.length === 0 && (
              <p className="mt-1 text-xs text-warning">No solutions yet — add one in the Solutions tab to enable auto-fill.</p>
            )}
          </div>
          <button onClick={handleGenerate} disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50">
            <Wand2 size={14} /> {generateMutation.isPending ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}

      {/* ── Test list ── */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading tests…</p>
      ) : testList.length === 0 ? (
        <p className="text-sm text-text-muted">No test cases yet. Add one manually or use the generator.</p>
      ) : (
        <div className="space-y-1.5">
          {/* Select-all header */}
          <div className="flex items-center gap-2 px-1 pb-1">
            <button onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text">
              {allSelected ? <CheckSquare size={14} className="text-accent" /> : <Square size={14} />}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {testList.map((test, idx) => (
            <TestCaseRow
              key={test.id}
              test={test}
              index={idx}
              selected={selected.has(test.id)}
              solutions={solutions}
              onToggleSelect={() => toggleSelect(test.id)}
              onDelete={() => { if (confirm(`Delete test #${idx + 1}?`)) deleteMutation.mutate(test.id); }}
              onSave={(input, expected_output, is_sample) =>
                updateMutation.mutate({ id: test.id, input, expected_output, is_sample })
              }
              onRunSolution={(solutionId) => runSolnMutation.mutate({ testId: test.id, solutionId })}
              runSolnPending={runSolnMutation.isPending && runSolnMutation.variables?.testId === test.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Single test-case row
───────────────────────────────────────────────────────────── */
interface RowProps {
  test: TestCase;
  index: number;
  selected: boolean;
  solutions: ProblemComponent[];
  onToggleSelect: () => void;
  onDelete: () => void;
  onSave: (input: string, expected_output: string, is_sample: boolean) => void;
  onRunSolution: (solutionId?: number) => void;
  runSolnPending: boolean;
}

function TestCaseRow({
  test, index, selected, solutions,
  onToggleSelect, onDelete, onSave, onRunSolution, runSolnPending,
}: RowProps) {
  const [expanded, setExpanded]       = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editInput, setEditInput]     = useState(test.input);
  const [editOutput, setEditOutput]   = useState(test.expected_output ?? '');
  const [editSample, setEditSample]   = useState(test.is_sample);
  const [runSolnId, setRunSolnId]     = useState<string>('');

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditInput(test.input);
    setEditOutput(test.expected_output ?? '');
    setEditSample(test.is_sample);
    setEditing(true);
    setExpanded(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(editInput, editOutput, editSample);
    setEditing(false);
  };

  return (
    <div className={cn(
      'rounded-lg border bg-panel transition-colors',
      selected ? 'border-accent/60 bg-accent/5' : 'border-border',
    )}>
      {/* ── Header ── */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-accent-subtle/20"
        onClick={() => { if (!editing) setExpanded(!expanded); }}
      >
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(); }} className="shrink-0 text-text-muted hover:text-accent">
          {selected ? <CheckSquare size={14} className="text-accent" /> : <Square size={14} />}
        </button>
        <span className="shrink-0 text-text-muted">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <GripVertical size={14} className="shrink-0 text-text-muted" />
        <span className="text-sm font-medium text-text">Test #{index + 1}</span>

        {(editing ? editSample : test.is_sample) && (
          <span className="rounded bg-accent-subtle px-1.5 py-0.5 text-xs text-accent">Sample</span>
        )}
        {test.generator_batch_id && (
          <span className="rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning">Generated</span>
        )}
        {!test.expected_output && !editing && (
          <span className="rounded bg-error/10 px-1.5 py-0.5 text-xs text-error">No output</span>
        )}

        <span className="ml-auto text-xs text-text-muted">
          {test.input.length} B in · {(test.expected_output?.length ?? 0)} B out
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-0.5">
          {editing ? (
            <>
              <button onClick={handleSave}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-success hover:bg-success/10">
                <Save size={13} /> Save
              </button>
              <button onClick={(e) => { e.stopPropagation(); setEditing(false); }}
                className="rounded p-1 text-text-muted hover:bg-accent-subtle hover:text-text">
                <X size={14} />
              </button>
            </>
          ) : (
            <button onClick={openEdit}
              className="rounded p-1.5 text-text-muted hover:bg-accent-subtle hover:text-accent" title="Edit">
              <Pencil size={13} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-border px-3 py-3 space-y-3">

          {/* Run solution row — appears in both edit and view modes */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Fill expected output:</span>
            <select
              value={runSolnId}
              onChange={(e) => setRunSolnId(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="rounded border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
            >
              <option value="">Main solution</option>
              {solutions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}{s.tag ? ` (${s.tag})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={(e) => { e.stopPropagation(); onRunSolution(runSolnId ? Number(runSolnId) : undefined); }}
              disabled={runSolnPending}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-accent hover:bg-accent-subtle disabled:opacity-50"
              title="Run this solution against the test input and update expected output"
            >
              {runSolnPending
                ? <><Loader2 size={12} className="animate-spin" /> Running…</>
                : <><Play size={12} /> Run Solution</>}
            </button>
            {solutions.length === 0 && (
              <span className="text-xs text-warning">Add a solution first.</span>
            )}
          </div>

          {editing ? (
            /* ── Edit mode ── */
            <>
              <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
                <input type="checkbox" checked={editSample} onChange={(e) => setEditSample(e.target.checked)} className="rounded" />
                Sample test (visible to users)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Input</label>
                  <textarea value={editInput} onChange={(e) => setEditInput(e.target.value)} rows={8}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text font-mono outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Expected Output</label>
                  <textarea value={editOutput} onChange={(e) => setEditOutput(e.target.value)} rows={8}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text font-mono outline-none focus:border-accent" />
                </div>
              </div>
            </>
          ) : (
            /* ── View mode ── */
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs text-text-muted">Input</p>
                <pre className="max-h-56 overflow-auto rounded-lg bg-bg p-3 text-xs text-text font-mono leading-relaxed">
                  {test.input || '(empty)'}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs text-text-muted">Expected Output</p>
                <pre className="max-h-56 overflow-auto rounded-lg bg-bg p-3 text-xs text-text font-mono leading-relaxed">
                  {test.expected_output || '(empty)'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Validation results panel
───────────────────────────────────────────────────────────── */
interface ValidatePanelProps {
  result: ValidateTestsResponse;
  editingId: number | null;
  onSetEditing: (id: number | null) => void;
  onDeleteOne: (id: number) => void;
  onDeleteAllFailed: () => void;
  onSave: (id: number, input: string, expected_output: string, is_sample: boolean) => void;
  onDismiss: () => void;
  tests: TestCase[];
  problemId: string;
  isDeleting: boolean;
}

function ValidateResultPanel({
  result, editingId, onSetEditing, onDeleteOne, onDeleteAllFailed, onSave, onDismiss, tests, isDeleting,
}: ValidatePanelProps) {
  const allPassed = result.valid;

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3',
      allPassed ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5',
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {allPassed
          ? <CheckCircle2 size={18} className="text-success shrink-0" />
          : <XCircle size={18} className="text-error shrink-0" />}
        <div className="flex-1">
          <p className={cn('text-sm font-semibold', allPassed ? 'text-success' : 'text-error')}>
            {allPassed
              ? `All ${result.total} tests passed validation`
              : `${result.failures.length} of ${result.total} tests failed validation`}
          </p>
          <p className="text-xs text-text-muted">
            {result.passed} passed · {result.failures.length} failed
          </p>
        </div>
        {/* Bulk "Delete all failed" */}
        {!allPassed && (
          <button
            onClick={onDeleteAllFailed}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 disabled:opacity-50"
          >
            <Trash2 size={12} />
            {isDeleting ? 'Deleting…' : `Delete all ${result.failures.length} failed`}
          </button>
        )}
        <button onClick={onDismiss} className="rounded p-1 text-text-muted hover:text-text">
          <X size={16} />
        </button>
      </div>

      {/* Per-failure list */}
      {!allPassed && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {result.failures.map((f) => (
            <FailureRow
              key={f.test_id}
              failure={f}
              isEditing={editingId === f.test_id}
              onEdit={() => onSetEditing(editingId === f.test_id ? null : f.test_id)}
              onDelete={() => {
                if (confirm(`Delete test #${f.order_index}?`)) onDeleteOne(f.test_id);
              }}
              onSave={(input, expected_output, is_sample) =>
                onSave(f.test_id, input, expected_output, is_sample)
              }
              test={tests.find((t) => t.id === f.test_id) ?? null}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FailureRowProps {
  failure: ValidationFailure;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (input: string, expected_output: string, is_sample: boolean) => void;
  test: TestCase | null;
  isDeleting: boolean;
}

function FailureRow({ failure, isEditing, onEdit, onDelete, onSave, test, isDeleting }: FailureRowProps) {
  const [editInput, setEditInput]   = useState(test?.input ?? '');
  const [editOutput, setEditOutput] = useState(test?.expected_output ?? '');
  const [editSample, setEditSample] = useState(test?.is_sample ?? false);

  // Sync with test when editing opens
  const handleEdit = () => {
    if (!isEditing && test) {
      setEditInput(test.input);
      setEditOutput(test.expected_output ?? '');
      setEditSample(test.is_sample);
    }
    onEdit();
  };

  return (
    <div className="rounded-lg border border-error/20 bg-panel overflow-hidden">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <XCircle size={14} className="mt-0.5 shrink-0 text-error" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">Test #{failure.order_index}</p>
          {/* Validator error message */}
          <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-bg px-2 py-1.5 text-xs font-mono text-error leading-relaxed">
            {failure.error}
          </pre>
          {/* Input snippet */}
          {failure.input && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-text-muted hover:text-text select-none">
                Show input snippet
              </summary>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-bg px-2 py-1.5 text-xs font-mono text-text-muted leading-relaxed">
                {failure.input}
              </pre>
            </details>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-accent hover:bg-accent-subtle"
          >
            <Pencil size={12} /> {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-error hover:bg-error/10 disabled:opacity-50"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div className="border-t border-error/15 px-3 py-3 space-y-2 bg-bg/40">
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editSample}
              onChange={(e) => setEditSample(e.target.checked)}
              className="rounded"
            />
            Sample test (visible to users)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Input</label>
              <textarea
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text font-mono outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Expected Output</label>
              <textarea
                value={editOutput}
                onChange={(e) => setEditOutput(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text font-mono outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onEdit}
              className="rounded px-3 py-1.5 text-xs text-text-muted border border-border hover:bg-accent-subtle"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editInput, editOutput, editSample)}
              className="flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-hover"
            >
              <Save size={12} /> Save &amp; Re-validate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Banner helper
───────────────────────────────────────────────────────────── */
function Banner({ variant, children }: { variant: 'success' | 'error' | 'warning'; children: React.ReactNode }) {
  const s = {
    success: 'border-success/30 bg-success/10 text-success',
    error:   'border-error/30 bg-error/10 text-error',
    warning: 'border-warning/30 bg-warning/10 text-warning',
  };
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-sm', s[variant])}>
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
