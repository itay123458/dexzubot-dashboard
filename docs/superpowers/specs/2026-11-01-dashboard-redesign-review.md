# Dashboard redesign review

## Direction and evidence
True-black flat, seed **549170617**. One shell redraw: the no-sidebar deal could not hold the existing thirteen-plus destinations, so the labelled ruled T-frame was used. Existing regular DexzuBot artwork supplies the product identity; its blue hue is kept for status, focus, and message previews. The signature element is the live Discord message beside its greeting editor. The overview answers whether the selected server is connected and what can be configured next.

The three built-in generated references were analyzed before product code. They are local QA artifacts in `.taste-skill/references/`, with prompts retained by the image-generation session. No generated mockup is shipped as the interface. Existing bot artwork is reused; no stock photography, found pictures, clips, or sample business statistics were added. Inter is self-hosted; its SIL Open Font License and upstream attribution are in `docs/INTER-LICENSE.txt`.

## Visual checks
The buildless bot frontend was served against the isolated synthetic backend. The same public source is the production snapshot; the separate GitHub Pages transformation was checked through its actual built assets and authenticated browser regression.

Every fold and page sheet from the final overview, greetings, logging, and YouTube inspections at **1440, 768, and 390px** was opened and reviewed. Before captures are in `.taste-skill/before/`; final reports and images are in `after/`, `greetings-audit/`, `logging-audit/`, and `youtube-audit/`.

| Check | Before | Final |
| --- | --- | --- |
| Overview inspector | 6 FAIL, 4 WARN | 0 FAIL, 2 WARN |
| Greetings inspector | — | 0 FAIL, 0 WARN |
| Logging inspector | — | 0 FAIL, 1 WARN |
| YouTube inspector | — | 0 FAIL, 3 WARN |
| Actual overview font | Segoe UI fallback | Self-hosted Inter |
| Overview text under 11px | 66 blocks | 0 blocks |
| Mobile navigation | Floating button over content | Header button and keyboard-contained sheet |
| Final changed-source design lint | — | 0 FAIL |

The remaining warnings are deliberate and bounded:
- Overview's status panel plus Server details disclosure ends level with the activity panel; the inspector compares the status panel alone. The empty activity region retains its frame for incoming events.
- Logging's short channel-destination form is kept beside the full event list rather than stretched into a tall empty panel; both controls remain visible together.
- YouTube retains the complete configuration, subscriber-counter controls, and its existing help. Secondary history falls below the first fold. Empty upload and notification panels keep compact frames and different content lengths rather than invented uploads; tablet secondary panels stack so their status labels stay readable.
- Source lint also flags `box-shadow: none`, `backdrop-filter: none`, and the selector that hides old eyebrow labels. Those are resets, not rendered effects. The only real shadows belong to dialogs, toasts, and the floating save bar.

## App-screen critique
1. **Question and reading order:** The title, runtime, real counts, and Manage commands action lead. The members count is the largest figure. No chart or vanity growth is fabricated.
2. **Frame:** A 224px sidebar and equal 32px gutters close the desktop grid. Compact module rows replace nested cards. Existing long settings remain scrollable without page overflow.
3. **Color and identity:** Neutral surfaces distinguish levels. Regular DexzuBot artwork identifies the product; blue marks focus and the actual message preview. White primary actions and neutral navigation recede appropriately.
4. **Data consistency:** All eight existing counts and both status displays come from the existing API render path. No fixture number was copied into product markup. Repeated module totals use the same existing variables.
5. **States:** Honest zeros, missing-value dashes, existing loaders, errors, disabled settings, permissions, and dirty-form handling remain. The preview's ExampleUser is the existing member placeholder, not production member data.
6. **Legends and media:** No new chart or legend is needed. Existing artwork and previews have stable dimensions in changed markup; the actual greeting output is explained beside the controls.
7. **Phone:** Navigation is folded into the header, text remains readable, controls have touch-sized hit areas, fields and previews stack, and keyboard focus stays in the menu until it closes.

Subjective final scores: design **7.8**, usability **8.5**, creativity **7.2**, content **8.0**; weighted **7.9/10**. Remaining limitation: large legacy settings views still contain more material than one screen can hold. App-screen rules apply; marketing-image and motion quotas do not.

## Functional verification
- `npm run check` and `npm run build`: passed in the existing Node 22 Docker environment; built script/style content hashes verified.
- Backend dashboard browser regression: **13 destinations × 8 widths**, 320–2560px, passed without overflow or runtime errors.
- Mocked category toggles, greeting saves, leveling validation, search, Escape, and focus: passed.
- Added mobile/tablet checks: modal role, background isolation, forward/reverse Tab cycling, Close, Ctrl+K handoff, focus restoration: passed.
- Backend authentication, Pages OAuth/PKCE/session separation/CORS, and persisted-session checks: passed with explicit synthetic test environment.
- Production Pages browser regression: sign-in, desktop/mobile, scoped bearer requests, server switching, export, reload, shared-tab logout, expired sessions: passed.
- Independent review: no blocking or important findings; all existing element IDs retained with no duplicates; owner-only AI navigation stays hidden for ordinary users.

Web Interface Guidelines were fetched fresh from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` and applied to changed controls: semantic buttons, accessible names, focus, native labels, reduced motion, safe layout, font loading, image dimensions, and current dark-theme metadata.

The local backend Docker build passed. The existing dependency audit reports **5 vulnerabilities (4 high, 1 moderate)**; this visual release changes no dependency versions. Deployment, snapshot provenance, and Beta announcement are recorded by the bot repository's release workflow.
