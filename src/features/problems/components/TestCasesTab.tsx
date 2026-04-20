import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, Wand2, ShieldCheck, GripVertical } from 'lucide-react';
import type { TestCase } from '@/types';

interface Props {
  problemId: string;
}

export function TestCasesTab({ problemId }: Props) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newInput, setNewInput] = useState('');
  const [newOutput, setNewOutput] = useState('');
  const [newIsSample, setNewIsSample] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genArgs, setGenArgs] = useState('');

  const { data: tests, isLoading } = useQuery({
    queryKey: ['admin', 'problem', problemId, 'tests'],
    queryFn: () =>
      apiClient.get<{ tests: TestCase[] }>(`/admin/problems/${problemId}/tests?limit=200`),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { input: string; expected_output: string; is_sample: boolean }) =>
      apiClient.post(`/admin/problems/${problemId}/tests`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId, 'tests'] });
      setShowCreate(false);
      setNewInput('');
      setNewOutput('');
      setNewIsSample(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (testId: number) =>
      apiClient.delete(`/admin/problems/${problemId}/tests/${testId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId, 'tests'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (payload: { count: number; args_template: string }) =>
      apiClient.post(`/admin/problems/${problemId}/tests/generate`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problemId, 'tests'] });
      setShowGenerate(false);
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/problems/${problemId}/tests/validate`),
  });

  const testList = tests?.tests ?? [];

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCreate(!showCreate)}
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
          {validateMutation.isPending ? 'Validating...' : 'Validate All'}
        </button>
        <span className="ml-auto text-sm text-text-muted">{testList.length} test(s)</span>
      </div>

      {/* Validate result */}
      {validateMutation.isSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          All tests passed validation.
        </div>
      )}
      {validateMutation.isError && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {validateMutation.error instanceof Error ? validateMutation.error.message : 'Validation failed'}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-text">New Test Case</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Input</label>
              <textarea
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Expected Output</label>
              <textarea
                value={newOutput}
                onChange={(e) => setNewOutput(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={newIsSample}
                onChange={(e) => setNewIsSample(e.target.checked)}
                className="rounded"
              />
              Sample test (visible to users)
            </label>
            <button
              onClick={() =>
                createMutation.mutate({ input: newInput, expected_output: newOutput, is_sample: newIsSample })
              }
              disabled={createMutation.isPending}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
            >
              <Save size={14} /> {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Generate form */}
      {showGenerate && (
        <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-text">Generate Test Cases</h3>
          <p className="text-xs text-text-muted">Uses the active generator to create tests. Each test runs the generator with the args template where {'{seed}'} is replaced by the test index.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Count</label>
              <input
                type="number"
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Args Template</label>
              <input
                value={genArgs}
                onChange={(e) => setGenArgs(e.target.value)}
                placeholder="{seed} 100 200"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
          </div>
          <button
            onClick={() => generateMutation.mutate({ count: genCount, args_template: genArgs })}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
          >
            <Wand2 size={14} /> {generateMutation.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
      )}

      {/* Test list */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading tests...</p>
      ) : (
        <div className="space-y-2">
          {testList.map((test, idx) => (
            <TestCaseRow
              key={test.id}
              test={test}
              index={idx}
              onDelete={() => {
                if (confirm(`Delete test #${idx + 1}?`)) deleteMutation.mutate(test.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Single test case row ─── */
function TestCaseRow({ test, index, onDelete }: { test: TestCase; index: number; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-panel">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-accent-subtle/30"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical size={14} className="text-text-muted" />
        <span className="text-sm font-medium text-text">Test #{index + 1}</span>
        {test.is_sample && (
          <span className="rounded bg-accent-subtle px-1.5 py-0.5 text-xs text-accent">Sample</span>
        )}
        {test.generator_batch_id && (
          <span className="rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning">Generated</span>
        )}
        <span className="ml-auto text-xs text-text-muted">
          {test.input.length} B input · {test.expected_output.length} B output
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded p-1 text-text-muted hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div className="grid grid-cols-2 gap-3 border-t border-border px-4 py-3">
          <div>
            <p className="mb-1 text-xs text-text-muted">Input</p>
            <pre className={cn(
              'max-h-48 overflow-auto rounded-lg bg-bg p-3 text-xs text-text font-mono',
            )}>
              {test.input || '(empty)'}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs text-text-muted">Expected Output</p>
            <pre className="max-h-48 overflow-auto rounded-lg bg-bg p-3 text-xs text-text font-mono">
              {test.expected_output || '(empty)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
