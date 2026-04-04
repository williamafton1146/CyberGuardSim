import type {
  AdminScenario,
  AdminScenarioInput,
  AdminUser,
  AnswerResult,
  AuthResponse,
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
  scenario_progress: [],
  recent_mistakes: []
};

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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  display_name: string;
}) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload: { identifier: string; password: string }) {
  return request<AuthResponse>("/auth/login", {
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
    return [];
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

export async function getAdminUsers(token: string) {
  return request<AdminUser[]>("/admin/users", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteAdminUser(token: string, userId: number) {
  return request<void>(`/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminScenarios(token: string) {
  return request<AdminScenario[]>("/admin/scenarios", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createAdminScenario(token: string, payload: AdminScenarioInput) {
  return request<AdminScenario>("/admin/scenarios", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateAdminScenario(token: string, scenarioId: number, payload: AdminScenarioInput) {
  return request<AdminScenario>(`/admin/scenarios/${scenarioId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminScenario(token: string, scenarioId: number) {
  return request<void>(`/admin/scenarios/${scenarioId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export { demoStats };
