import { scenarioCatalog } from "@cyber-sim/shared";

import type {
  AnswerResult,
  CertificateStatus,
  CertificateVerification,
  LeaderboardEntry,
  ScenarioSummary,
  SessionState,
  UserProfile,
  UserStats
} from "@/types";

function resolveApiUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window === "undefined") {
    return envUrl ?? "http://localhost:8000";
  }

  if (envUrl) {
    return envUrl;
  }

  const { hostname, origin, port, protocol } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal && port === "3000") {
    return `${protocol}//${hostname}:8000`;
  }

  return origin;
}

const demoStats: UserStats = {
  total_sessions: 0,
  completed_sessions: 0,
  success_rate: 0,
  average_score: 0,
  total_mistakes: 0,
  scenario_progress: scenarioCatalog.map((scenario) => ({
    slug: scenario.slug,
    title: scenario.title,
    status: scenario.isPlayable ? "not_started" : "locked",
    best_score: 0
  })),
  recent_mistakes: []
};

function scenarioFallback(): ScenarioSummary[] {
  return scenarioCatalog.map((scenario) => ({
    slug: scenario.slug,
    title: scenario.title,
    theme: scenario.theme,
    difficulty: scenario.difficulty,
    description: scenario.isPlayable
      ? "Игровая ветка с пошаговой обратной связью, подсказками и фиксацией прогресса."
      : "Подготовленная ветка сценария для следующего этапа.",
    is_playable: scenario.isPlayable,
    step_count: 4
  }));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${resolveApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let message = "Ошибка запроса";
    try {
      const payload = await response.json();
      message = payload.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  display_name: string;
}) {
  return request<{ access_token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getMe(token: string) {
  return request<UserProfile>("/users/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getStats(token: string) {
  return request<UserStats>("/users/me/stats", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getScenarios() {
  try {
    return await request<ScenarioSummary[]>("/scenarios");
  } catch {
    return scenarioFallback();
  }
}

export async function startSession(token: string, scenario_slug: string) {
  return request<SessionState>("/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ scenario_slug })
  });
}

export async function submitAnswer(token: string, sessionId: number, optionId: number) {
  return request<AnswerResult>(`/sessions/${sessionId}/answers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ option_id: optionId })
  });
}

export async function getLeaderboard(token: string) {
  return request<LeaderboardEntry[]>("/api/leaderboard", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getCertificateStatus(token: string) {
  return request<CertificateStatus>("/users/me/certificate", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function issueCertificate(token: string) {
  return request<CertificateStatus>("/users/me/certificate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function verifyCertificate(code: string) {
  return request<CertificateVerification>(`/api/certificates/${code}`);
}

export { demoStats };
