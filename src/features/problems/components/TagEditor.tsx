import { useMemo, useState, type KeyboardEvent } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TagInfo } from '@/types';

interface Props {
  value: TagInfo[];
  onChange: (tags: TagInfo[]) => void;
  className?: string;
}

/**
 * TagEditor is a self-contained multi-select for problem tags.
 *
 * Responsibilities:
 *   - Fetch the master list of tags from /admin/tags (admins only).
 *   - Let the user toggle existing tags on/off.
 *   - Let the user create new tags on the fly; newly created tags are added
 *     to the selection immediately.
 *
 * The caller owns the `TagInfo[]` and only needs to persist the array of
 * ids (via `value.map(t => t.id)`) when saving the parent form.
 */
export function TagEditor({ value, onChange, className }: Props) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: tagList, isLoading } = useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: () => apiClient.get<{ tags: TagInfo[] }>('/admin/tags'),
  });

  const allTags = tagList?.tags ?? [];

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.post<TagInfo>('/admin/tags', { name }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
      // Add the new tag to selection if it wasn't already there.
      if (!selectedIds.has(created.id)) {
        onChange([...value, created]);
      }
      setNewTagName('');
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to create tag'),
  });

  const toggle = (tag: TagInfo) => {
    if (selectedIds.has(tag.id)) {
      onChange(value.filter((t) => t.id !== tag.id));
    } else {
      onChange([...value, tag]);
    }
  };

  const handleCreate = () => {
    const name = newTagName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {/* Selected tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {value.length === 0 && (
          <span className="text-xs text-text-muted">No tags selected.</span>
        )}
        {value.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-subtle/40 px-2 py-0.5 text-xs text-accent"
          >
            {t.name}
            <button
              type="button"
              onClick={() => toggle(t)}
              className="rounded-full p-0.5 hover:bg-accent/20"
              aria-label={`Remove tag ${t.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {/* Pick existing */}
      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-text-muted">Available</p>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border bg-panel p-2">
          {isLoading && <span className="text-xs text-text-muted">Loading tags...</span>}
          {!isLoading && allTags.length === 0 && (
            <span className="text-xs text-text-muted">No tags yet. Create one below.</span>
          )}
          {allTags.map((t) => {
            const selected = selectedIds.has(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggle(t)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs transition-colors',
                  selected
                    ? 'border-accent bg-accent-subtle/50 text-accent'
                    : 'border-border text-text-muted hover:border-accent/40 hover:text-text',
                )}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Create new */}
      <div className="flex items-center gap-2">
        <input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={handleKey}
          placeholder="New tag name (press Enter)"
          className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newTagName.trim() || createMutation.isPending}
          className={cn(
            'flex items-center gap-1 rounded-lg border border-accent/40 bg-accent-subtle/30 px-3 py-2 text-sm text-accent',
            (!newTagName.trim() || createMutation.isPending) && 'cursor-not-allowed opacity-60',
          )}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
