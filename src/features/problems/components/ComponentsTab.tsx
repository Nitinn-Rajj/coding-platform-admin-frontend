import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, Play, Check, X, Code2 } from 'lucide-react';
import type { CheckerType, ComponentType, ProblemComponent, SolutionTag } from '@/types';
import { CodeEditor } from '@/components/CodeEditor';

interface Props {
  problemId: string;
  type: ComponentType;
}

const typeLabels: Record<ComponentType, string> = {
  generators: 'Generator',
  validators: 'Validator',
  checkers: 'Checker',
  interactors: 'Interactor',
  solutions: 'Solution',
};

// All C++-only components except `solutions` follow the "exactly one active per
// problem" rule. Solutions are tagged (main/brute/…) instead of activated.
const activatableTypes: ComponentType[] = ['generators', 'validators', 'checkers', 'interactors'];

export function ComponentsTab({ problemId, type }: Props) {
  const queryClient = useQueryClient();
  const label = typeLabels[type];
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCheckerType, setNewCheckerType] = useState<CheckerType>('standard');
  const [newSolutionTag, setNewSolutionTag] = useState<SolutionTag>('main');
  const [newExpectedVerdict, setNewExpectedVerdict] = useState('AC');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [compileForId, setCompileForId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const qk = ['admin', 'problem', problemId, type];

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () =>
      apiClient.get<Record<string, ProblemComponent[]>>(`/admin/problems/${problemId}/${type}`),
  });

  // The API wraps the list in `{ [type]: [...] }` (e.g. `{ generators: [...] }`).
  const components: ProblemComponent[] = data ? (data[type] ?? Object.values(data)[0] ?? []) : [];

  const extractError = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post(`/admin/problems/${problemId}/${type}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setShowCreate(false);
      setNewName('');
      setNewCode('');
      setNewDescription('');
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(extractError(err, `Failed to create ${label.toLowerCase()}`)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiClient.put(`/admin/problems/${problemId}/${type}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setEditingId(null);
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(extractError(err, `Failed to update ${label.toLowerCase()}`)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/admin/problems/${problemId}/${type}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(extractError(err, `Failed to delete ${label.toLowerCase()}`)),
  });

  const compileMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean; output?: string; error?: string; compile_time_ms?: number }>(
        `/admin/problems/${problemId}/${type}/${id}/compile`,
      ),
    onMutate: (id) => setCompileForId(id),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post(`/admin/problems/${problemId}/${type}/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(extractError(err, `Failed to activate ${label.toLowerCase()}`)),
  });

  const handleCreate = () => {
    const payload: Record<string, unknown> = {
      name: newName,
      source_code: newCode,
    };
    if (type === 'generators') payload.description = newDescription;
    if (type === 'checkers') payload.checker_type = newCheckerType;
    if (type === 'solutions') {
      payload.tag = newSolutionTag;
      payload.expected_verdict = newExpectedVerdict;
    }
    createMutation.mutate(payload);
  };

  const handleUpdate = (id: number) => {
    updateMutation.mutate({
      id,
      payload: { name: editName, source_code: editCode },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          <Plus size={14} /> New {label}
        </button>
        <span className="ml-auto text-sm text-text-muted">{components.length} {type}</span>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {errorMsg}
        </div>
      )}

      {/* Compile result */}
      {compileMutation.isSuccess && compileForId !== null && (
        <div className={cn(
          'rounded-lg border px-3 py-2 text-sm',
          compileMutation.data?.success
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-error/30 bg-error/10 text-error',
        )}>
          <p className="font-medium">
            {compileMutation.data?.success ? 'Compilation Successful' : 'Compilation Failed'}
            {typeof compileMutation.data?.compile_time_ms === 'number' && (
              <span className="ml-2 text-xs opacity-75">({compileMutation.data.compile_time_ms} ms)</span>
            )}
          </p>
          {(compileMutation.data?.error || compileMutation.data?.output) && (
            <pre className="mt-1 max-h-48 overflow-auto text-xs font-mono whitespace-pre-wrap">
              {compileMutation.data?.error || compileMutation.data?.output}
            </pre>
          )}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-text">New {label}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`my-${type.slice(0, -1)}`}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            {type === 'checkers' && (
              <div>
                <label className="mb-1 block text-xs text-text-muted">Checker Type</label>
                <select
                  value={newCheckerType}
                  onChange={(e) => setNewCheckerType(e.target.value as CheckerType)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="standard">Standard (exact match)</option>
                  <option value="partial">Partial (float tolerance / multiple valid)</option>
                  <option value="interactive">Interactive</option>
                </select>
              </div>
            )}
            {type === 'solutions' && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Tag</label>
                  <select
                    value={newSolutionTag}
                    onChange={(e) => setNewSolutionTag(e.target.value as SolutionTag)}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  >
                    <option value="main">Main (correct)</option>
                    <option value="brute">Brute Force</option>
                    <option value="wa">Wrong Answer</option>
                    <option value="tle">Time Limit</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Expected Verdict</label>
                  <input
                    value={newExpectedVerdict}
                    onChange={(e) => setNewExpectedVerdict(e.target.value)}
                    placeholder="AC / WA / TLE / MLE"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </div>
              </>
            )}
          </div>
          {type === 'generators' && (
            <div>
              <label className="mb-1 block text-xs text-text-muted">Description (optional)</label>
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What kind of tests does this generator produce?"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-text-muted">Source Code (C++)</label>
            <CodeEditor
              value={newCode}
              onChange={setNewCode}
              language="cpp"
              height={320}
              placeholder={'#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n}'}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !newName || !newCode}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
          >
            <Save size={14} /> {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {/* Component list */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading {type}...</p>
      ) : components.length === 0 ? (
        <p className="text-sm text-text-muted">No {type} yet.</p>
      ) : (
        <div className="space-y-2">
          {components.map((comp) => (
            <div key={comp.id} className="rounded-lg border border-border bg-panel">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Code2 size={14} className="text-text-muted" />
                <span className="text-sm font-medium text-text">{comp.name}</span>

                {/* Active pill (generators/validators/checkers/interactors) */}
                {activatableTypes.includes(type) && comp.is_active && (
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-xs text-success">Active</span>
                )}
                {activatableTypes.includes(type) && !comp.is_active && (
                  <span className="rounded bg-text-muted/15 px-1.5 py-0.5 text-xs text-text-muted">Inactive</span>
                )}

                {/* Checker-type pill */}
                {type === 'checkers' && comp.checker_type && (
                  <span className="rounded bg-accent-subtle px-1.5 py-0.5 text-xs text-accent">
                    {comp.checker_type}
                  </span>
                )}

                {/* Solution tag + expected verdict */}
                {type === 'solutions' && comp.tag && (
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-xs',
                    comp.tag === 'main' ? 'bg-success/15 text-success' :
                    comp.tag === 'brute' ? 'bg-accent-subtle text-accent' :
                    comp.tag === 'wa' ? 'bg-error/15 text-error' :
                    'bg-warning/15 text-warning',
                  )}>
                    {String(comp.tag)}
                  </span>
                )}
                {type === 'solutions' && comp.expected_verdict && (
                  <span className="rounded bg-text-muted/10 px-1.5 py-0.5 text-xs text-text-muted">
                    expect {comp.expected_verdict}
                  </span>
                )}

                {/* Generator description */}
                {type === 'generators' && comp.description && (
                  <span className="truncate text-xs text-text-muted">{comp.description}</span>
                )}

                <div className="ml-auto flex items-center gap-1">
                  {/* Compile */}
                  <button
                    onClick={() => compileMutation.mutate(comp.id)}
                    disabled={compileMutation.isPending}
                    className="rounded p-1.5 text-text-muted hover:bg-accent-subtle hover:text-accent"
                    title="Compile & test"
                  >
                    <Play size={14} />
                  </button>
                  {/* Activate */}
                  {activatableTypes.includes(type) && !comp.is_active && (
                    <button
                      onClick={() => activateMutation.mutate(comp.id)}
                      className="rounded p-1.5 text-text-muted hover:bg-success/10 hover:text-success"
                      title="Set as active"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {/* Edit */}
                  <button
                    onClick={() => {
                      if (editingId === comp.id) {
                        setEditingId(null);
                      } else {
                        setEditingId(comp.id);
                        setEditName(comp.name);
                        setEditCode(comp.source_code);
                      }
                    }}
                    className="rounded px-2 py-1 text-xs text-text-muted hover:bg-accent-subtle hover:text-text"
                  >
                    {editingId === comp.id ? 'Cancel' : 'Edit'}
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => { if (confirm(`Delete ${comp.name}?`)) deleteMutation.mutate(comp.id); }}
                    className="rounded p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {editingId === comp.id && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                  <CodeEditor
                    value={editCode}
                    onChange={setEditCode}
                    language="cpp"
                    height={380}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-accent-subtle"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={() => handleUpdate(comp.id)}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
                    >
                      <Save size={14} /> Save
                    </button>
                  </div>
                </div>
              )}

              {/* Code preview (collapsed view) */}
              {editingId !== comp.id && (
                <div className="border-t border-border px-4 py-2">
                  <pre className="max-h-20 overflow-hidden text-xs text-text-muted font-mono leading-relaxed">
                    {comp.source_code.slice(0, 200)}{comp.source_code.length > 200 ? '...' : ''}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
