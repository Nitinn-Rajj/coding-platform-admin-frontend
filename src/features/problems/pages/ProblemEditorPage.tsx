import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { AlertCircle, ArrowLeft, CheckCircle, EyeOff, Upload } from 'lucide-react';
import type { Problem } from '@/types';
import { StatementTab } from '../components/StatementTab';
import { TestCasesTab } from '../components/TestCasesTab';
import { ComponentsTab } from '../components/ComponentsTab';
import { TestingTab } from '../components/TestingTab';
import { AccessTab } from '../components/AccessTab';
import { RevisionsTab } from '../components/RevisionsTab';

type Tab =
  | 'statement'
  | 'tests'
  | 'generators'
  | 'validators'
  | 'checkers'
  | 'solutions'
  | 'testing'
  | 'access'
  | 'revisions';

const tabs: { key: Tab; label: string; hideForSubjective?: boolean }[] = [
  { key: 'statement', label: 'Statement' },
  { key: 'tests', label: 'Tests', hideForSubjective: true },
  { key: 'generators', label: 'Generators', hideForSubjective: true },
  { key: 'validators', label: 'Validators', hideForSubjective: true },
  { key: 'checkers', label: 'Checkers', hideForSubjective: true },
  { key: 'solutions', label: 'Solutions', hideForSubjective: true },
  { key: 'testing', label: 'Testing', hideForSubjective: true },
  { key: 'access', label: 'Access' },
  { key: 'revisions', label: 'Revisions' },
];

function asMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function ProblemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('statement');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearAction = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const { data: problem, isLoading } = useQuery({
    queryKey: ['admin', 'problem', id],
    queryFn: () => apiClient.get<Problem>(`/admin/problems/${id}`),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: () => apiClient.post<{ message: string }>(`/admin/problems/${id}/publish`),
    onMutate: clearAction,
    onSuccess: (res) => {
      setActionSuccess(res.message || 'Problem published');
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] });
    },
    onError: (e) => setActionError(asMsg(e, 'Failed to publish problem')),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => apiClient.post<{ message: string }>(`/admin/problems/${id}/unpublish`),
    onMutate: clearAction,
    onSuccess: (res) => {
      setActionSuccess(res.message || 'Problem unpublished');
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] });
    },
    onError: (e) => setActionError(asMsg(e, 'Failed to unpublish problem')),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-muted">Loading problem...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-error">Problem not found</p>
      </div>
    );
  }

  const handlePublish = () => {
    if (!confirm('Publish this problem? It will become visible to users.')) return;
    publishMutation.mutate();
  };

  const handleUnpublish = () => {
    if (!confirm('Unpublish this problem? Students will no longer see it in the questions list.')) return;
    unpublishMutation.mutate();
  };

  const visibleTabs = tabs.filter(
    (t) => !(problem.problem_type === 'subjective' && t.hideForSubjective),
  );

  const isPublished = problem.status === 'published';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/problems')}
            className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle hover:text-text"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-text">{problem.title}</h1>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                  isPublished
                    ? 'bg-success/15 text-success'
                    : 'bg-warning/15 text-warning',
                )}
                title={
                  isPublished
                    ? `Visible to students since ${problem.published_at ?? ''}`
                    : 'Hidden from students until published'
                }
              >
                {problem.status}
              </span>
            </div>
            <p className="text-xs text-text-muted capitalize">
              {problem.difficulty} · {problem.problem_type} problem
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPublished ? (
            <button
              onClick={handleUnpublish}
              disabled={unpublishMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning transition-colors hover:bg-warning/20 disabled:opacity-60"
            >
              <EyeOff size={14} />
              {unpublishMutation.isPending ? 'Unpublishing...' : 'Unpublish'}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-60"
            >
              <Upload size={14} />
              {publishMutation.isPending ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {(actionError || actionSuccess) && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
            actionError
              ? 'border-error/30 bg-error/10 text-error'
              : 'border-success/30 bg-success/10 text-success',
          )}
        >
          {actionError ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          <span>{actionError ?? actionSuccess}</span>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-accent text-accent'
                : 'text-text-muted hover:text-text',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'statement' && <StatementTab problem={problem} />}
        {activeTab === 'tests' && <TestCasesTab problemId={id!} />}
        {activeTab === 'generators' && <ComponentsTab problemId={id!} type="generators" />}
        {activeTab === 'validators' && <ComponentsTab problemId={id!} type="validators" />}
        {activeTab === 'checkers' && <ComponentsTab problemId={id!} type="checkers" />}
        {activeTab === 'solutions' && <ComponentsTab problemId={id!} type="solutions" />}
        {activeTab === 'testing' && <TestingTab problemId={id!} />}
        {activeTab === 'access' && <AccessTab problemId={id!} />}
        {activeTab === 'revisions' && <RevisionsTab problemId={id!} />}
      </div>
    </div>
  );
}
