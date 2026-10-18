# Cinematic dashboard implementation plan

**Goal:** Add a connected Halloween command-core introduction and comfortable, truthful dashboard feedback.

**Architecture:** Keep the vanilla frontend and immutable per-document server context. Extend the existing motion lifecycle, use native scroll and sticky positioning, and lazy-load a dependency-free WebGL core with an SVG fallback. Pages sign-in retains its existing OAuth control and transport.

**Tech stack:** HTML, CSS, ES modules, WebGL, IntersectionObserver, Web Animations, Playwright.

**Spec:** User's attached dashboard motion brief (2026-10-18).

## Constraints

- Preserve Halloween colors, existing IDs, API paths, permissions, draft protection and login.
- No decorative loading delays; samples are labeled; live values come from the backend.
- Native scrolling, keyboard navigation, reduced motion, mobile and no-WebGL fallbacks.
- No dependencies or external scripts; public frontend owns the source; bot imports committed assets.

## Tasks

- [ ] Add focused browser checks for scroll reversal, sample demos, fallback, mobile and login.
- [ ] Create command-core module and static fallback; pause offscreen/hidden, limit resolution, clean up resources.
- [ ] Build cinematic Pages introduction, connected setup story and short sticky demo sequence, with native anchor links.
- [ ] Improve real dashboard loading/retry/save feedback; count real statistics once; keep routine refreshes stable.
- [ ] Animate the existing sidebar indicator and preserve shell visually across supported document transitions without sharing server state.
- [ ] Build and run browser/auth regressions; inspect desktop/mobile screenshots and correct issues.
- [ ] Commit frontend, import committed snapshot, add aligned Beta release note, validate/build and deploy only DexzuBot.
- [ ] Verify Pages, Pi health, PostgreSQL, untouched neighboring services, and publish the Beta embed.
