# DexzuBot Dashboard Redesign Implementation Plan

> Execute inline with superpowers:executing-plans. Preserve all existing API contracts.

**Goal:** Translate the generated overview, greetings, and mobile references into the existing dashboard.

**Architecture:** Keep the buildless frontend and existing feature scripts. Replace the standard layout/theme layer with one coherent neutral design, adjust markup around existing controls, and strengthen keyboard behavior in the existing workspace script. The bot receives the frontend exclusively through the committed source importer.

**Tech stack:** HTML, CSS, browser JavaScript, Node 22+, existing Playwright regressions.

**Spec:** `docs/superpowers/specs/2026-11-01-dashboard-redesign-design.md`

## Constraints
- Preserve element IDs, API paths, server context, access checks, and unsaved-change safeguards.
- Regular DexzuBot artwork; Beta artwork remains scoped.
- No new framework, runtime library, API, credential, or hosting change.
- Local Inter font, semantic controls, visible focus, 44px mobile targets, reduced-motion behavior.

## Review focus
- Long server names and 320px screens must wrap without page overflow.
- Navigation must trap focus while open and return it on Escape.
- Hidden feature destinations stay hidden in navigation and search.
- Saves and dirty-state warnings retain their original behavior.
- Production Pages assets must load under the deployed base path and existing CSP.

## Tasks
- [x] Record baseline, generate and analyze three readable design references.
- [x] Implement compact overview, consistent shell, and two-row greeting editor; validate frontend syntax and assets.
- [x] Apply neutral surfaces, typography, and controls across remaining settings; verify every route and responsive layout.
- [x] Run inspection at three widths, correct observed issues, review all screenshots, and record critique.
- [ ] Run production build, synthetic browser/auth checks, commit frontend, and import the committed snapshot.
- [ ] Verify deployment requirements, push/release the approved existing dashboard, check runtime health, and post Beta release note.
