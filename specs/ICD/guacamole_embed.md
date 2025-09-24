# Guacamole Embed ICD v0.1
- Protocol: HTTPS + WebSocket (wss), single origin
- Embed: `<iframe src="/embed?token=ONE_TIME" sandbox="allow-scripts allow-forms">`
 - CSP (page): `default-src 'none'; connect-src 'self' wss://...; frame-src 'self'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data: blob: https:`
- Features disabled: bidirectional clipboard OFF, file transfer OFF, audio OFF, color-depth <= 16bit
- Session: one-time token, valid ≤ 120s; single use; refresh once permitted on failure
- Health: websocket ping/pong p95 ≤ 1.5s; auto-reconnect OFF for demo
- Timeouts: guacd handshake ≤ 1000ms; viewer connect ≤ 1500ms
- Error map (user-facing): 403/404/timeout/size>25MB/unsupported mime
- Proxy note:
  - Explicitly set reverse proxy WS/HTTP request size limits so the initial Guacamole handshake is not truncated. Defaults of 1MB (e.g. Fly Proxy) must be raised per https://guacamole.apache.org/doc/gug/proxying-guacamole.html.
  - Example (nginx):
    ```
    client_max_body_size 8m;
    proxy_buffer_size 8k;
    proxy_busy_buffers_size 16k;
    proxy_buffers 16 16k;
    ```
