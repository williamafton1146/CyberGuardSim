import type { SessionState } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function connectSessionSocket(
  sessionId: number,
  onMessage: (payload: SessionState) => void
) {
  const socket = new WebSocket(`${WS_URL}/ws/sessions/${sessionId}`);
  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data) as SessionState;
    onMessage(payload);
  };
  return socket;
}

