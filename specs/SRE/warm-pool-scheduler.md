# Warm Pool Scheduler (Fly Machines API)

## Overview
The warm pool scheduler keeps ready-to-serve Windows viewer Machines running on Fly.io so that 50 simultaneous remote-desktop sessions can be accepted with p95 queue time ≤ 0.5s. It targets the Fly Machines API and runs in a control loop per-region. Warm capacity is maintained on the private 6PN network, and machines are attached to guacd/xrdp for health checks and to the demand queue for assignments.

## Goals & Requirements
- Maintain warm_min/warm_max counts per region using the Machines API.
- Health check combines a TCP connect to guacd (port 4822) and a synthetic xrdp handshake to verify readiness.
- All listener bindings use `fly-local-6pn`; no services are exposed outside 6PN.
- Failed Machines are replaced automatically.
- Use autostart/autostop for cold machines to absorb spikes while controlling cost.
- Keep queue-time SLO (p95 ≤ 0.5s for assignment) under 50 concurrent sessions.

## Regional Warm Pools
- **Configuration:** warm_min and warm_max per Fly region (e.g. `iad`, `lhr`, `nrt`). Each region has a control loop that reconciles desired vs. actual warm Machines.
- **Labels & Metadata:** Machines are tagged with `app=cupbear-viewer`, `role=warm-pool`, `region=<region>`, `state={warm,assigned,draining}` so the scheduler can filter API listings quickly.
- **Sizing Heuristic:** warm_min sized to cover historical 90th percentile concurrent sessions; warm_max sized for anticipated spikes (e.g. +40%). Scaling inputs include queue depth, assignment rate, and CDN signal for new viewers.

### Reconciliation Loop
1. Poll Machines API (or consume Machine event stream) every ~5s per region.
2. Compare number of healthy warm Machines with warm_min/warm_max.
3. Actions:
   - **Below warm_min:** `fly machines clone`/API create from template (with `schedule: always`) until warm_min satisfied.
   - **Between warm_min and warm_max:** keep Machines idling (`schedule: always`).
   - **Above warm_max:** mark oldest warm Machines as `draining`, disable scheduler assignment, and issue `fly machines stop` (autostop) when idle.

## Health Checks
- **guacd TCP Probe:** Attempt to connect over 6PN to the guacd listener. Failure increments a strike counter.
- **Synthetic xrdp Handshake:** After guacd connect, initiate minimal xrdp negotiation (negotiate security + login request) to ensure the Windows VM is ready. Any protocol error or timeout marks Machine unhealthy.
- **Unhealthy Handling:** Machines with ≥3 consecutive failed probes are immediately `fly machines destroy`ed and replaced if under warm_min.

## Assignment Flow
1. Scheduler receives a session request (with region preference and 6PN client address).
2. Choose the nearest region with available warm Machines (`state=warm` & healthy=true).
3. Atomically patch Machine metadata to `state=assigned`, attach viewer session credentials, and return its 6PN address to the gateway.
4. Start session: the machine stays `schedule: always` while in use; the WebSocket gateway connects over 6PN.
5. On session end, machine transitions to `draining`:
   - Run teardown playbooks (clear credentials, reset).
   - Trigger autostop: `fly machines stop --signal SIGTERM --restart no` so Fly halts billing.
   - After autostop complete, issue `fly machines start` if we need to replenish warm_min, otherwise leave stopped.

## Autostart/Autostop for Spikes
- **Warm Buffer:** When queue depth > 10 or p95 queue time > 0.4s, pre-emptively start cold Machines up to warm_max. Set their `schedule` to `manual` so they stop when idle.
- **Cost Guardrails:** Run a background job that parks idle Machines once concurrency < warm_min. Use Fly's built-in autostart (HTTP/TCP trigger) disabled; instead explicit start to prevent accidental public exposure.

## Failure & Replacement
- Use Machine event subscriptions (`fly machines events --json`) to detect `exit`, `destroyed`, `health_unhealthy`.
- On unexpected exit, immediately decrement warm count and enqueue replacement create.
- Keep golden image template versioned; update metadata `template_version` for rolling restarts.
- Store scheduler state in lightweight store (e.g. Redis or etcd) to coordinate multiple scheduler instances.

## Networking
- All services bind to `fly-local-6pn` addresses. No Flycast or public services are configured. Security groups enforce 6PN-only connectivity.
- For isolation, Machines can be placed on custom 6PN networks per environment (demo, staging, prod) using Fly organization-level 6PN apps.
- Authentication between scheduler and Machines uses WireGuard (Flyctl token) over 6PN.

## Observability & SLO Tracking
- **Metrics:** emit `warm_available`, `warm_unhealthy`, `queue_depth`, `assign_latency`, `machine_replace_count` per region.
- **Tracing:** instrument assignment flow to measure `assign_to_connect` for SLO compliance.
- **Logging:** capture health check outcomes and Machine lifecycle events with correlation IDs.
- Alerts trigger when warm_available < warm_min for >30s or queue p95 > 0.5s.

## Operational Runbook
- `fly machines list -a cupbear-viewer -r <region>` to inspect pool.
- `fly machines update <id> --schedule always` to pin a Machine warm during incidents.
- Use `fly status --app cupbear-viewer` for region summary and confirm 6PN-only exposure.
- During major releases, drain by setting warm_max = warm_min and letting Machines cycle.

