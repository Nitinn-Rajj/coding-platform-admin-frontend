import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Minus,
  Plus,
  RefreshCw,
  Shield,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/features/submissions/components/StatusBadge';

/* ─── Shapes that mirror /admin/dashboard ─── */

interface DashboardCounters {
  problems_total: number;
  problems_published: number;
  problems_draft: number;
  contests_total: number;
  contests_upcoming: number;
  contests_running: number;
  users_total: number;
  users_new_7d: number;
  submissions_24h: number;
  submissions_prev_24h: number;
  pending_review: number;
  pending_join: number;
  judge_queue: number;
}

interface ChartPoint {
  date: string;
  total: number;
  accepted: number;
}

interface CountBucket {
  label: string;
  count: number;
}

interface ActiveContest {
  id: number;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  participant_count: number;
  problem_count: number;
  proctored: boolean;
}

interface RecentSubmission {
  id: number;
  username: string;
  problem_slug: string;
  language: string;
  status: string;
  submitted_at: string;
}

interface TopUser {
  user_id: number;
  username: string;
  submissions: number;
  accepted: number;
}

interface DashboardResponse {
  counters: DashboardCounters;
  submissions_chart: ChartPoint[];
  status_breakdown: CountBucket[];
  language_breakdown: CountBucket[];
  active_contests: ActiveContest[];
  recent: RecentSubmission[];
  top_users: TopUser[];
  generated_at: string;
}

/* ─── Helpers ─── */

function formatDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return { pct: 0, dir: 'flat' as const };
  if (previous === 0) return { pct: 100, dir: 'up' as const };
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (pct === 0) return { pct: 0, dir: 'flat' as const };
  return { pct: Math.abs(pct), dir: pct > 0 ? ('up' as const) : ('down' as const) };
}

/**
 * Ticks every `intervalMs` so countdown/relative labels stay fresh without
 * refetching. Using a state + effect pattern keeps render pure.
 */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatRelative(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.round((now - then) / 1000);
  const abs = Math.abs(secs);
  const future = secs < 0;
  const tbl: Array<[number, string]> = [
    [60, 's'],
    [60, 'm'],
    [24, 'h'],
    [7, 'd'],
    [4.345, 'w'],
    [12, 'mo'],
  ];
  let val = abs;
  let unit = 's';
  for (const [step, u] of tbl) {
    if (val < step) {
      unit = u;
      break;
    }
    val = val / step;
    unit = u;
  }
  const rounded = val < 10 ? val.toFixed(val < 1 ? 0 : 1) : Math.round(val).toString();
  return future ? `in ${rounded}${unit}` : `${rounded}${unit} ago`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ─── KPI card ─── */

function Kpi({
  label,
  value,
  hint,
  icon,
  to,
  delta,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  to?: string;
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' };
  accent?: 'accent' | 'success' | 'warning' | 'error';
}) {
  const accentClass =
    accent === 'success'
      ? 'bg-success/10 text-success'
      : accent === 'warning'
        ? 'bg-warning/10 text-warning'
        : accent === 'error'
          ? 'bg-red-500/10 text-red-400'
          : 'bg-accent-subtle text-accent';

  const body = (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-panel p-5 transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', accentClass)}>
          {icon}
        </div>
      </div>
      <div className="flex min-h-[1.25rem] items-center justify-between text-xs text-text-muted">
        <span className="truncate">{hint ?? ''}</span>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              delta.dir === 'up' && 'text-success',
              delta.dir === 'down' && 'text-red-400',
              delta.dir === 'flat' && 'text-text-muted',
            )}
          >
            {delta.dir === 'up' && <ArrowUpRight size={12} />}
            {delta.dir === 'down' && <ArrowDownRight size={12} />}
            {delta.dir === 'flat' && <Minus size={12} />}
            {delta.pct}%
          </span>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ─── SVG area chart (no extra dep) ─── */

function SubmissionsChart({ data }: { data: ChartPoint[] }) {
  const width = 640;
  const height = 180;
  const padX = 8;
  const padY = 16;

  const { totalPath, accPath, maxVal, xStep, areaPath } = useMemo(() => {
    if (data.length === 0) {
      return { totalPath: '', accPath: '', maxVal: 0, xStep: 0, areaPath: '' };
    }
    const maxVal = Math.max(1, ...data.map((p) => p.total));
    const xStep = (width - padX * 2) / Math.max(1, data.length - 1);
    const y = (v: number) =>
      height - padY - (v / maxVal) * (height - padY * 2);
    const x = (i: number) => padX + i * xStep;

    const totalPath = data
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`)
      .join(' ');
    const accPath = data
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.accepted).toFixed(1)}`)
      .join(' ');
    const areaPath =
      `M${x(0).toFixed(1)},${(height - padY).toFixed(1)} ` +
      data.map((p, i) => `L${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ') +
      ` L${x(data.length - 1).toFixed(1)},${(height - padY).toFixed(1)} Z`;
    return { totalPath, accPath, maxVal, xStep, areaPath };
  }, [data]);

  if (data.length === 0) {
    return <div className="flex h-[180px] items-center justify-center text-sm text-text-muted">No data yet</div>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={padY + (height - padY * 2) * f}
            y2={padY + (height - padY * 2) * f}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={totalPath} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <path d={accPath} fill="none" stroke="var(--success)" strokeWidth="2" strokeDasharray="4 3" />
        {/* data points */}
        {data.map((p, i) => (
          <g key={p.date}>
            <circle
              cx={padX + i * xStep}
              cy={height - padY - (p.total / maxVal) * (height - padY * 2)}
              r={2.5}
              fill="var(--accent)"
            >
              <title>{`${p.date}: ${p.total} submissions, ${p.accepted} accepted`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>{data[0]?.date}</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-accent" /> Total
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-[2px] w-3 rounded-sm"
              style={{ background: 'var(--success)' }}
            />{' '}
            Accepted
          </span>
        </div>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

/* ─── Horizontal bar breakdown ─── */

function BreakdownBars({
  buckets,
  renderLabel,
}: {
  buckets: CountBucket[];
  renderLabel?: (b: CountBucket) => React.ReactNode;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  if (buckets.length === 0) {
    return <div className="py-6 text-center text-sm text-text-muted">No data</div>;
  }
  return (
    <div className="space-y-2.5">
      {buckets.map((b) => (
        <div key={b.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-text">{renderLabel ? renderLabel(b) : b.label}</span>
            <span className="text-text-muted">{b.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className="h-full rounded-full bg-accent/70"
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Contest pill ─── */

function ContestRow({ c, now }: { c: ActiveContest; now: number }) {
  const startMs = new Date(c.start_time).getTime();
  const endMs = new Date(c.end_time).getTime();
  const isRunning = now >= startMs && now <= endMs;
  const isUpcoming = now < startMs;

  const stateLabel = isRunning
    ? `Ends in ${formatDuration(endMs - now)}`
    : isUpcoming
      ? `Starts in ${formatDuration(startMs - now)}`
      : 'Ended';

  return (
    <Link
      to={`/contests/${c.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-bg-secondary/40 px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent-subtle/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              isRunning ? 'bg-success animate-pulse' : isUpcoming ? 'bg-warning' : 'bg-text-muted',
            )}
          />
          <p className="truncate text-sm font-medium text-text">{c.title}</p>
          {c.proctored && <Shield size={12} className="shrink-0 text-accent" />}
        </div>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {c.problem_count} problem{c.problem_count === 1 ? '' : 's'} · {c.participant_count} participant
          {c.participant_count === 1 ? '' : 's'}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
          isRunning
            ? 'bg-success/15 text-success'
            : isUpcoming
              ? 'bg-warning/15 text-warning'
              : 'bg-text-muted/15 text-text-muted',
        )}
      >
        {stateLabel}
      </span>
    </Link>
  );
}

/* ─── Attention queue item ─── */

function AttentionItem({
  icon,
  label,
  count,
  to,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  to: string;
  tone: 'warning' | 'error' | 'accent';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-warning/40 bg-warning/5 text-warning'
      : tone === 'error'
        ? 'border-red-500/40 bg-red-500/5 text-red-400'
        : 'border-accent/40 bg-accent-subtle text-accent';
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:opacity-90',
        toneClass,
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
      <span className="rounded-full bg-bg/40 px-2 py-0.5 text-xs font-semibold">{count}</span>
    </Link>
  );
}

/* ─── Main page ─── */

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const now = useNow(30_000);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiClient.get<DashboardResponse>('/admin/dashboard'),
    retry: false,
    refetchInterval: 30_000,
  });

  const counters = data?.counters;
  const delta = counters
    ? formatDelta(counters.submissions_24h, counters.submissions_prev_24h)
    : undefined;

  const attentionCount =
    (counters?.pending_review ?? 0) +
    (counters?.pending_join ?? 0) +
    (counters?.judge_queue ?? 0);

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard</h1>
          <p className="text-sm text-text-muted">
            Welcome back, <span className="text-text">{user?.username}</span>
            {dataUpdatedAt > 0 && (
              <>
                {' · '}updated {formatRelative(new Date(dataUpdatedAt).toISOString(), now)}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/problems/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent"
          >
            <Plus size={14} /> Problem
          </Link>
          <Link
            to="/contests/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent"
          >
            <Plus size={14} /> Contest
          </Link>
          {isAdmin && (
            <Link
              to="/groups/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent"
            >
              <Plus size={14} /> Group
            </Link>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      {/* ─── Attention banner ─── */}
      {attentionCount > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-warning" size={18} />
            <div>
              <p className="text-sm font-medium text-text">
                {attentionCount} item{attentionCount === 1 ? '' : 's'} need your attention
              </p>
              <p className="text-xs text-text-muted">
                Clear the queues below to keep things moving.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:min-w-[520px]">
            <AttentionItem
              icon={<ClipboardCheck size={14} />}
              label="Pending review"
              count={counters?.pending_review ?? 0}
              to="/submissions?status=pending_review"
              tone="warning"
            />
            <AttentionItem
              icon={<Activity size={14} />}
              label="Judge queue"
              count={counters?.judge_queue ?? 0}
              to="/submissions?status=pending"
              tone="accent"
            />
            <AttentionItem
              icon={<UserPlus size={14} />}
              label="Join requests"
              count={counters?.pending_join ?? 0}
              to="/groups"
              tone="accent"
            />
          </div>
        </div>
      )}

      {/* ─── KPI cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Problems"
          value={isLoading ? '—' : (counters?.problems_total ?? 0)}
          hint={
            counters
              ? `${counters.problems_published} published · ${counters.problems_draft} draft`
              : 'Loading…'
          }
          icon={<FileText size={18} />}
          to="/problems"
        />
        <Kpi
          label="Contests"
          value={isLoading ? '—' : (counters?.contests_total ?? 0)}
          hint={
            counters
              ? `${counters.contests_running} running · ${counters.contests_upcoming} upcoming`
              : 'Loading…'
          }
          icon={<Trophy size={18} />}
          to="/contests"
          accent={counters && counters.contests_running > 0 ? 'success' : 'accent'}
        />
        <Kpi
          label="Users"
          value={isLoading ? '—' : (counters?.users_total ?? 0)}
          hint={counters ? `+${counters.users_new_7d} in last 7 days` : 'Loading…'}
          icon={<Users size={18} />}
          to={isAdmin ? '/users' : undefined}
        />
        <Kpi
          label="Submissions · 24h"
          value={isLoading ? '—' : (counters?.submissions_24h ?? 0)}
          hint={
            counters
              ? `vs ${counters.submissions_prev_24h} previous 24h`
              : 'Loading…'
          }
          icon={<Activity size={18} />}
          to="/submissions"
          delta={delta}
        />
      </div>

      {/* ─── Middle row: chart + active contests ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-panel p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text">Submissions · last 14 days</h2>
              <p className="text-xs text-text-muted">Hover points for a daily breakdown.</p>
            </div>
          </div>
          <SubmissionsChart data={data?.submissions_chart ?? []} />
        </div>

        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Active & upcoming</h2>
            <Link to="/contests" className="text-xs text-accent hover:underline">
              All contests
            </Link>
          </div>
          {(data?.active_contests ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-text-muted">
              No running or upcoming contests.
            </div>
          ) : (
            <div className="space-y-2">
              {data!.active_contests.map((c) => (
                <ContestRow key={c.id} c={c} now={now} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Breakdowns row ─── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Status · last 7 days</h2>
            <Link to="/submissions" className="text-xs text-accent hover:underline">
              View submissions
            </Link>
          </div>
          <BreakdownBars
            buckets={data?.status_breakdown ?? []}
            renderLabel={(b) => <StatusBadge status={b.label} />}
          />
        </div>

        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Languages · last 7 days</h2>
          </div>
          <BreakdownBars
            buckets={data?.language_breakdown ?? []}
            renderLabel={(b) => (
              <span className="rounded-md bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-text">
                {b.label}
              </span>
            )}
          />
        </div>
      </div>

      {/* ─── Bottom row: recent submissions + top users ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-panel p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Recent submissions</h2>
            <Link to="/submissions" className="text-xs text-accent hover:underline">
              Open queue
            </Link>
          </div>
          {(data?.recent ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-text-muted">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {data!.recent.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/submissions/${r.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:bg-accent-subtle/30 -mx-2 px-2 rounded-md"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusBadge status={r.status} />
                      <span className="truncate text-text">{r.username}</span>
                      <span className="truncate text-text-muted">·</span>
                      <span className="truncate font-mono text-xs text-text-muted">
                        {r.problem_slug || '—'}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-text-muted">
                      <span className="rounded-md bg-bg-secondary px-1.5 py-0.5 font-mono">
                        {r.language}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {formatRelative(r.submitted_at, now)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Top users · 7 days</h2>
            <UsersRound size={14} className="text-text-muted" />
          </div>
          {(data?.top_users ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-text-muted">No activity yet.</div>
          ) : (
            <ul className="space-y-2.5">
              {data!.top_users.map((u, idx) => {
                const rate =
                  u.submissions > 0 ? Math.round((u.accepted / u.submissions) * 100) : 0;
                return (
                  <li
                    key={u.user_id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-bg-secondary/40 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
                        {idx + 1}
                      </span>
                      <span className="truncate text-sm text-text">{u.username}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-text-muted">
                      <span>{u.submissions}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5',
                          rate >= 50
                            ? 'bg-success/15 text-success'
                            : rate >= 20
                              ? 'bg-warning/15 text-warning'
                              : 'bg-red-500/15 text-red-400',
                        )}
                      >
                        <CheckCircle2 size={10} /> {rate}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
