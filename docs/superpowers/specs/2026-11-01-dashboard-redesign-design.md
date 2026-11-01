# DexzuBot dashboard redesign

## Intent
Make managing a Discord server feel direct and readable on a laptop and phone. Retain the existing buildless HTML/CSS/JavaScript frontend, authenticated transport, server ownership/Administrator checks, server selection, feature availability, element IDs, write paths, confirmation dialogs, and unsaved-change protection.

## Direction and alternatives
Use tasteskill's True-black flat direction, seed 549170617. The other dealt direction, Data terminal, suits continuous monitoring rather than everyday server configuration. A decorative marketing layout would push the controls below the first screen. Use a labelled sidebar because there are more than a dozen destinations; the original no-sidebar deal could only hold three to five. The shell was redrawn once to the ruled T-frame for this reason.

Neutral cool black ground, lightness steps for panels, sky-blue status marks, white primary actions, one locally hosted Inter face. No gradients, glows, card icons in tinted squares, marketing hero, or oversized heading. Existing regular DexzuBot artwork is the product's face.

## Product inventory and questions
- Scope is one selected Discord server, with Main, Beta, and other authorized servers.
- Members, channels, roles, and loaded commands are real API counts.
- Enabled modules, timed softbans, health alerts, and snapshots are real secondary counts.
- Bot connection, Discord latency, uptime, memory, and database state are independent signals.
- Command modules have an immediate toggle; settings use their existing save controls.
- Greetings produce a message; the editor and live preview belong together.
- Safety has channel exceptions and protected members.
- Logging has event groups and channel destinations.
- Operations has diagnostics, staff access, snapshots, and timed punishments.
- AI voice remains limited to approved bot owners with existing guild checks.
- New servers start unconfigured, with optional modules off.

Overview asks: Is this server connected, and what needs configuring? Greetings asks: What will members receive? Other settings views ask: What is enabled, where does it run, and how do I save it?

## Composition
224px labelled sidebar; 32px equal desktop gutters; 24px page title; compact runtime strip; first four counts in a divided strip and four smaller secondary counts. Activity and system state use a balanced two-column area. Command modules are rows with inline counts and toggles. Avoid fabricated charts or growth numbers.

Greeting settings use two horizontally arranged editing rows. Each has a section heading and explanation, labelled controls, and a live Discord-style message preview. Tablet reduces columns; phone stacks fields and preview. Navigation becomes a top-header menu at tablet and phone widths, with keyboard trapping and Escape close. Nothing floats over the page's controls.

Generated overview, greetings, and mobile references are the visual specification. Reference values are synthetic; production continues to render authenticated API data. Existing source IDs and settings semantics take precedence over incidental generated text or invented metrics.

## Validation and release
Capture before and after at 1440, 768, 390; inspect every screenshot and run app lint/inspection. Check all routes at 320–2560px, keyboard search, switches, saving, dirty navigation, loading/errors, Main/Beta/third-server context, and reduced motion. Run frontend check/build, backend dashboard browser/auth regressions with synthetic data, then import only the clean committed frontend release. Preserve hosting and access. Deploy only DexzuBot, verify health/readiness and other stacks, then publish the matching short release embed in Beta.
