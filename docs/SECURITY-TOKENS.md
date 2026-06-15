# Session tokens — production model

## Current model

Access tokens are kept in memory only by `src/api.ts` and expire quickly. Refresh tokens are stored in an HttpOnly, Secure, SameSite cookie and are stored server-side only as hashes in the `RefreshToken` table.

Legacy `localStorage` token keys (`axelmond_session_token`, `axelmond_refresh_token`) are actively purged by `src/api.ts` for migration safety.

## Risk

Any XSS vulnerability can still act as the current user while the page is open, but it should not be able to read the refresh token directly. CSRF protection is required on unsafe API methods because cookies are sent automatically by the browser.

## Mitigations in place

1. **Helmet + CSP** (`server.ts`)
   - Production: `'unsafe-eval'` and script `'unsafe-inline'` removed from `script-src`.
   - Per-request CSP nonce is available for controlled inline assets.
   - `connect-src` limited to `'self'`, LiveKit, UploadThing, and configured `APP_URL` / `ALLOWED_ORIGINS`.
   - HSTS enabled when `NODE_ENV=production` (requires HTTPS at the reverse proxy).

2. **Input sanitization** on most API bodies (`sanitizeInputText` + Zod).

3. **React** renders user text without `dangerouslySetInnerHTML` in critical paths.

## Operational checklist before go-live

- Set `NODE_ENV=production`.
- Serve the app over **HTTPS** only.
- Set strong `AUTH_TOKEN_SECRET`.
- Set a distinct strong `EMAIL_VERIFICATION_SECRET`.
- Set `MOBILE_CLIENT_SECRET` (32+ chars, distinct; shared with mobile `EXPO_PUBLIC_MOBILE_CLIENT_KEY`). Never use the legacy name `MOBILE_API_SECRET`.
- Use `PAYPAL_ENV=live` with live PayPal credentials and webhook ID.
- Review third-party scripts and avoid injecting untrusted HTML.
- Monitor `security-logger` for auth anomalies.

See also: `.env.example` for production variables.
