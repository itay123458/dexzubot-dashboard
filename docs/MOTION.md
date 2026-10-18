# Dashboard motion

The public introduction uses native scrolling, a short sticky feature section and
the existing Halloween palette. The three demonstrations and connection diagram
are illustrations, not live server data. Continue with Discord uses the existing
login flow. Signed-in visitors go straight to their dashboard.

`cinematic.js` coordinates the story and lazily imports `command-core.js` near the
viewport. The dependency-free WebGL scene caps device pixel ratio at 1.5 (1 on
mobile), draws around 30 frames per second, and pauses offscreen or in a hidden
tab. An SVG stays available while loading or when WebGL fails. Reduced motion
uses the static illustration and stacked demos; mobile and short windows also
stack demos. Without story JavaScript, all three demos remain visible.

The authenticated dashboard keeps its real data and existing controls. Summary
values count on first successful load only; refreshes update values directly.
Initial failures show an inline retry; saves show Saving, then Saved only after
success. Decorations never delay API requests, login, or input.

Server switching intentionally retains immutable document contexts, protecting
drafts and in-flight requests from crossing servers. Same-origin cross-document
View Transitions keep the sidebar and header visually stable in browsers that
support them. Other browsers use normal navigation. This is not an SPA context
switch, and no server data or credentials are copied between documents.

## Verification

Run `npm run check` and `npm run build`. With Playwright and Chrome available:

```powershell
$env:PLAYWRIGHT_MODULE = 'file:///absolute/path/to/playwright/index.mjs'
$env:CHROMIUM_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/check-cinematic.mjs
# Start the bot repository's synthetic scripts/fixtures/dashboard-server.mjs first:
node scripts/check-dashboard-feedback.mjs
```

The cinematic check mocks all browser traffic, including the OAuth handoff.
Feedback tests only read the loopback synthetic fixture and mock browser writes.
Run the bot repository's Pages sign-in, workspace, motion, role and authorization
regressions against the committed imported snapshot before release.

References: [Lusion](https://lusion.co/) was accessible for its connected 3D
storytelling direction. [GSAP Scroll](https://gsap.com/scroll/) returned a
verification page and [Awwwards scrolling](https://www.awwwards.com/inspiration_search/scrolling/)
timed out during this implementation. No reference assets or code were copied.
