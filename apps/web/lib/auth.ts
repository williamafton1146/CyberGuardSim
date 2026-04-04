const TOKEN_KEY = "cyber-sim-token";
const USER_KEY = "cyber-sim-user";
const AUTH_EVENT = "cyber-sim-auth-change";

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
  notifyAuthChange();
}

export function getAuthEventName() {
  return AUTH_EVENT;
}
