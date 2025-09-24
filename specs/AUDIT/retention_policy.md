# Audit Retention & WORM Policy v0.1
- Storage: Cloudflare R2 Bucket Locks (retention period + legal hold)
- Retention: 90 days (demo), extendable per inquiry
- Write path: append-only; delete/overwrite disallowed by platform policy
- Access: read-only role for visualization; write-only service role for audit-svc
- Break-glass: security lead + founder dual control; all actions logged
- Availability: separate metrics/logs store (non-WORM) for ops; audit truth = locked R2 bucket
