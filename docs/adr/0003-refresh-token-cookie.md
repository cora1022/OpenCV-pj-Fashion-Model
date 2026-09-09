# ADR 0003: Refresh token cookie and rotation

## Decision

Keep access tokens in React memory and place refresh tokens in an environment-configured HttpOnly
cookie scoped to `/api/members`. Store only SHA-256 refresh-token hashes in MySQL. Rotate on login
refresh, revoke the previous row before issuing its replacement, and revoke plus expire the cookie
on logout.

## Rationale

An HttpOnly cookie prevents application JavaScript from reading the long-lived credential. The
path scope prevents it from being sent to the image service. Same-origin Caddy routing avoids a
cross-site token handoff, while `Secure` and `SameSite` remain explicit deployment settings.

Access-token refresh is coalesced in React so concurrent 401 responses do not rotate the same token
multiple times. Original requests are retried once to avoid loops. A scheduled Spring job removes
expired rows and old revoked rows after a short audit window.

## Consequences

The production deployment must use HTTPS and `REFRESH_COOKIE_SECURE=true`. If cross-site hosting is
introduced later, CSRF protection and the SameSite policy must be revisited before changing the
cookie to `None`.
