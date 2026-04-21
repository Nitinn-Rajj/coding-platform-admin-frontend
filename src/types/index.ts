/* ─── User / Auth ─── */
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  rating: number;
  is_banned?: boolean;
  created_at: string;
  can_access_admin?: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  rating: number;
  is_banned: boolean;
  banned_at?: string | null;
  banned_by?: number | null;
  ban_reason?: string;
  created_at: string;
  submissions_count: number;
  problems_solved: number;
  contests_participated: number;
}

/* ─── Problem ─── */
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ProblemType = 'standard' | 'subjective';

export type ProblemStatus = 'draft' | 'published';

export interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  time_limit_ms: number;
  memory_limit_mb: number;
  points?: number | null;
  problem_type: ProblemType;
  created_by: number;
  creator_name: string;
  test_count: number;
  created_at: string;
  published_at: string | null;
  status: ProblemStatus;
  // populated via detail endpoint
  tags?: TagInfo[];
  statement?: string;
  checker_code?: string;
  contest_id?: number | null;
}

export interface TagInfo {
  id: number;
  name: string;
}

export interface ProblemRevision {
  id: number;
  problem_id: number;
  revision: number;
  title: string;
  difficulty: Difficulty;
  time_limit_ms: number;
  memory_limit_mb: number;
  points?: number | null;
  is_active: boolean;
  created_by: number;
  creator_name: string;
  created_at: string;
}

/* ─── Test Case ─── */
export interface TestCase {
  id: number;
  problem_id: number;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
  generator_batch_id: string | null;
  created_by: number;
  created_at: string;
}

export interface ValidationFailure {
  test_id: number;
  order_index: number; // 1-based display number
  error: string;
  input: string;       // truncated input snippet
}

export interface ValidateTestsResponse {
  valid: boolean;
  total: number;
  passed: number;
  failures: ValidationFailure[];
}

export interface GeneratedBatch {
  id: string;
  problem_id: number;
  generator_id: string;
  count: number;
  args_template: string;
  created_by: number;
  created_at: string;
}

/* ─── Components (Generator, Validator, Checker, Interactor, Solution) ─── */
export type ComponentType =
  | 'generators'
  | 'validators'
  | 'checkers'
  | 'interactors'
  | 'solutions';

/** Matches backend `ComponentInfo` in admin_components.go. Fields marked
 *  optional are only populated for specific component types:
 *    generators  → description, is_active
 *    validators  → is_active
 *    checkers    → is_active, checker_type
 *    interactors → is_active
 *    solutions   → expected_verdict, tag
 *  All components are C++ only; there is no `language` field on the wire.
 */
export type CheckerType = 'standard' | 'partial' | 'interactive';
export type SolutionTag = 'main' | 'brute' | 'wa' | 'tle';

export interface ProblemComponent {
  id: number;
  problem_id: number;
  name: string;
  source_code: string;
  description?: string;
  is_active?: boolean;
  checker_type?: CheckerType;
  expected_verdict?: string;
  tag?: SolutionTag | string;
  created_by: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

/* ─── Problem Access ─── */
export type AccessRole = 'viewer' | 'tester' | 'editor' | 'owner';

export interface ProblemAccess {
  user_id: number;
  username: string;
  role: AccessRole;
  granted_at: string;
  granted_by: number;
}

/* ─── Contest ─── */
export type ContestStatus = 'draft' | 'upcoming' | 'running' | 'ended' | 'finalized';
export type ScoringType = 'icpc' | 'ioi';
export type ScoringMode = 'all_or_nothing' | 'partial';
export type GradeVisibility = 'private' | 'group';

export interface Contest {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_rated: boolean;
  scoring_type: ScoringType;
  status: ContestStatus;
  problem_count: number;
  participant_count: number;
  created_by: number;
  creator_name: string;
  created_at: string;
  penalty_time_seconds?: number;
  freeze_time_minutes?: number | null;
  allow_virtual?: boolean;
  group_id?: number | null;
  group_name?: string;
  proctored: boolean;
  grade_visibility: GradeVisibility;
  problems?: ContestProblem[];
}

export interface ContestProblem {
  id: number;
  problem_id: number;
  title: string;
  slug: string;
  problem_type: ProblemType;
  max_points: number;
  problem_order: number;
  scoring_mode: ScoringMode;
  scoring_config?: string;
}

/* ─── Groups ─── */
export interface Group {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  member_count?: number;
  my_role?: string;
  is_member?: boolean;
}

export interface GroupMember {
  group_id: number;
  user_id: number;
  username: string;
  role: 'member' | 'admin';
  joined_at: string;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface GroupJoinRequest {
  id: number;
  group_id: number;
  group_name?: string;
  user_id: number;
  username: string;
  status: JoinRequestStatus;
  message: string;
  decided_by?: number | null;
  decided_at?: string | null;
  created_at: string;
}

/* ─── Proctor Events ─── */
export interface ProctorEvent {
  id: number;
  contest_id: number;
  user_id: number;
  username?: string;
  event_type: string;
  details?: unknown;
  created_at: string;
}

export interface ProctorUserSummary {
  user_id: number;
  username: string;
  total_events: number;
  last_event_at?: string | null;
  fs_exit: number;
  tab_visibility: number;
  window_blur: number;
  right_click: number;
  devtools: number;
}

/* ─── Submissions / Grading ─── */
export type SubmissionStatus =
  | 'pending'
  | 'pending_review'
  | 'judging'
  | 'accepted'
  | 'rejected'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error'
  | 'partial';

export interface AdminSubmissionSummary {
  id: number;
  user_id: number;
  username: string;
  problem_id: number;
  problem_slug: string;
  problem_type: ProblemType;
  contest_id?: number | null;
  contest_name?: string;
  language: string;
  status: SubmissionStatus;
  passed_count: number;
  total_count: number;
  manual_score?: number | null;
  is_locked: boolean;
  has_feedback: boolean;
  submitted_at: string;
  graded_at?: string | null;
}

export interface AdminSubmissionDetail extends AdminSubmissionSummary {
  source_code: string;
  feedback: string;
  grader_name?: string;
  max_points?: number;
  result?: unknown;
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
  id: number;
  user_id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id: number;
  details: Record<string, unknown> | null;
  ip_address?: string;
  created_at: string;
}

/* ─── Pagination ─── */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
