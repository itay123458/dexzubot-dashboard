# Generated reference analysis

Built-in image generation produced three standalone readable references before implementation. Originals remain in the generation directory; copies are retained in `.taste-skill/references/` for local visual QA.

## Overview
The 1536px reference gives the navigation roughly 18% of the width and the workspace the remainder. Translate this to a 224px fixed labelled sidebar and fluid content with 32px equal gutters. The 24px semibold title leads; body and navigation use 14px Inter, section titles 16px, captions 12px. Runtime is a single 72px horizontal strip with a 36px avatar and aligned 12px label/14px value pairs. Metric values are 24px, grouped in one divided surface rather than separate tiles. The main content is approximately 65/35, with aligned activity and status panels. Modules form a two-column list with unboxed outline icons, descriptions, counts, and trailing switches.

Ground appears near #0c0d0f, surfaces near #161719, controls near #222426. Whites are softened to #f3f4f5 and secondary text to #b4b4b4. Use flat colors rather than the generated raster's slight shading. Corners are consistently 6px; no resting shadows. Primary action is white with dark ink. Keep the existing eight API counts (the image invented enabled/voice/staff totals); keep database degradation visible when the fixture reports it. Do not fabricate the image's server ID, owner, region, or creation date. Preserve real status and performance rows.

## Greetings
The strongest structure is one editing row per message kind, with a concise section description left and a panel containing fields and the live preview right. A 16px heading and 14px explanation establish each row. Controls are 40px high with 8px label gap and 16px field spacing; preview is separated by space and one quiet rule, not additional containers. The preview's blue left edge is meaningful: it evokes the Discord message users are configuring. Keep the existing welcome/goodbye variables and existing live-render logic. The generated app tag and arbitrary timestamp are unnecessary and are omitted. Save stays at the view's bottom right and the existing dirty indicator remains authoritative.

## Mobile
Top header holds avatar, name, search, and Menu. Server selector is a full-width labelled field. Runtime stacks identity above three compact values. Primary counts become two columns. Secondary counts remain smaller. No floating menu or decorative hero. At 390px, reduce gutters to 16px and guarantee 44px targets. The generated title/action row is too wide for literal implementation, so the action wraps within its compact section. Navigation opens as a labelled sheet, supports Tab cycling and Escape, and restores focus. Settings stack title, fields, then preview. Data and labels remain readable and no field is removed.

## Consistency
Use the same avatar, Inter font, 6px corners, neutral surfaces, 16px gaps, white primary action, and restrained blue status/preview accents in all views. Motion stays in existing interactions and reduced-motion support; no ornamental entrance is necessary for a working app.
