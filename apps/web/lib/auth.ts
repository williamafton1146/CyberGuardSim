const TOKEN_KEY = "cyberguardsim-token";
const USER_KEY = "cyberguardsim-user";
const AUTH_EVENT = "cyberguardsim-auth-change";
const LEGACY_TOKEN_KEY = "cyber-sim-token";
const LEGACY_USER_KEY = "cyber-sim-user";

function migrateLegacyAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  const legacyToken = window.localStorage.getItem(LEGACY_TOKEN_KEY);
  const legacyUser = window.localStorage.getItem(LEGACY_USER_KEY);

  if (!window.localStorage.getItem(TOKEN_KEY) && legacyToken) {
    window.localStorage.setItem(TOKEN_KEY, legacyToken);
  }

  if (!window.localStorage.getItem(USER_KEY) && legacyUser) {
    window.localStorage.setItem(USER_KEY, legacyUser);
  }

  if (legacyToken || legacyUser) {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_USER_KEY);
  }
}

function notifyAuthChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }
  migrateLegacyAuthStorage();
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChange();
}

export function saveAuthUser(user: unknown) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function saveAuthSession(token: string, user: unknown) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function getStoredUser<T>() {
  if (typeof window === "undefined") {
    return null as T | null;
  }

  migrateLegacyAuthStorage();

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null as T | null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null as T | null;
  }
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_USER_KEY);
  notifyAuthChange();
}

export function getAuthEventName() {
  return AUTH_EVENT;
}
