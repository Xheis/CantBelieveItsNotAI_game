export function createSocket(type, handlers = {}) {
  let ws;
  let reconnectDelay = 500;

  function connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/ws?type=${encodeURIComponent(type)}`;

    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      reconnectDelay = 500;
      handlers.onOpen?.();
    });

    ws.addEventListener("message", (event) => {
      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.t === "welcome") {
        handlers.onWelcome?.(message);
      }

      if (message.t === "state") {
        handlers.onState?.(message.state);
      }

      if (message.t === "error") {
        handlers.onError?.(message);
      }
    });

    ws.addEventListener("close", () => {
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 5000);
    });
  }

  connect();

  return {
    send(message) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },
  };
}