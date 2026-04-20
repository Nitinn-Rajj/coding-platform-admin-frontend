import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft } from 'lucide-react';

export function GroupCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      apiClient.post<{ id: number }>(`/admin/groups`, payload),
    onSuccess: (data) => {
      navigate(`/groups/${data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    createMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/groups')}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft size={14} /> Back to groups
      </button>
      <div>
        <h1 className="text-xl font-semibold text-text">Create group</h1>
        <p className="text-sm text-text-muted">
          Create a new group for organizing users. Members may join via request/approval.
        </p>
      </div>

      <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-border bg-panel p-6">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
            placeholder="CS101 Fall 2026"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors resize-none"
            placeholder="Optional description visible to students."
          />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-60 transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create group'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-accent-subtle hover:text-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
