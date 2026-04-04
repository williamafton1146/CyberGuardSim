import type { SessionState } from "@/types";

function resolveWsUrl() {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (typeof window === "undefined") {
    return envUrl ?? "ws://localhost:8000";
  }

  if (envUrl) {
    return envUrl;
  }

  const { hostname, origin, port, protocol } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal && port === "3000") {
    return `ws://${hostname}:8000`;
  }

  return origin.replace(protocol, protocol === "https:" ? "wss:" : "ws:");
}

export function connectSessionSocket(
  sessionId: number,
  token: string,
  onMessage: (payload: SessionState) => void
) {
  const socket = new WebSocket(`${resolveWsUrl()}/ws/sessions/${sessionId}?token=${encodeURIComponent(token)}`);
  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data) as SessionState;
    onMessage(payload);
  };
  return socket;
}
