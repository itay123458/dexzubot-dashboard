# DexzuBot motion system

The dashboard remains static HTML, CSS and plain JavaScript. Its existing Web
Animations API utilities and lazy WebGL command-core renderer own motion; no
animation framework, third-party runtime or new data service is added. The
Halloween palette, assets, element IDs, API paths and permission model are kept.

## Audit and fixes

- Route changes previously hid the outgoing section immediately and replaced
  browser history. Sections now finish a 120ms exit before committing, with a
  generation check so rapid navigation commits only the last destination.
  Push-state navigation and hash traversal support back, forward and direct links;
  ordinary anchors keep native behavior. Dirty-form cancellation still applies.
- Replaced card nodes could replay animation during data refresh. Stable motion
  keys suppress those refresh entrances; genuine route visits reset the sequence.
  Metrics and activity retain identity; level-role rows now retain keyed identity.
- Dialog closing had CSS and JavaScript animating the same properties. JavaScript
  now owns the dialog exit; the backdrop has a matching CSS fade. Toast removal
  waits for its actual exit animation, with list-position transitions for stacking.
- Entrance uses the independent CSS `translate` property; selected preview tilt
  owns `transform`. Form fields and dense data rows are never tilted. Details
  measure their real expanded height and keep content mounted through collapse.
- The existing scroll update returned early when the sign-in story was hidden.
  Shared and overview cores now receive page-scroll progress before that guard.
  Story-step buttons scroll to the selected stage, so scrolling in either direction
  and manual selection stay synchronized.

## Route coverage

| Destination | Motion |
| --- | --- |
| Sign-in / public story | Logo entrance, real rendered crown/core, native-scroll parallax, pinned three-feature story, image/chart reveals, static mobile/reduced-motion layout |
| Overview | Request-driven logo loader and matching metric skeletons, sequenced cards, real first-load counters, keyed activity movement, scroll-linked core |
| Safety | Masked heading, staggered filter/protection cards, stable switches and fields, focus and confirmed-save feedback |
| Greetings | Sequenced summaries/forms, preview depth, stable template inputs |
| Leveling | Sequenced XP/announcement/reward sections, keyed role rows with position transitions, stable numeric fields |
| Logging | Sequenced event groups, interruptible measured details expansion/collapse, selected-state feedback |
| YouTube | Hero/config/preview/card reveals, preview depth, real request loading and confirmed saves |
| Faith | Shared route/section choreography and control/error feedback; verse and delivery data unchanged |
| AI voice | Shared route/section choreography and session-control feedback; owner and voice privacy checks unchanged |
| Operations | Shared route/card choreography, role-preview dialog and backdrop transitions, list/status feedback |
| Counting | Module heading, status/progress and command-card sequence; stable search/filter and controls |
| Economy | Same module sequence, preview tilt and channel-setting feedback |
| Moderation | Same module sequence, command filter position transitions and selected controls |
| Tickets | Same module sequence and command controls |
| Server Stats | Same module sequence, progress updates and command controls |

## Timing, accessibility and lifecycle

Small feedback uses 180ms, panels 280ms, entrances 400ms, real counters 450ms,
with a 50ms stagger capped at 200ms. Navigation exits take 120ms. Loading reflects
requests rather than elapsed percentages; decorative graphics never gate controls.
Initial settings are inert only during the initial request, and retry is available
on failure. All content is visible by default without JavaScript motion.

Reduced motion removes nonessential motion and WebGL. Renderer resolution is
capped at 1x on phones and 1.5x otherwise, rendering pauses offscreen/hidden, and
contexts/listeners/frames are cleaned up on page exit. A static SVG remains when
WebGL or its lazy module fails. No scroll hijacking is used. Existing keyboard,
focus, Escape and server-access behavior is retained.

Native browser select menus and system confirmation dialogs keep their platform
behavior. The existing public-story chart is an explicitly labeled illustration;
no new live analytics or fabricated statistics are introduced.

## Checks

Run `npm run check`, `npm run build`, `node scripts/check-motion-system.mjs`,
`node scripts/check-cinematic.mjs` and `node scripts/check-dashboard-feedback.mjs`.
Browser checks require Playwright/Chrome and the backend's synthetic fixture on
loopback port 13301. They mock external traffic and do not authenticate, mutate a
real server or use a saved session. `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` select
the installed browser tooling. Screenshots go in ignored `.superpowers/` folders.
