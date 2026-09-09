# Authentication flow

## Token ownership

Spring Boot is the only token issuer and the only service that can read the RSA private key. FastAPI
mounts the public key and verifies RS256 access tokens. Both services validate the same issuer and
audience. FastAPI additionally requires `type=access`, a numeric subject and a valid expiration.

The access token expires after 15 minutes by default and exists only in React module memory. It is
never written to localStorage or sessionStorage. The refresh token is hashed with SHA-256 before it
is stored in MySQL; its plaintext exists only in an HttpOnly cookie and during the matching Spring
request.

## Browser lifecycle

```text
login
  → Spring verifies BCrypt password
  → access token in JSON
  → refresh token in HttpOnly cookie
  → React stores access token in memory and requests /me

browser reload
  → POST /api/members/token/refresh with cookie
  → previous refresh row revoked, new cookie issued
  → React requests /api/members/me with the new access token

protected request returns 401
  → one shared refresh Promise is used by all waiting requests
  → each original request is retried at most once
  → refresh failure clears memory and returns the UI to login

logout
  → React calls Spring with bearer access token and refresh cookie
  → Spring revokes the matching DB row and expires the cookie
  → React clears its in-memory token
```

## Cookie configuration

`REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_PATH`, `REFRESH_COOKIE_SAME_SITE`,
`REFRESH_COOKIE_SECURE`, and `REFRESH_COOKIE_MAX_AGE_SECONDS` are environment-specific. Local HTTP
uses `Secure=false`; the deployment example requires `Secure=true`. The default path is
`/api/members`, so the browser does not send the cookie to FastAPI image routes.

## Error contract

Authentication failures use the common `{ "error": { "code", "message", "requestId" } }`
envelope. Missing, expired and invalid access credentials return 401; authenticated users without a
required role receive 403. Refresh failures distinguish invalid and expired tokens without exposing
JWT details.

## Brute-force protection boundary

The current single-Compose portfolio does not claim production-grade distributed rate limiting.
Adding an in-memory counter to Spring Boot would reset on restart and would become inconsistent as
soon as more than one instance runs. Before public Internet deployment, signup, login and refresh
must be protected at the edge with a shared rate-limit store or a managed gateway/WAF, keyed by both
client address and normalized account identifier. Login failures are intentionally returned with one
generic `INVALID_CREDENTIALS` response so the API does not disclose whether an email exists.
