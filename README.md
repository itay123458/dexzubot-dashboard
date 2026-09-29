# DexzuBot dashboard

The independently maintained frontend for DexzuBot, with a Halloween theme for
all servers. The interface includes labeled navigation, server selection, live
status, command controls, safety settings, greetings, logging and operations.

## Hosting and security

The public website runs on [GitHub Pages](https://itay123458.github.io/dexzubot-dashboard/).
This public repository contains only the interface and local artwork. The private
DexzuBot backend on the Raspberry Pi handles Discord login, grants, server data
and bot controls. No bot token, OAuth secret or database belongs in this repository.

Sign-in uses a short-lived, single-use handoff protected by a verifier created in
the browser tab. The resulting session stays in tab storage and is sent only to
the configured Pi API. Cookies are not shared across the two sites. Existing
invitations, manager grants, current membership and Administrator checks remain
required. Public source does not grant access to server data.

Pushes to `main` validate and deploy `dist/` through the Pages workflow. The build
uses only `public/`; it rewrites the site base path and adds the public sign-in
screen. `scripts/build-pages.mjs` contains the public hosting addresses. The Pi
must set `DASHBOARD_PAGES_URL` to the exact site URL above; its existing Discord
OAuth callback remains on the Pi. No GitHub Actions secrets are needed.

Dashboard styling is released everywhere. Backend experiments and new YouTube
creator controls retain their independent Beta gates.

## Development

Requires Node.js 20.10 or newer. There are no frontend package dependencies.

```sh
npm run check
npm run build
```

Edit `public/`. Keep the current API contract and DOM IDs. For a working local
preview, use the bot repository's `scripts/fixtures/dashboard-server.mjs` with an
imported snapshot; it runs only synthetic data on loopback port 13301. Opening
`index.html` directly does not provide login or APIs.

## Release to the bot

Commit and push this repository. From a clean DexzuBot backend checkout:

```sh
node scripts/import-dashboard.mjs --source /path/to/dexzubot-dashboard
node scripts/import-dashboard.mjs --source /path/to/dexzubot-dashboard --apply
```

The first command previews the import. The second verifies the committed source
and copies `public/` into `src/web/public`, recording the repository, commit and
file hashes in `dashboard-source.json`. Run the bot's focused dashboard checks,
review the diff, commit and push the snapshot, then use its documented Pi
Docker deployment. Docker builds need no GitHub credentials or network checkout.
This deliberate release step keeps frontend and backend changes compatible.

## Design

Charcoal #15141b and #201e28 surfaces, pumpkin #ffab66 actions, violet #c3a0f0
accents, and #f5f0e9 text. Native system fonts, visible focus rings, 44px controls,
responsive navigation and reduced-motion support. All illustrations are local.
