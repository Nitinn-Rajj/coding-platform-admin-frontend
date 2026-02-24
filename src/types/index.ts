/* ─── User / Auth ─── */
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  rating: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  rating: number;
  created_at: string;
  submissions_count: number;
  problems_solved: number;
  contests_participated: number;
}

/* ─── Problem ─── */
export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_ms: number;
  memory_limit_kb: number;
  is_published: boolean;
  active_revision: number;
  created_by: number;
  creator_username: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  test_count: number;
}

export interface ProblemRevision {
  revision: number;
  title: string;
  description: string;
  difficulty: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  change_summary: string;
  created_by: number;
  created_at: string;
}

/* ─── Test Case ─── */
export interface TestCase {
  id: string;
  problem_id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
  generator_batch_id: string | null;
  created_by: number;
  created_at: string;
}

export interface GeneratedBatch {
  id: string;
  problem_id: string;
  generator_id: string;
  count: number;
  args_template: string;
  created_by: number;
  created_at: string;
}

/* ─── Components (Generator, Validator, Checker, Interactor, Solution) ─── */
export type ComponentType = 'generators' | 'validators' | 'checkers' | 'interactors' | 'solutions';

export interface ProblemComponent {
  id: string;
  problem_id: string;
  name: string;
  source_code: string;
  language: string;
  is_active: boolean;
  // solution-specific
  solution_type?: 'main' | 'brute' | 'wa' | 'tle';
  created_by: number;
  created_at: string;
  updated_at: string;
}

/* ─── Problem Access ─── */
export type AccessRole = 'viewer' | 'tester' | 'editor' | 'owner';

export interface ProblemAccess {
  user_id: number;
  username: string;
  access_role: AccessRole;
  granted_at: string;
}

/* ─── Contest ─── */
export type ContestStatus = 'draft' | 'upcoming' | 'running' | 'ended' | 'finalized';
export type ScoringType = 'icpc' | 'ioi';

export interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  scoring_type: ScoringType;
  status: ContestStatus;
  is_public: boolean;
  freeze_time_minutes: number | null;
  penalty_time_seconds: number;
  allow_virtual: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  problems_count: number;
  participants_count: number;
}

export interface ContestProblem {
  id: string;
  contest_id: string;
  problem_id: string;
  problem_title: string;
  label: string;
  order_index: number;
  max_points: number;
  scoring_config: Record<string, unknown> | null;
}

/* ─── Testing ─── */
export interface TestResult {
  test_index: number;
  verdict: string;
  time_ms: number;
  memory_kb: number;
  stdout: string;
  expected_output: string;
}

export interface StressTestResult {
  status: string;
  iterations_run: number;
  failing_input?: string;
  main_output?: string;
  brute_output?: string;
  error?: string;
}

/* ─── Audit Log ─── */
export interface AuditLogEntry {
  id: string;
  user_id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

/* ─── Pagination ─── */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
