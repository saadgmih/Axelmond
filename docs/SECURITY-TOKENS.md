# Session tokens — short-term production mitigation

## Current model

Access and refresh tokens are stored in **`localStorage`** (`axelmond_session_token`, `axelmond_refresh_token`) via `src/api.ts` and `useAppSession`.

## Risk

Any XSS vulnerability in the SPA allows an attacker to read tokens and impersonate the user (including refresh rotation).

## Mitigations in place (Phase 4A P0)

1. **Helmet + CSP** (`server.ts`)
   - Production: `'unsafe-eval'` removed from `script-src`.
   - `connect-src` limited to `'self'`, LiveKit, UploadThing, and configured `APP_URL` / `ALLOWED_ORIGINS`.
   - HSTS enabled when `NODE_ENV=production` (requires HTTPS at the reverse proxy).

2. **Input sanitization** on most API bodies (`sanitizeInputText` + Zod).

3. **React** renders user text without `dangerouslySetInnerHTML` in critical paths.

## Not implemented yet (planned)

- Refresh token in **HttpOnly, Secure, SameSite** cookie.
- Access token in memory only (short TTL).
- CSP nonces for inline scripts (remove `'unsafe-inline'`).

## Operational checklist before go-live

- Set `NODE_ENV=production`.
- Serve the app over **HTTPS** only.
- Set strong `AUTH_TOKEN_SECRET`.
- Review third-party scripts and avoid injecting untrusted HTML.
- Monitor `security-logger` for auth anomalies.

See also: `.env.example` for production variables.
