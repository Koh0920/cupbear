# Network Isolation Spec v0.1
Principle: control plane never fetches URLs; all fetch in ephemeral VM.

Outbound policy (viewer):
- Allow: tcp 80/443 to public IPs only
- Deny (DROP): RFC1918 (10/8, 172.16/12, 192.168/16), 127/8, 0/8, 100.64/10, 169.254/16, 198.18.0.0/15, 224.0.0.0/4, 240.0.0.0/4,
  link-local fe80::/10, unique-local fc00::/7, loopback ::1, AWS IMDSv2 IPv6 fd00:ec2::254/128
  Metadata endpoints (DNS+IP): metadata.google.internal, metadata.azure.com, 169.254.169.254

DNS:
- Resolve A/AAAA; prefer IPv4-only in v0
- Re-resolve immediately before connect; IP must match precheck (anti DNS rebinding)
- Block literal IPs in private ranges
 - Verify TLS SAN matches requested host (SNI/hostname verification enforced)

Fetch gate:
- Max size 25MB (Content-Length + streaming cap)
- libmagic re-check; mismatch → reject
- Timeouts: connect 1s, read 15s
 - Set X-Content-Type-Options: nosniff; do not rely on browser sniffing
