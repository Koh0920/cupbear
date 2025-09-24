# Guacamole on Fly.io (PR-3)

## Overview
- Deploy Apache Guacamole 1.5.x web tier (`guacamole/guacamole`) and `guacd` daemon on Fly.io Machines within the existing 6PN private network.
- Enable the JSON authentication extension with signed tokens (HMAC-SHA256) and AES-128-CBC payload encryption. Tokens are minted by CupBear backend and are valid for ≤120 seconds, single use.
- Enforce minimum surface: disable file transfer UI, bidirectional clipboard, printing, audio, and drive/SFTP redirection for demo viewers.
- Keep behaviour consistent with reverse-proxy limits introduced in PR-2 (WS upgrade size/timeouts). WebSocket stays on Fly L4, proxied by demo ingress.

## Components
| Component | Fly App | Image | Ports | Notes |
|-----------|---------|-------|-------|-------|
| `guacd` | `cupbear-guacd` | `guacamole/guacd:1.5.5` | 4822/TCP | No public services. Only 6PN internal. Health check on `/` TCP connect. |
| Web UI | `cupbear-guac-web` | custom (extends `guacamole/guacamole:1.5.5`) | 8080/TCP (HTTP) | Public app fronted by demo CDN/reverse proxy. Static GUACAMOLE_HOME baked with JSON auth extension + policies. |

Both apps attach to the same Fly organization 6PN network. `cupbear-guac-web` reaches `guacd` using the internal hostname `cupbear-guacd.internal`.

## Machine specs
- `cpu_kind = "shared"`, `cpus = 1`, `memory_mb = 512` for both tiers (load < 25 concurrent demo sessions).
- Auto-stop disabled; keep warm for <1s handshake. Configure machine count = 2 per tier (active/passive) in `fly scale count 2` with `--region nrt` primary, `--ha` for backup.
- Use `[[services.concurrency]]` on web tier: `hard_limit = 50`, `soft_limit = 25`, `type = "connections"`.

## fly.toml snippets
### `cupbear-guacd/fly.toml`
```toml
app = "cupbear-guacd"
primary_region = "nrt"
kill_signal = "SIGINT"
kill_timeout = 5

[build]
  image = "guacamole/guacd:1.5.5"

[mounts]
  source = "guacd-data"
  destination = "/var/lib/guacd"

[checks.guacd]
  type = "tcp"
  port = 4822
  grace_period = "10s"
  interval = "15s"
  timeout = "2s"

[[vm]]
  size = "shared-cpu-1x"
  memory = 512
```

### `cupbear-guac-web/fly.toml`
```toml
app = "cupbear-guac-web"
primary_region = "nrt"
kill_signal = "SIGTERM"
kill_timeout = 10

[build]
  dockerfile = "Dockerfile"

[env]
  GUACD_HOSTNAME = "cupbear-guacd.internal"
  GUACD_PORT = "4822"
  GUACAMOLE_HOME = "/etc/guacamole"
  GUACAMOLE_LOG_LEVEL = "info"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  autostart = true
  auto_stop_machines = false
  min_machines_running = 1

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.concurrency]]
    type = "connections"
    soft_limit = 25
    hard_limit = 50

[[vm]]
  size = "shared-cpu-1x"
  memory = 512
```

## Custom web image
`cupbear-guac-web/Dockerfile`:
```dockerfile
FROM guacamole/guacamole:1.5.5

# Install JSON auth extension jar + configuration
ARG GUAC_VERSION=1.5.5
RUN set -eux; \
    curl -fsSLo /tmp/guacamole-auth-json.tar.gz "https://apache.org/dyn/closer.lua?action=download&filename=guacamole/${GUAC_VERSION}/binary/guacamole-auth-json-${GUAC_VERSION}.tar.gz"; \
    tar -xzf /tmp/guacamole-auth-json.tar.gz -C /tmp; \
    cp /tmp/guacamole-auth-json-${GUAC_VERSION}/guacamole-auth-json-${GUAC_VERSION}.jar /opt/guacamole/extensions/; \
    rm -rf /tmp/guacamole-auth-json*

# Copy statically managed GUACAMOLE_HOME overlay
COPY guac-home/ /etc/guacamole/
```

`guac-home/` structure:
```
guac-home/
  guacamole.properties
  extensions/
    guacamole-auth-json/
      signing-key.json
      policy.json
```

### `guacamole.properties`
```properties
guacd-hostname: ${GUACD_HOSTNAME}
guacd-port: ${GUACD_PORT}
websocket-read-timeout: 15000
websocket-allow-guest: false
recording-enabled: false
file-transfer: disabled
```

`file-transfer: disabled` removes the UI elements. We also avoid enabling any drive/SFTP/clipboard parameters in tokens to prevent renegotiation.

### `signing-key.json`
```json
{
  "signing-key": "w4YvbHyxuxXeKaq0IxyJ2FduA0gvTtBfQkRePduC0CA=",
  "encryption-key": "1uxx9bKpQ7P0x76r49HBSg==",
  "iv-length": 16,
  "mode": "AES-128-CBC",
  "hash": "HMAC-SHA256"
}
```
- Regenerate 16-byte encryption and 32-byte signing keys per environment; keep them in 1Password and inject via Fly secrets (`fly secrets set GUAC_JSON_SIGNING_KEY=...`).
- During build, override `signing-key.json` via `envsubst` or runtime init script that reads secrets and writes file (init container or entrypoint script).

### `policy.json`
```json
{
  "provider": "cupbear-json",
  "accepted-claims": ["username", "connections"],
  "required-claims": ["username", "connections", "expires"],
  "single-use": true,
  "max-validity-seconds": 120
}
```

## Token format
Generate query parameter `token` as `signature:iv:ciphertext`, each encoded with Base64 URL-safe alphabet. Steps:
1. Serialize payload JSON (`UTF-8`). Example payload minted by API:
   ```json
   {
     "username": "viewer-01",
     "expires": 1732849200,
     "connections": [
       {
         "id": "viewer-rdp",
         "name": "Viewer",
         "protocol": "rdp",
         "attributes": {
           "max-connections": "1",
           "max-connections-per-user": "1"
         },
         "parameters": {
           "hostname": "10.0.0.15",
           "port": "3389",
           "username": "demo",
           "password": "${ONE_TIME_PASS}",
           "security": "nla",
           "ignore-cert": "true",
           "disable-copy": "true",
           "disable-paste": "true",
           "enable-audio": "false",
           "enable-drive": "false",
           "enable-printing": "false"
         }
       }
     ]
   }
   ```
2. Encrypt with AES-128-CBC using `encryption-key` and random 16-byte IV (PKCS7 padding).
3. Compute signature = `HMAC_SHA256(signing-key, iv || ciphertext)`.
4. Emit `token = base64url(signature) + ":" + base64url(iv) + ":" + base64url(ciphertext)`.

Include the token when embedding: `/guacamole/#/client/${token}` or via `?token=` parameter (depending on embedding approach).

## Token generator helper
Use the Node helper added in `specs/SRE/scripts/generate-guac-token.mjs` (see file for CLI usage). It reads secrets from `GUAC_JSON_SIGNING_KEY` and `GUAC_JSON_ENCRYPTION_KEY` env vars and prints valid/tampered tokens for testing.

Example usage:
```bash
node specs/SRE/scripts/generate-guac-token.mjs --hostname 10.0.0.15 --user viewer-01 --expires 120
```
Set `GUAC_JSON_SIGNING_KEY` (32-byte base64) and `GUAC_JSON_ENCRYPTION_KEY` (16-byte base64) in the environment before invoking the helper.

The script also prints a tampered token sample (modified ciphertext) that should be rejected with HTTP 403.

## Reverse proxy alignment
- Keep request size limits ≥ 64 KB for `/guacamole/api/tokens` and `/guacamole/api/session/data/*` to allow handshake JSON.
- WebSocket upgrade timeout 5 seconds; idle timeout 20 minutes. Align with PR-2 CDN settings.
- Ensure `X-Forwarded-*` headers preserved; Guacamole uses them for CSRF mitigation.

## Acceptance validation
1. **Signature tamper test**
   ```bash
   VALID=$(node specs/SRE/scripts/generate-guac-token.mjs --hostname 10.0.0.15 --user viewer-01 --expires 120 | jq -r '.valid')
   TAMPERED=$(node specs/SRE/scripts/generate-guac-token.mjs --hostname 10.0.0.15 --user viewer-01 --expires 120 | jq -r '.tampered')

   curl -i "https://demo.cupbear.example/guacamole/api/tokens?token=${VALID}" # → 200 + auth JSON
   curl -i "https://demo.cupbear.example/guacamole/api/tokens?token=${TAMPERED}" # → 403 (signature verification failed)
   ```
2. **UI inspection**
   - Sign in via embedded viewer; confirm file transfer, drive, clipboard, and audio icons are absent.
   - `guacd` logs show no negotiation for drive (`DRDYNVC`) or audio channels.

## Operations
- Metrics: scrape `/guacamole/api/tunnels/${UUID}` for session counts; emit to Prometheus via sidecar (future).
- Logging: send `/var/log/guacamole/guacd.log` to Vector sidecar; redact usernames.
- Backup: the only mutable state is the JSON signing key file; rotate keys via Fly secrets and restart machines sequentially.
- Incident response: if tampering detected (repeated 403), rotate signing/encryption keys, purge outstanding tokens, and recycle viewer machines.
