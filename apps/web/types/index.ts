export type UserProfile = {
  id: number;
  email: string;
  display_name: string;
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
  status: string;
  step_number: number;
  total_steps: number;
  current_step: ScenarioStep | null;
};

export type AnswerResult = SessionState & {
  is_correct: boolean;
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

