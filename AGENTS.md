# DexzuBot dashboard

This private repository is the source of truth for the dashboard frontend in
`public/`. The authenticated website runs on the Raspberry Pi, not GitHub Pages.

- Product name: DexzuBot. Beta-badged artwork belongs in Beta only.
- Halloween dashboard styling is approved for all servers (2026-09-29).
- Preserve existing element IDs, same-origin API paths, server context, dirty-form
  safeguards and keyboard/reduced-motion behavior.
- Never add bot tokens, OAuth secrets, database credentials or server exports.
- Login, invitations, permissions and APIs belong to the private DexzuBot backend.
- Run `npm run check`, then run the backend repository's dashboard browser and auth
  regressions against a synthetic fixture before deploying an updated snapshot.
- Import a committed, clean release into the bot using `scripts/import-dashboard.mjs`.
  See README.md. Do not edit the bot's vendored snapshot independently.
