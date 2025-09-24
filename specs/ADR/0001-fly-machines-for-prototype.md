# ADR-0001: Use Fly.io Machines (Firecracker) for Prototype
Status: Accepted (2025-09-24)
Context: Need fastest path to demo with isolated workers and WebSocket-friendly ingress.
Decision: Adopt Fly Machines for viewer/guac; use Cloudflare R2 with Bucket Locks (retention/legal hold) for audit/safe copies.
Consequences: +Fast TTFP, +Edge rate limiting/bot scoring at CDN, +6PN private mesh, -Warm pool to manage, -Need Bucket Locks governance (retention/hold lifecycle).
Notes: WebSocket is supported end-to-end via Fly’s L4; apply edge throttling (rate limiting) at CDN for WS handshake and API.
Alternatives: AWS bare-metal Firecracker; Azure AKS Confidential Containers (kept as future).
