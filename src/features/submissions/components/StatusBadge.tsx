import type { SubmissionStatus } from '@/types';

const styles: Record<string, string> = {
  pending: 'bg-text-muted/15 text-text-muted',
  pending_review: 'bg-warning/15 text-warning',
  judging: 'bg-text-muted/15 text-text-muted',
  accepted: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger',
  wrong_answer: 'bg-danger/15 text-danger',
  time_limit_exceeded: 'bg-warning/15 text-warning',
  memory_limit_exceeded: 'bg-warning/15 text-warning',
  runtime_error: 'bg-danger/15 text-danger',
  compilation_error: 'bg-danger/15 text-danger',
  partial: 'bg-warning/15 text-warning',
};

const labels: Record<string, string> = {
  pending: 'Pending',
  pending_review: 'Review',
  judging: 'Judging',
  accepted: 'Accepted',
  rejected: 'Rejected',
  wrong_answer: 'WA',
  time_limit_exceeded: 'TLE',
  memory_limit_exceeded: 'MLE',
  runtime_error: 'RTE',
  compilation_error: 'CE',
  partial: 'Partial',
};

export function StatusBadge({ status }: { status: SubmissionStatus | string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
        styles[status] ?? 'bg-text-muted/15 text-text-muted'
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
