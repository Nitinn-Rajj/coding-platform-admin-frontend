import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { ArrowLeft, Upload, Globe } from 'lucide-react';
import type { Problem } from '@/types';
import { StatementTab } from '../components/StatementTab';
import { TestCasesTab } from '../components/TestCasesTab';
import { ComponentsTab } from '../components/ComponentsTab';
import { TestingTab } from '../components/TestingTab';
import { AccessTab } from '../components/AccessTab';
import { RevisionsTab } from '../components/RevisionsTab';

type Tab = 'statement' | 'tests' | 'generators' | 'validators' | 'checkers' | 'solutions' | 'testing' | 'access' | 'revisions';

const tabs: { key: Tab; label: string }[] = [
  { key: 'statement', label: 'Statement' },
  { key: 'tests', label: 'Tests' },
  { key: 'generators', label: 'Generators' },
  { key: 'validators', label: 'Validators' },
  { key: 'checkers', label: 'Checkers' },
  { key: 'solutions', label: 'Solutions' },
  { key: 'testing', label: 'Testing' },
  { key: 'access', label: 'Access' },
  { key: 'revisions', label: 'Revisions' },
];

export function ProblemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('statement');

  const { data: problem, isLoading } = useQuery({
    queryKey: ['admin', 'problem', id],
    queryFn: () => apiClient.get<Problem>(`/admin/problems/${id}`),
    enabled: !!id,
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

  const handlePublish = async () => {
    if (!confirm('Publish this problem? It will be visible to users.')) return;
    try {
      await apiClient.post(`/admin/problems/${id}/publish`);
      // refetch
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Publish failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/problems')}
            className="rounded-lg p-1.5 text-text-muted hover:bg-accent-subtle hover:text-text"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text">{problem.title}</h1>
            <p className="text-xs text-text-muted">
              Rev {problem.active_revision} · {problem.difficulty} ·{' '}
              {problem.is_published ? (
                <span className="text-success">Published</span>
              ) : (
                <span className="text-warning">Draft</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-medium text-success transition-colors hover:bg-success/20"
          >
            {problem.is_published ? <Globe size={14} /> : <Upload size={14} />}
            {problem.is_published ? 'Republish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map((tab) => (
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

      {/* Tab Content */}
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
