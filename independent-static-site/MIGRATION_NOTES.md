# Migration Notes — Webflow Export → Independent Static Site

This document describes the conversion of the `ericklguevara.com` Webflow
export into `independent-static-site/`, a framework-free HTML/CSS/JS site
that can be uploaded directly into an Apache `public_html` directory. The
original exported project (in the repository root, one level up from this
directory) was left untouched — everything described here lives only in
`independent-static-site/`.

Reference used for fidelity checks: the live site at
`https://ericklguevara.com/`. **This sandboxed build environment's network
policy blocks outbound access to that domain** (confirmed via both a direct
proxy connection attempt and the web-fetch tool, both returned policy
denials), so no live-site screenshots could be taken or pixel-compared
during this pass. Every decision below was instead grounded in: (a) direct
reading of the exported HTML/CSS, and (b) the site's own compiled
interaction data, which was extracted from the minified `js/webflow.js`
bundle (see "Interaction fidelity" below) and gives exact, non-guessed
timing/easing/scale values for every animation. Local-server + Playwright
testing (no external network required) was used throughout to verify actual
rendered behavior rather than just reading CSS. **A manual pixel comparison
against the live site is still recommended before going live** — see
"Requires manual review" below.

## 1. Removed Webflow dependencies

- `js/webflow.js` (381 KB Webflow runtime bundle) — removed, replaced by
  `js/site.js` (see §2).
- jQuery 3.5.1, loaded from Webflow's CDN
  (`d3e54v103j8qbb.cloudfront.net`) — removed; nothing in the new code
  depends on it.
- Google WebFont Loader script
  (`ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js`) and its
  `WebFont.load(...)` call — replaced with a direct
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:...">`.
  This still loads the same Montserrat weights from Google Fonts (an
  intentionally-external, non-Webflow service — see §3), just without the
  extra loader script and its layout-shift-prone async class injection.
- `<html data-wf-page="..." data-wf-site="...">` → `<html lang="en">`.
- `<meta name="generator" content="Webflow">` and the
  `<!-- This site was created in Webflow -->` / `<!-- Last Published: ... -->`
  HTML comments — removed from every page.
- The dead Google Universal Analytics snippet
  (`gtag.js?id=UA-165292899-1`) — removed. **Universal Analytics stopped
  processing data in July 2023**; this script has been firing into the
  void on every page load for years. See "Requires manual review" if
  analytics should be reinstated with a live GA4 property.
- Inline `<body style="opacity:0">` — removed; page-load fade is now
  driven entirely by CSS, gated behind a `js` class (see §2/§4 for why
  this is safer than the original).
- Inline `style="width:0%"` on every `.divider` element — removed; the
  scroll-reveal starting state now lives in CSS, gated behind a
  JS-added class, so it never applies to no-JS visitors.
- A vestigial inline `style="-webkit-transform:translate3d(0,0,0)
  scale3d(1,1,1)...` (an identity/no-op transform baked into ~150 `<img>`
  tags by the Webflow editor) — removed. It had zero visual effect, but
  as an *inline* style it would have permanently overridden the new CSS
  `:hover` scale transform (see §2), so it had to go.
- `css/webflow.css` and `css/normalize.css` were **kept**, not removed.
  They are already fully local (no CDN dependency) and provide real,
  load-bearing base styles that the site's own stylesheet builds on top
  of — e.g. `.w-nav-link`'s padding, and the complete `.w-lightbox-*`
  gallery styling (backdrop, arrows, close button, all as embedded
  base64 SVGs, zero external assets). Removing these classes/files would
  have changed real spacing and broken the lightbox visuals, which
  conflicts with "preserve the current visual appearance." They are
  Webflow-*authored* files, but not Webflow *runtime dependencies* —
  nothing after this migration fetches them from Webflow or requires
  Webflow hosting to keep working.
- `id="w-node-..."` attributes were **kept**. These are not cosmetic —
  `ericklguevara.webflow.css` uses them as real CSS Grid selectors
  (`#w-node-...{ grid-area: 1 / 1 / 2 / 2; ... }`) to place the logo, nav
  menu, and hamburger button in the navbar's grid, including
  breakpoint-specific overrides. Removing them would break the navbar
  layout.
- `data-collapse="medium"` (and sibling `data-animation`/`data-duration`/
  `data-easing`/`data-easing2` attributes) on `.main__navbar` were
  **kept**. `data-collapse="medium"` is read by a plain CSS attribute
  selector in `webflow.css` (`.w-nav[data-collapse='medium'] .w-nav-menu
  { display: none }` at ≤991px) — it is not JS-driven, so removing it
  would need an equivalent CSS rule anyway. Left in place with zero risk.
  The others are inert without `webflow.js` but harmless.
- `data-w-id` attributes were **kept** (harmless, and useful as a map
  back to the original Webflow interaction each element belonged to, see
  §7 of the prior audit).

## 2. Replaced interactions

All timing/easing/scale values below are exact, not estimated — they were
extracted from the real `IX2_RAW_DATA` object compiled into
`js/webflow.js` (module `Webflow.require("ix2").init({...})`), which was
isolated and parsed as JSON. This gave a complete, authoritative list of
every interaction actually defined for this site (11 action lists, 308
event bindings), which is far more reliable than guessing from computed
styles.

| Interaction | Old mechanism | New mechanism | Notes |
|---|---|---|---|
| Page-load fade-in | `webflow.js` "PageStart" (body opacity 0→1, 800ms) | Pure CSS transition (`css/site.css`), gated behind a `.js` class added synchronously in `<head>` | No-JS visitors never get the `js` class, so they see the page at full opacity immediately — **more robust than the original**, which would leave the page permanently blank (`opacity:0`) if `webflow.js` ever failed to load. |
| Mobile nav open/close | `webflow.js` nav controller (`data-duration="400"`, `data-easing="ease-in-out"`) | Vanilla JS toggles a `.w--open` class; CSS `max-height` transition (400ms ease-in-out) does the animation | See "Bug found and fixed" below — the inherited `position:absolute` positioning from the exported CSS didn't resolve correctly outside Webflow's runtime and needed a CSS Grid–based fix. |
| Divider scroll-reveal | IX2 "Divider into view": width 0%→100%, 750ms, `ease-in`, triggered on scroll-into-view | `IntersectionObserver` (`js/site.js`) adds `.is-visible`; CSS transition `width .75s cubic-bezier(0.42,0,1,1)` (= CSS `ease-in`) | Verified via Playwright: reveals correctly and progressively as the page is scrolled. Default (no-JS) state is the original CSS `width:100%` — fully visible, not stuck at 0%. |
| Project card / case-study block reveal | IX2 "Project(/Data) Scrolls into View": children of `.portfolio__container.project__inportfolio` / `.main__container.project__data` fade in + unblur (opacity 0→1, blur 15px→0, ~500ms) as the block scrolls into view (continuous scroll-linked in the original) | `IntersectionObserver`-triggered CSS transition, same opacity/blur end points, `cubic-bezier(0.12,0,0.39,0)` (≈ IX2's `inSine`) | The original used Webflow's continuous "scroll progress" IX2 type (value driven continuously by scroll position, not a simple on/off trigger). A threshold-based reveal-once approximation was used instead — visually very close for a reveal-and-stay-visible effect, but not pixel-identical to a continuously scroll-scrubbed animation. Flagged for manual review. |
| Project card image hover (`.project__mainpic`) | IX2 "ProjectHoverIn/Out": scale 1 → 1.05, 200ms `easeInOut` | Pure CSS `:hover` + `transition: transform .2s ease-in-out` | No JS needed at all — this was a discovery, not a design choice: MOUSE_OVER/MOUSE_OUT IX2 triggers map directly to `:hover`. |
| Case-study gallery image hover (`.project__secondarypic`) | IX2 "PicHoverIn/Out": scale 1 → 1.03, 200ms `easeInOut` | Pure CSS `:hover` + `transition: transform .2s ease-in-out` | Same as above. |
| Image lightbox galleries (case-study pages) | `webflow.js` lightbox controller reading `<script class="w-json">` blocks | Custom vanilla-JS lightbox (`js/site.js`) that parses the same existing `w-json` blocks and builds the same `.w-lightbox-backdrop/-container/-content/-view/-frame/-figure` DOM structure Webflow's runtime builds, reusing `webflow.css`'s existing lightbox CSS (including its embedded base64 arrow/close icons) unchanged | Supports the same shared "group" navigation (prev/next arrows cycle through all images in a `w-json` `"group"` on the page), keyboard (Esc/←/→), and click-outside-to-close. |
| Custom cursor ("Cursor Grow/Shrink/Move", IX2 action lists `a-2`/`a-3`/`a-4`) | — | **Not reproduced** | Found in the interaction data (targets a `.cursor-dot` element with mouse-follow + click grow/shrink), but `.cursor-dot` does not exist anywhere in the current HTML or in current CSS usage beyond a single leftover rule in `ericklguevara.webflow.css`. Confirmed via search across every page: no element with this class exists. This is vestigial IX2 configuration from an earlier design iteration; there is nothing in the current markup for it to attach to. |

### Bug found and fixed: mobile nav positioning

While verifying the mobile nav locally, the exported CSS's
`.navbar__menu { position: absolute; inset: 100% 0% 0%; }` (at ≤991px)
did not position the opened menu below the header as expected — it
rendered at the top of the viewport, overlapping the logo and hamburger
button. Root cause: `.navbar__menu` is also a CSS Grid item with its own
`grid-area` (set via `#w-node-...` ID selectors), and an absolutely
positioned grid item's containing block becomes its grid cell rather than
the whole navbar, breaking `top: 100%`'s percentage resolution. This
positioning was designed to be resolved by Webflow's own runtime toggling
`[data-nav-menu-open]` (a different, generic selector) rather than by the
static CSS alone.

Fixed in `css/site.css` by overriding the menu to a real second CSS Grid
row (`position: static; grid-column: 1 / -1; grid-row: 2;`) instead of
relying on the absolute/inset positioning, with `!important` where needed
to beat the ID-selector specificity from `ericklguevara.webflow.css`. This
was verified with Playwright screenshots before and after — the menu now
renders correctly below the sticky header on mobile/tablet widths, as a
full-width stacked list of large nav links, matching the typography
already defined for that breakpoint (64–80px link text).

## 3. External dependencies that remain

These are intentionally **not** localized, per the instruction to leave
genuinely external, non-Webflow services alone:

- **Google Fonts** (`fonts.googleapis.com` / `fonts.gstatic.com`,
  Montserrat) — still loaded live from Google's CDN via a standard
  `<link>`. This is a stable, long-term public service (not a
  Webflow/temporary host), and self-hosting would mean redistributing
  Google's font files, which wasn't judged worth the added complexity for
  this pass. Flagged in "Requires manual review" as an option if full
  independence from Google is wanted later.
- **Spline 3D embeds** (`my.spline.design`, on `index.html`,
  `contact.html`, `coming-soon.html`) — plain `<iframe>` embeds, left
  untouched. These will keep working as long as the linked Spline
  projects stay published; they have no dependency on Webflow.
- **No analytics currently loaded** (the dead UA snippet was removed —
  see §1). No tracking pixels, Meta Pixel, or third-party widgets were
  found anywhere in the export to begin with.
- **No WhatsApp integration exists in this project.** Contact is a
  plain `mailto:erickleonelguevara@gmail.com` link on `contact.html`.
  (The task brief anticipated WhatsApp/third-party contact tooling might
  be present; it is not, so there was nothing to preserve or migrate on
  that front.)
- External project links (`walmart.com.mx`, `dowjones.com`, app store /
  Google Play links, other client sites) — left as-is, genuinely external
  by design.

## 4. Localized assets

- **Open Graph / Twitter share image**: was
  `https://uploads-ssl.webflow.com/.../EG_OpenGraph.png` on every page's
  `<meta property="og:image">` / `<meta name="twitter:image">` — now
  points at the already-present local `images/EG_OpenGraph.png` (the file
  existed in `/images` but the meta tags weren't referencing it).
- **Case-study lightbox gallery images** on `cashi.html`, `walmart.html`,
  `wizeline.html`: the `w-json` config blocks' `"url"` fields pointed at
  `cdn.prod.website-files.com/...`; all 24 such references (across the 3
  pages) were repointed to the equivalent already-present local file
  under `images/` (every referenced filename already existed locally —
  no image downloads were actually needed, just repointing broken/
  external references to assets that were already shipped in the
  export).
- **Favicon / apple-touch-icon** (`images/favicon.png`,
  `images/webclip.png`): already local in the original export; verified
  present and referenced correctly on every page, no change needed.
- Fonts (`fonts/*.ttf`), all other images, `css/webflow.css`,
  `css/normalize.css`: already fully local in the original export.

## 5. SEO

- Added `<link rel="canonical" href="https://ericklguevara.com/<page>.html">`
  to every page (none existed before).
- Added `lang="en"` to every `<html>` tag (missing before).
- Added descriptive `alt` text to images that previously had `alt=""`
  (184 of 184 images had empty alt attributes before this pass):
  - Logo → "Erick Guevara logo", hamburger icon → "Menu", app store
    badges → "Download on the App Store" / "Get it on Google Play".
  - Each project card's main image → derived from that card's own
    heading text (e.g. "Wizeline project screenshot", "Stock that Rocks
    project screenshot") — read directly from the adjacent `<h1>` in the
    same markup, not invented.
  - Each case-study page's secondary/gallery images → a page-scoped
    generic description (e.g. "Dow Jones Professional project detail
    screenshot"). Per-image captions for these would need manual
    authorship — see "Requires manual review."
- **Not changed**: heading hierarchy (`index.html` has 20 `<h1>`s,
  `projects.html` has 18, and there are zero `<h3>`–`<h6>` site-wide).
  This was flagged in the prior audit as a real semantic/accessibility
  issue, but restructuring heading levels touches a large number of
  elements across every page and needs visual QA per page to confirm it
  doesn't shift any CSS that happens to target tag selectors — judged too
  invasive for this fidelity-focused pass. See "Requires manual review."
- **Not changed**: meta descriptions (identical boilerplate text
  across every page) — content changes were out of scope for this pass.
- `robots.txt` and `sitemap.xml` created (neither existed before).
  The sitemap includes the 19 real content pages; `demomaps.html` (an
  empty stub with no body content — verified by inspection) and
  `coming-soon.html` (an unlinked placeholder splash page) were
  deliberately left out of the sitemap since indexing empty/placeholder
  pages is a negative SEO signal. Neither file was deleted or modified —
  they still exist and are still reachable by direct URL.
- `404.html` created, using the site's real nav/footer chrome and
  existing CSS classes (no new styles introduced), with
  `<meta name="robots" content="noindex">`.

## 6. Files that must be reviewed manually

- **Mobile nav layout at ≤991px, live-site pixel comparison.** The fix
  described in §2 was verified to render correctly (menu appears in the
  right place, correct stacking, correct large typography) via local
  Playwright screenshots, but could not be pixel-compared against
  `https://ericklguevara.com/` from this environment (network policy
  blocks that domain — see the top of this document). Please compare the
  open/close animation and exact spacing on a real device against the
  live site.
- **Project/case-study block scroll-reveal** (§2): approximated a
  continuous scroll-linked IX2 animation with a threshold-based
  IntersectionObserver reveal. Visually similar for a "fade in once and
  stay visible" effect, but not a scroll-scrubbed animation. Compare
  against the live site's scroll feel and adjust the `rootMargin`/timing
  in `js/site.js` (`initBlockReveal`) if it feels off.
- **Pre-existing content bug, not introduced by this migration**: on
  `index.html` and `projects.html`, the "Wizeline" and "Walmart" project
  cards both link to `href="cashi.html"` instead of `wizeline.html` /
  `walmart.html`. `walmart.html` and `wizeline.html` are consequently
  unreachable from site navigation (confirmed identical in both the
  original export and this migrated copy — carried over faithfully, not
  fixed, since content/link changes were out of scope for this pass).
- **Case-study page image alt text** (§5): the generic per-page
  "detail screenshot" alt text on gallery/secondary images is a
  reasonable default but not a substitute for real per-image captions —
  worth revisiting if accessibility/SEO quality on these images matters.
- **Heading hierarchy** (§5): left unchanged, flagged for a future,
  more careful pass with per-page visual QA.
- **Google Fonts**: still loaded live from Google. If full independence
  from all third-party hosts (including Google) is wanted, self-host the
  Montserrat `.woff2` files under `fonts/` and add matching `@font-face`
  rules to `css/site.css` — the license (SIL Open Font License) permits
  this.
- **Analytics**: none is currently active (the dead UA property was
  removed). If analytics is wanted going forward, add a live GA4
  measurement ID, or another privacy-respecting analytics service of
  choice.

## 7. Deployment requirements

- Pure static files — no build step, no `npm`/Node, no server-side
  processing. Copy the entire contents of `independent-static-site/`
  into the host's `public_html` (or equivalent) directory.
- Requires Apache with `mod_rewrite` enabled for the HTTPS/non-www
  redirects in `.htaccess` (gracefully degrades — wrapped in
  `<IfModule mod_rewrite.c>` — if the module isn't available, those
  specific redirects just won't run, but the site otherwise works fine).
- `.htaccess` assumes the production domain is `ericklguevara.com`
  (used consistently and repeatedly throughout the existing site content
  — privacy policy, terms, contact `mailto` subject line, the
  `coming-soon.html` logo link — so this was already the project's
  clearly-established domain, not an assumption introduced here) and
  redirects `www.ericklguevara.com` → `ericklguevara.com`. Update the
  `RewriteCond`/canonical URLs throughout if that's not correct.
- No database, no PHP, no environment variables, no secrets.
- Total size is dominated by `/images` (~216 MB, mostly Webflow's
  auto-generated responsive variants of each source image) — confirm
  this fits the target host's storage quota before uploading.

## 8. Known limitations

- **No live-site access from this build environment.** All fidelity
  work was based on direct source analysis (including extracting the
  real, compiled IX2 interaction data — not guesswork) plus local
  rendering/testing, not a live pixel diff. A manual side-by-side check
  against `https://ericklguevara.com/` is recommended before replacing
  the live site.
- The project/data block reveal animation is an approximation of a
  continuous scroll-linked effect (see §6).
- Google Fonts remains an external dependency by design (see §3/§6).
- The pre-existing Wizeline/Walmart mislink and the orphaned
  `coming-soon.html`/`demomaps.html`/`playground.html` pages were
  preserved as-is, not fixed — these are content/IA decisions for the
  site owner, not migration defects.
- `Options -Indexes` and the `.md` file block in `.htaccess` assume a
  standard Apache 2.4 shared-hosting environment (`Require all denied`
  syntax); very old Apache 2.2 hosts would need
  `Order deny,allow` / `Deny from all` instead.

## 9. Pages and breakpoints tested

All 21 pages were run through the batch transform and spot-checked for
clean output (no leftover Webflow references, valid HTML structure). The
following were additionally verified by rendering in a real (local,
offline) Chromium browser via Playwright, at desktop (1440px), tablet
(810px), and mobile (390px) widths:

- `index.html` — page-load fade, divider scroll-reveal (progressive,
  step-scrolled), project card hover scale, mobile nav open/close,
  no-JS fallback (verified body stays fully visible and dividers stay at
  full width with JavaScript disabled).
- `about.html`, `projects.html`, `contact.html`, `privacy-policy.html`,
  `404.html` — load and nav check at all three breakpoints.
- `cashi.html` — lightbox open (click), image display, keyboard close
  (Escape), at desktop width.
- `dowjones.html` — alt-text spot check on case-study gallery images.

Not exhaustively re-tested at every breakpoint: the remaining 12
case-study pages (`assetmark.html`, `callgurus.html`,
`carolinarcuellar.html`, `dowjones.html`, `escuelafalcon.html`,
`gaia.html`, `kalopsic.html`, `makeupmx.html`, `str.html`,
`walmart.html`, `wizeline.html`, `playground.html`) and the two
orphaned/placeholder pages (`coming-soon.html`, `demomaps.html`) — these
share the same nav/lightbox/reveal code paths already verified above, but
were only checked for clean HTML output, not individually
screenshot-tested. Recommended before going live.
