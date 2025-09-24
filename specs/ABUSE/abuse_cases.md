# Abuse Cases v0.1
| ID | Case | Detection | Mitigation | Test ID |
|----|------|-----------|------------|---------|
| A1 | Bot signups | Turnstile score < threshold; server-side token verification required | Block, show retry | e2e_abuse_a1.spec.ts |
| A2 | 1 URL → 多重セッション | duplicate url hash within TTL | single-use token; deny >1; enforce Idempotency-Key | api_abuse_a2.spec.ts |
| A3 | Oversize/zip bomb | size > 25MB or expansion > cap | hard caps + reject | sec_zipbomb.spec.ts |
| A4 | SSRF to IMDS/private | dst in denied ranges | iptables DROP + precheck | sec_ssrf.spec.ts |
| A5 | Reuse expired signed URL | expired TTL | 403; no reissue; RateLimit headers present | api_abuse_a5.spec.ts |

Notes:
- All POST endpoints include Idempotency-Key; server must reject missing/duplicate keys.
- Apply bot score + (advanced) rate limiting at edge; surface `RateLimit-*` headers and `Retry-After` on 429.
