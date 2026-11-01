# Public sign-in page

The public story preserves the navy/blue palette and command-core illustration. Its demonstrations are examples, not server data. `noindex,nofollow,noarchive` remains intentional.

Sign-in copy is grounded in the backend's `src/web/dashboardAuth.js`: OAuth requests only `identify`; the account ID and username identify the session. Eligible servers have DexzuBot installed, and the signed-in member must currently own the server or have Discord Administrator permission. Each public server request checks access again. Sessions expire after 30 days; browser storage can be cleared or the session ended sooner. No bot installation or extra server permissions are requested by sign-in.

## Asset loading

Only the Pages build changes its loading boundary. Public styles (`cinematic.css`, `pages-signin.css`), story code, configuration and authentication transport load immediately. The font preload, dashboard styles and dashboard scripts live in inert templates until the transport verifies a restored or exchanged session. Styles preserve their original cascade; classic scripts load sequentially in their original order. The shared cinematic stylesheet is reinserted at its original dashboard cascade position. No framework, bundler or dependency was added.

The document still contains the authenticated HTML. Splitting that markup or separating the shared cinematic stylesheet would expand this work into a larger restructuring; this change defers its executable/style payload without altering the private/source hosting path. Loading failures keep the dashboard hidden and give a refresh instruction. The favicon uses the existing regular DexzuBot avatar; the Pages build rewrites its base path.

## Local validation

- `npm run check` and `npm run build` validate source syntax, assets and versioned Pages references.
- `node scripts/check-public-signin.mjs` uses Playwright/Chrome from the environment. It checks 1440, 768, 390 and 320px, no overflow, all sample labels, feature controls, both sign-in buttons, shared busy/error states, selected text contrast, focus/touch targets, reduced motion, favicon response and deferred requests. It also simulates failed dashboard CSS/script loads. Captures are saved in ignored `.superpowers/public-signin/`.
- The backend's `scripts/check-dashboard-pages-ui.mjs`, with `DASHBOARD_PAGES_DIST` set to this build and its synthetic fixture running on port 13301, covers mocked PKCE exchange, scoped requests, restored sessions, deep links, server navigation, export, logout and expired sessions.

All session and API coverage here is synthetic. No real authorized Discord session, live server settings, screen reader session, deployment or publication was used for this review.
