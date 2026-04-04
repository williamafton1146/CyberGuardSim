export type UserProfile = {
  id: number;
  email: string;
  username: string | null;
  display_name: string;
  role: "user" | "admin";
  security_rating: number;
  league: string;
};

export type DecisionOption = {
  id: number;
  label: string;
};

export type ScenarioStep = {
  id: number;
  step_order: number;
  prompt: string;
  threat_type: string;
  explanation: string;
  options: DecisionOption[];
};

export type ScenarioSummary = {
  id: number;
  slug: string;
  title: string;
  theme: string;
  difficulty: string;
  description: string;
  is_playable: boolean;
  step_count: number;
};

export type ScenarioDetail = ScenarioSummary & {
  steps: ScenarioStep[];
};

export type ScenarioProgress = {
  slug: string;
  title: string;
  status: string;
  best_score: number;
};

export type RecentMistake = {
  scenario_title: string;
  step_prompt: string;
  option_label: string;
  consequence_text: string;
};

export type UserStats = {
  total_sessions: number;
  completed_sessions: number;
  success_rate: number;
  average_score: number;
  total_mistakes: number;
  scenario_progress: ScenarioProgress[];
  recent_mistakes: RecentMistake[];
};

export type SessionState = {
  session_id: number;
  scenario_slug: string;
  scenario_title: string;
  hp_left: number;
  score: number;
  max_score: number;
  status: string;
  step_number: number;
  total_steps: number;
  current_step: ScenarioStep | null;
};

export type AnswerResult = SessionState & {
  is_correct: boolean;
  severity: "safe" | "warning" | "critical";
  hint: string | null;
  consequence_text: string;
  explanation: string;
  completed: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  display_name: string;
  security_rating: number;
  league: string;
  completed_sessions: number;
};

export type IssuedCertificate = {
  code: string;
  display_name: string;
  league: string;
  security_rating: number;
  issued_at: string;
  verify_url: string;
};

export type CertificateStatus = {
  status: "not_eligible" | "eligible" | "issued";
  completed_scenarios: number;
  required_scenarios: number;
  certificate: IssuedCertificate | null;
};

export type CertificateVerification = {
  code: string;
  display_name: string;
  league: string;
  security_rating: number;
  issued_at: string;
  verify_url: string;
  status: "valid";
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  redirect_to: string;
  user: UserProfile;
};

export type AdminUser = {
  id: number;
  email: string;
  username: string | null;
  display_name: string;
  role: "user" | "admin";
  security_rating: number;
  league: string;
  total_sessions: number;
  completed_scenarios: number;
  created_at: string | null;
};

export type AdminDecisionOption = {
  id: number;
  label: string;
  is_correct: boolean;
  hp_delta: number;
  hint: string | null;
  consequence_text: string;
};

export type AdminScenarioStep = {
  id: number;
  step_order: number;
  prompt: string;
  threat_type: string;
  explanation: string;
  options: AdminDecisionOption[];
};

export type AdminScenario = {
  id: number;
  slug: string;
  title: string;
  theme: string;
  difficulty: string;
  description: string;
  is_enabled: boolean;
  release_at: string | null;
  status: "draft" | "scheduled" | "live" | "disabled";
  is_playable: boolean;
  step_count: number;
  created_at: string | null;
  updated_at: string | null;
  has_sessions: boolean;
  steps: AdminScenarioStep[];
};

export type AdminScenarioOptionInput = {
  label: string;
  is_correct: boolean;
  hp_delta: number;
  hint: string | null;
  consequence_text: string;
};

export type AdminScenarioStepInput = {
  step_order: number;
  prompt: string;
  threat_type: string;
  explanation: string;
  options: AdminScenarioOptionInput[];
};

export type AdminScenarioInput = {
  slug: string;
  title: string;
  theme: string;
  difficulty: string;
  description: string;
  is_enabled: boolean;
  release_at: string | null;
  steps: AdminScenarioStepInput[];
};
