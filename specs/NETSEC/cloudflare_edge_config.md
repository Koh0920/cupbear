# Cloudflare Edge Configuration (PR-8)

## Scope
Applies to production and staging zones fronting the Cupbear app and APIs. Covers Turnstile, Bot Management, Advanced Rate Limiting, and R2 bucket retention.

## Turnstile rollout
- Obtain dedicated Site & Secret keys per environment.
- Store secrets in existing secret manager (e.g. Fly secrets) and inject via CI.
- Update app configuration so staging uses staging keys; production uses production keys.
- Audit network logs for Turnstile verify endpoint (\`https://challenges.cloudflare.com\`). Ensure outbound firewall allows 443.
- Record key rotation process: minimum quarterly rotation; revoke keys on leakage.

## Advanced Rate Limiting for /sessions POST
- Create a rate limiting rule targeting `http.request.uri.path contains "/sessions" and http.request.method == "POST"`.
- Segment traffic by:
  - `cf.bot_management.score` (<30 treated as high risk).
  - Source network: use `/24` aggregation on `ip.src` for IPv4 (or /64 for IPv6).
  - Device fingerprinting: include cookie or header `cf_chl_2`/`fingerprint` data when present.
  - ASN-based overrides: block known hostile ASNs immediately.
- Threshold: allow up to 10 attempts per minute per segment; exceeding triggers block action (WAF drop).
- Configure rule to respond with block (not managed challenge) to keep origin load minimal.
- Log rule ID and export events to SIEM; alert on >3 blocks/min.

## Bot Management policy
- Enable Bot Management analytics dashboard.
- Create firewall rule: if `cf.bot_management.score < 10` or known automation fingerprints, issue JS challenge; if score < 5, block.
- Whitelist verified automation partners (documented) using service tokens.
- Monitor analytics weekly; adjust thresholds as legitimate traffic data emerges.

## Observability & Verification
- Use Cloudflare Firewall Analytics to confirm blocked requests never reach origin (origin logs should show no matching spikes).
- Add Datadog dashboards correlating WAF blocks vs origin `/sessions` load.
- Document runbook for investigating false positives (include bypass procedure).

## R2 Bucket Locks retention (safe/ prefix)
- Identify R2 buckets storing audit/safe copies. Enable Bucket Lock with retention of 90 days.
- Apply object lock configuration scoped to `safe/` prefix if full bucket lock not feasible.
- Use Cloudflare API `PUT /accounts/{account_id}/r2/buckets/{bucket}/lock` to enforce retention; record request/response IDs.
- Verify via UI: R2 bucket settings show 90-day retention for relevant scope.
- Verify via API: `GET .../lock` returns retention policy with `retention_duration_days: 90`.
- Document escalation for legal hold requirements.

## Change management
- Implement changes in staging first; monitor 24h for anomalies before production rollout.
- Communicate updates to SRE and security channels including rule IDs and dashboards.
- Schedule quarterly review of thresholds, retention policy, and key inventory.

## Acceptance validation
- Confirm via Cloudflare Firewall Analytics that requests blocked by the `/sessions` rate-limit rule show `action=block` and corresponding requests are absent from origin logs, proving the WAF drop prevents extra origin load.
- Capture screenshots and export JSON evidence from both Cloudflare UI and the `GET /accounts/{account_id}/r2/buckets/{bucket}/lock` API response showing the 90-day retention policy on the relevant bucket or `safe/` prefix.
