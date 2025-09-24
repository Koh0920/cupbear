# SLO v0.1 (demo)
SLIs:
- TTFP (First Pixel): p95 ≤ 2.0s
  - Measurement: RUM on demo-web (performance.timing + viewer iframe load event)
  - Window: 28 days; Aggregation: p95 daily, rollup p95 of p95s
  - Exclusions: planned maintenance windows announced ≥24h; third-party global outages
- Queue time (assign VM): p95 ≤ 0.5s
  - Measurement: server metrics from pool-scheduler (assign_to_connect delta)
  - Window: 28 days; Aggregation: p95
  - Exclusions: capacity drills; chaos experiments marked with tag
- WebSocket drop rate (10min): ≤ 1.0%
  - Measurement: guac-web/ws gateway disconnects ÷ active sessions (sliding 10min)
  - Window: rolling; Aggregation: max per day
  - Exclusions: client-side network failures flagged by RUM (offline)
- Safe copy success rate: ≥ 20%
  - Measurement: audit-svc events result=="safe_copied" ÷ all attempts
  - Window: 28 days; Aggregation: average daily
  - Exclusions: upstream storage maintenance windows

Error budget: 5% monthly for each latency SLI
Release gate: if budget exhausted → freeze; fix before deploy
