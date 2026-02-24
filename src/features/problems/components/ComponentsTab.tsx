import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, Play, Check, X, Code2 } from 'lucide-react';
import type { ProblemComponent, ComponentType } from '@/types';

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

const activatableTypes: ComponentType[] = ['validators', 'checkers', 'interactors'];

export function ComponentsTab({ problemId, type }: Props) {
  const queryClient = useQueryClient();
  const label = typeLabels[type];
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newSolutionType, setNewSolutionType] = useState('main');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');

  const qk = ['admin', 'problem', problemId, type];

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () =>
      apiClient.get<{ [key: string]: ProblemComponent[] }>(`/admin/problems/${problemId}/${type}`),
  });

  // The API returns the list in a key matching the type
  const components: ProblemComponent[] = data ? (Object.values(data)[0] as ProblemComponent[] ?? []) : [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post(`/admin/problems/${problemId}/${type}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setShowCreate(false);
      setNewName('');
      setNewCode('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.put(`/admin/problems/${problemId}/${type}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/problems/${problemId}/${type}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const compileMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ success: boolean; output: string }>(`/admin/problems/${problemId}/${type}/${id}/compile`),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/admin/problems/${problemId}/${type}/${id}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const handleCreate = () => {
    const payload: Record<string, unknown> = {
      name: newName,
      source_code: newCode,
      language: 'cpp',
    };
    if (type === 'solutions') payload.solution_type = newSolutionType;
    createMutation.mutate(payload);
  };

  const handleUpdate = (id: string) => {
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

      {/* Compile result */}
      {compileMutation.isSuccess && (
        <div className={cn(
          'rounded-lg border px-3 py-2 text-sm',
          compileMutation.data?.success
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-error/30 bg-error/10 text-error',
        )}>
          <p className="font-medium">{compileMutation.data?.success ? 'Compilation Successful' : 'Compilation Failed'}</p>
          {compileMutation.data?.output && (
            <pre className="mt-1 max-h-32 overflow-auto text-xs font-mono">{compileMutation.data.output}</pre>
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
            {type === 'solutions' && (
              <div>
                <label className="mb-1 block text-xs text-text-muted">Solution Type</label>
                <select
                  value={newSolutionType}
                  onChange={(e) => setNewSolutionType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="main">Main (correct)</option>
                  <option value="brute">Brute Force</option>
                  <option value="wa">Wrong Answer</option>
                  <option value="tle">Time Limit</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Source Code (C++)</label>
            <textarea
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text font-mono outline-none focus:border-accent"
              placeholder="#include <bits/stdc++.h>&#10;using namespace std;&#10;&#10;int main() {&#10;    &#10;}"
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
      ) : (
        <div className="space-y-2">
          {components.map((comp) => (
            <div key={comp.id} className="rounded-lg border border-border bg-panel">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Code2 size={14} className="text-text-muted" />
                <span className="text-sm font-medium text-text">{comp.name}</span>
                {comp.is_active && (
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-xs text-success">Active</span>
                )}
                {comp.solution_type && (
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-xs',
                    comp.solution_type === 'main' ? 'bg-success/15 text-success' :
                    comp.solution_type === 'brute' ? 'bg-accent-subtle text-accent' :
                    comp.solution_type === 'wa' ? 'bg-error/15 text-error' :
                    'bg-warning/15 text-warning',
                  )}>
                    {comp.solution_type}
                  </span>
                )}
                <span className="text-xs text-text-muted">{comp.language}</span>

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
                  <textarea
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    rows={14}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text font-mono outline-none focus:border-accent"
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
