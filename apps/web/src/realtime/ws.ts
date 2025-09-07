let socket: WebSocket | null = null;
let pingTimer: any = null;

export function initRealtime() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  const url = (process.env.NEXT_PUBLIC_WS_URL as string) || 'ws://localhost:4100';
  try {
    socket = new WebSocket(url);
  } catch {
    return;
  }
  socket.addEventListener('open', () => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      try { socket?.send(JSON.stringify({ type: 'ping', ts: Date.now() })); } catch {}
    }, 25000);
  });
  socket.addEventListener('message', (evt) => {
    try {
      const data = JSON.parse(String(evt.data));
      if (data && typeof data.type === 'string') {
        if (data.type.startsWith('incident.')) {
          try { window.dispatchEvent(new CustomEvent('incidents-updated')); } catch {}
        } else if (data.type === 'presence') {
          try { window.dispatchEvent(new CustomEvent('presence', { detail: { count: data.count } })); } catch {}
        }
      }
    } catch {}
  });
  socket.addEventListener('close', () => {
    if (pingTimer) clearInterval(pingTimer);
    // Retry after delay
    setTimeout(() => initRealtime(), 2000);
  });
}
