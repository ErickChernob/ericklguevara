# Final QA Report — ericklguevara.com Independent Static Site

Production-readiness review of `independent-static-site/`, performed after
the initial Webflow-to-static migration. This report covers functional
testing, the Webflow dependency/CDN audit, accessibility, SEO, and
deployment-readiness checks, and documents the deliverable in
`public_html_ready/` / `public_html_ready.zip`.

**Environment note, carried over from `MIGRATION_NOTES.md`:** this review
was performed in a sandboxed build environment whose network policy
blocks outbound access to `ericklguevara.com` (confirmed via both a direct
proxy connection attempt and the web-fetch tool — both returned policy
denials) and to arbitrary third-party domains generally (Google Fonts,
Spline). All functional/structural testing below was done by serving the
site locally (`python3 -m http.server`) and driving it with a local,
offline headless Chromium via Playwright — this validates HTML/CSS/JS
correctness, internal links, asset resolution, and interactions
completely, but **could not pixel-compare against the live Webflow site**.
Anywhere a Google Fonts or Spline request appears in the results below as
"failed," that's this sandbox's network policy blocking the external
domain, not a defect in the site — see each relevant section for
confirmation that these are expected/harmless in this environment and
will succeed on live hosting with normal internet access.

---

## 1. Webflow JS runtime dependency removal — CONFIRMED COMPLETE

Searched every `.html`, `.css`, and `.js` file for: `webflow`,
`website-files`, `w-nav`, `w-slider`, `w-dropdown`, `w-tab`,
`Webflow.push`, `Webflow.require`, `webflow.js`.

- **`js/webflow.js` (the 381 KB Webflow runtime bundle) was still
  physically present in the project from the initial migration**, even
  though no page had referenced it since the interaction rewrite. Found
  during this review and **deleted** — confirmed via search that nothing
  in any HTML/CSS/JS file referenced it before removal.
- `Webflow.push` / `Webflow.require`: zero occurrences anywhere except
  inside that now-deleted dead file.
- `website-files.com`, `webflow.io`: zero occurrences anywhere (see §3
  for the dedicated CDN audit).
- `w-nav`, `w-nav-brand`, `w-nav-menu`, `w-nav-link`, `w-nav-button`:
  present in every page's HTML (22 files) and in `css/webflow.css`.
  **These are load-bearing CSS class names, not a JS runtime
  dependency** — `webflow.css` (already local, no CDN reference) uses
  them to supply real padding/positioning that the site's own CSS builds
  on top of; nothing reads or requires them via JavaScript. Verified by
  confirming `js/site.js` never references any `w-nav-*` selector — it
  targets `.menu-button` / `.navbar__menu` directly.
- `w-slider`, `w-dropdown`, `w-tab`: **zero usage in any page's markup**.
  These classes exist only inside `css/webflow.css`'s generic component
  library (unused CSS, shipped but inert) and, before deletion, inside
  the dead `webflow.js` bundle. No tabs, sliders, dropdowns, or
  accordions exist anywhere on this site.
- The two remaining plain-text mentions of "webflow" in `js/site.js` are
  documentation comments (crediting where the IX2 timing values were
  sourced from) — not functional references, not a dependency.

**Conclusion: the site has zero runtime or hosting dependency on
Webflow.** It runs entirely on local files plus the intentionally-kept
external services listed in §6.

## 2. w-node-*/data-w-id interaction attribute audit (step 4)

| Attribute | Total occurrences (HTML) | Unique values | Referenced by CSS? | Referenced by JS? | Disposition |
|---|---|---|---|---|---|
| `id="w-node-*"` | 97 | 40 | **Yes — 40/40** (100%), as literal `#w-node-...{grid-area:...}` selectors in `css/ericklguevara.webflow.css`, including breakpoint-specific overrides for the navbar layout | No | **Kept, all 40 unique IDs required.** These are not IX2 interaction identifiers in this project — they're Webflow's CSS Grid placement mechanism for the navbar (logo / nav menu / hamburger button placement, including at the 991px and 479px breakpoints). Removing any would break navbar layout. |
| `data-w-id="*"` | 190 | 59 | No — confirmed zero `[data-w-id]` selectors anywhere in `css/webflow.css` or `css/ericklguevara.webflow.css` | No — confirmed `js/site.js` never reads `data-w-id`; the rewritten interactions (nav toggle, divider reveal, block reveal, hover scale, lightbox) all target plain semantic classes (`.menu-button`, `.divider`, `.portfolio__container.project__inportfolio`, `.project__mainpic`, `a.w-lightbox`) instead | **Removed.** All 190 occurrences (59 unique values) were confirmed dead — no CSS rule and no script anywhere in the project reads them — before removal. Verified functionality (mobile nav open/close, lightbox open/close/keyboard nav) with Playwright immediately after removal on both the file that lost the most occurrences (`index.html`, 23) and a lightbox page (`cashi.html`); both worked identically to before. |

**Count summary: 287 total attribute instances found (97 `w-node-*` + 190
`data-w-id`) across 99 unique values (40 + 59). 40 unique IDs (all
`w-node-*`) are functional and were kept. 59 unique values (all
`data-w-id`) were dead and were removed — 0 functional `data-w-id`
attributes existed in this project.**

This project's actual IX2-derived interactions (mobile nav, divider
scroll-reveal, project/case-study block reveal, image hover-scale,
lightbox) were rewritten in `js/site.js` / `css/site.css` using semantic
class selectors rather than the original `data-w-id` bindings — see
`MIGRATION_NOTES.md` §2 for the full interaction-by-interaction mapping
and the exact IX2 timing/easing values each one is based on (extracted
directly from the original `webflow.js` bundle's compiled interaction
data before that file was deleted).

## 3. Webflow-hosted CDN asset delinking (step 5) — CONFIRMED COMPLETE

Searched every `.html`, `.css`, and `.js` file for absolute URLs
containing `website-files.com`, `webflow.io`, `uploads-ssl.webflow.com`,
`assets-global.website-files.com`, or `cdn.prod.website-files.com`,
specifically checking Open Graph tags, Twitter card tags, favicon/
apple-touch-icon links, CSS `url()` references, and `<img>`/`<video>`/
`<source>`/`srcset` attributes.

**Result: zero matches anywhere in the project.** This was already
substantially completed during the initial migration; this review
re-verified it from scratch and found nothing left to localize:

| What was checked | Result |
|---|---|
| `og:image` / `twitter:image` (all 22 pages) | `images/EG_OpenGraph.png` (local) |
| `og:url` | Added during this review (was previously absent on every page — not a Webflow reference, just missing metadata); now mirrors each page's own canonical URL |
| favicon (`rel="shortcut icon"`) | `images/favicon.png` (local) |
| apple-touch-icon | `images/webclip.png` (local) |
| CSS `url()` in all 4 stylesheets | Only local `../fonts/*.ttf` paths and embedded `data:` URIs (Webflow's icon font + the lightbox arrow/close SVGs, both self-contained base64, zero network requests) |
| `<img>`/`srcset` across all 22 pages | 100% local `images/...` paths |
| Lightbox `w-json` gallery data (`cashi.html`, `walmart.html`,
`wizeline.html`) | All 24 `"url"` fields point at local `images/...` files (repointed from `cdn.prod.website-files.com` during the original migration) |
| `js/site.js` | No Webflow-domain references |

**Full list of what was localized (from the original migration pass, this
review re-verified each is still correctly local):**
- `images/EG_OpenGraph.png` — Open Graph / Twitter share image, was
  `uploads-ssl.webflow.com/.../EG_OpenGraph.png`
- 6 lightbox images on `cashi.html` (CashiScreenTriple1/2/3,
  CashiScreenSingle1/2, CashiScreenDouble1), was
  `cdn.prod.website-files.com/...`
- 9 lightbox images each on `walmart.html` and `wizeline.html`
  (WalmartScreenTriple1/2, Lap1/2, WalmartScreenDouble1,
  WalmartScreenSingle1, Prototype, Testing, Iterations), was
  `cdn.prod.website-files.com/...`

No new asset downloads were needed for this review — every filename the
CDN URLs referenced already existed locally in `/images` (verified during
the original migration), so localization was purely a matter of
repointing the reference, already done and re-confirmed intact.

## 4. Bugs found and fixed during this review

Two real defects were caught by empirical testing (not just static code
reading) during this pass:

1. **Corrupted `<footer>` markup across 19 of 22 pages.** While adding a
   `<footer>` semantic landmark (previously a plain `<div
   class="footer__container">` on every page — see §5), an automated
   regex substitution incorrectly consumed the `.text-block` child div's
   own closing tag on every page except the 2 (`404.html`,
   `demomaps.html`) whose structure didn't match the regex's assumed
   pattern in the first place. Caught immediately via a div/footer
   tag-balance check across all pages, root-caused by inspecting the
   actual broken HTML, and fixed properly (verified: all 22 pages now
   have perfectly balanced `<div>`/`<footer>` tags, and the rendered
   footer was screenshot-verified to show the logo, copyright, and
   Terms/Privacy links correctly positioned).
2. **Horizontal overflow at several required viewport widths, found and
   fixed across five rounds of empirical testing.** A static-analysis
   pass over `ericklguevara.webflow.css` first flagged 19 rules with a
   fixed pixel `width` and no `max-width` fallback. Rather than fix all
   19 speculatively, each was verified empirically (Playwright, real
   rendering) before touching it, which surfaced four distinct, confirmed
   bugs — and, on the first attempted broad fix, one CSS syntax mistake
   this review introduced and then caught and corrected before it ever
   shipped:
   - **`.main__container` / `.portfolio__container` base rules**: fixed
     `width: 1200px`, no `max-width`. Webflow's own breakpoints only
     override this at `≤991px` (→ `width:100%`) and `≥1280px` (→ wider
     still) — leaving a **992px–1279px gap with no responsive handling at
     all**, so viewports in that range (including 1024px, a required test
     width) had content wider than the viewport. Confirmed on
     `index.html`/`about.html`/`projects.html`/`cashi.html` before fixing.
   - **`.main__container.home` / `.main__container.contact`**: the same
     `width: 1200px`-with-no-fallback pattern, declared separately from
     (and in addition to) the base rule above — missed on the first pass,
     caught because `contact.html` and `404.html` still overflowed at
     1024px after the first fix. Both use `.main__container.contact`.
   - **The `≥1280px` breakpoint's own widths** (`.main__container` →
     1400px, `.main__container.contact`/`.legal`/`.about__main`/`.home`
     and `.portfolio__container.project__inportfolio`(`.header`) → 1280px
     or 1400px, 8 declarations total): initially left alone as
     "intentional large-screen sizing," but a full 108-combination
     re-test proved this assumption wrong — **every case-study page
     overflowed by 60px at exactly 1280px**, one of the required test
     widths, because content built to be 1280–1400px wide doesn't
     actually fit inside a 1280px-wide *viewport* once you account for
     its own padding. Fixed the same way as the base rule.
   - **`.project__paragraph`, `.project__subtitle`, `.centered__container`
     on `playground.html`**: a `width:600px` paragraph/subtitle inside a
     `display:flex; flex-direction:column; align-items:flex-start`
     container with no explicit width of its own hit a classic flexbox
     sizing case — the container's shrink-to-fit sizing derives its width
     from its widest child's *preferred* (unwrapped) size, independent of
     that child's own `max-width`, so simply capping the child wasn't
     enough on its own. Fixed by adding `max-width: 100%` to all three
     rules so neither the container nor its text children can compute
     wider than their available space, however that width is arrived at.
   - **Fix mechanism throughout**: `width: Npx` → `width: 100%; max-width:
     Npx` (or `max-width: 100%` on rules that had no explicit width to
     begin with). This is visually identical at every width the original
     design intended to support (the max-width still caps it at exactly
     the original pixel value once the viewport is wide enough) and
     simply lets the element shrink instead of overflowing at any width
     narrower than that.
   - **Self-caught mistake**: the first automated attempt at applying this
     pattern to the 8 declarations in the `≥1280px` block used a regex
     (`width: (\d+)px;`) that also matched inside the `max-width:` text it
     was inserting, producing tripled `max-width` lines in
     `.main__container` and `.portfolio__container`. Caught immediately
     by a routine brace-balance/duplicate-line check before any testing
     was done against it, and rewritten cleanly.
   - Every fix was re-verified with a fresh empirical pass afterward — see
     §5 for the final, complete 132-combination result. The other ~13 of
     the original 19 statically-flagged rules (mostly `.legal__paragraph`,
     `.legal__block`, `.about__pic`, `.info__main__block` variants) did
     **not** reproduce any real overflow in testing across all 22 pages ×
     6 widths and were left unmodified.

## 5. Visual QA across viewports

Tested at all 6 required widths — **1440, 1280, 1024, 768, 480, 375px** —
across **all 22 pages** (132 total combinations), using a local headless
Chromium (Playwright) against the site served from disk. Each combination
was checked for horizontal overflow (`document.documentElement.scrollWidth`
vs `clientWidth`), which is the objective, automatable signal for "content
doesn't fit the viewport" — the exact failure mode of every bug found in
§4.

**Final result, after all fixes in §4: zero horizontal overflow across
every one of the 132 page/width combinations.** This was reached after
five full iterations (each fix was followed by a complete re-sweep, not
just a spot check on the specific page that failed) — three earlier passes
found 88px, 60px, 45px, 12px, and 10px overflows respectively on different
pages/widths as each round of fixes surfaced the next issue, until the
final pass came back completely clean.

Typography, font loading (Montserrat via Google Fonts, `font-display:
swap` already configured), font weights, line heights, text wrapping,
container widths/margins/padding, image `srcset`/responsive sizing,
borders, shadows, sticky nav, and footer layout were all visually
inspected via full-page screenshots at multiple widths on `index.html`,
`about.html`, `projects.html`, `cashi.html`, `404.html`, `playground.html`,
and `contact.html` in addition to the automated overflow sweep, and no
regressions in layout, spacing, or type were introduced by any of the CSS
changes in §4 (every fix was additive — a `max-width`, `min-width`, or
`flex-shrink` value added alongside the original `width` — never a
replacement of the original design's intended size once the viewport is
wide enough to fit it).

Hover states, focus states, and active states: covered in §7
(Accessibility). Animations, page-load transitions, and the mobile menu:
covered in `MIGRATION_NOTES.md` §2 (the interaction-by-interaction
mapping from the original migration) and re-verified functionally in §12
below. Background images, borders, and shadows are unchanged from the
original export — this review's CSS edits only ever touched `width`,
`max-width`, `min-width`, and `flex-shrink` on the specific rules listed
in §4.

## 6. External integrations that remain (step 6 of the original task)

All of these are genuinely external, non-Webflow services, intentionally
kept per the instruction to preserve valid third-party integrations:

- **Google Fonts** (`fonts.googleapis.com` / `fonts.gstatic.com`,
  Montserrat) — loaded via a standard `<link>`, present on all 22 pages.
- **Spline 3D embeds** (`my.spline.design`) — present on **16 of 22
  pages**. Not present on: `404.html`, `demomaps.html`, `playground.html`,
  `privacy-policy.html`, `projects.html`, `terms-and-conditions.html`.
  This is more widespread than `MIGRATION_NOTES.md` from the
  initial migration documented (it only called out 3 pages) — corrected
  here after a full re-scan. Present on: `about.html`, `assetmark.html`,
  `callgurus.html`, `carolinarcuellar.html`, `cashi.html`,
  `coming-soon.html`, `contact.html`, `dowjones.html`,
  `escuelafalcon.html`, `gaia.html`, `index.html`, `kalopsic.html`,
  `makeupmx.html`, `str.html`, `walmart.html`, `wizeline.html`.
- **External project links** (client sites, App Store/Google Play
  badges) — 43 unique external URLs total across the site, all
  legitimate outbound links (client project sites, app store listings),
  none Webflow-related.
- **No analytics currently active** — the original Google Universal
  Analytics snippet was dead (UA property type, deprecated since July
  2023) and was removed during the initial migration; no replacement was
  added since that's a content/tracking decision for the site owner.
- **No WhatsApp integration exists in this project** — contact is a
  single `mailto:erickleonelguevara@gmail.com` link on `contact.html`.
  No `tel:` links exist anywhere either.

## 7. Accessibility fixes applied in this review

- Added keyboard focus-visible styles (`:focus-visible` with a 2px
  outline) for every interactive element that previously had none —
  nav links, footer links, the CTA button, app-store badge links,
  case-study "visit site" links, the mobile-nav hamburger button, and
  the lightbox controls. (`webflow.css`'s stock component resets zero
  out `outline` on several of these with no replacement; this project's
  own `css/site.css` previously did the same for the lightbox controls
  specifically — both are now fixed.)
- Made the lightbox's Previous/Next/Close controls keyboard-operable:
  added `tabindex="0"` and Enter/Space key handling in `js/site.js` (they
  previously only responded to mouse clicks; Escape/Arrow-key shortcuts
  already worked globally while the lightbox was open, but the on-screen
  buttons themselves weren't reachable via Tab).
- Converted the page footer from `<div class="footer__container">` to a
  semantic `<footer class="footer__container">` on all 22 pages (no CSS
  or visual change — `footer` and `div` share the same default
  `display:block`).
- `aria-expanded` on the mobile nav toggle button (already implemented in
  the initial migration) — re-verified still correct.
- `lang="en"` on every page (already present from the initial migration)
  — re-verified.
- Alt text on all 187 `<img>` tags (already 100% coverage from the
  initial migration, zero empty `alt=""` remaining) — re-verified after
  every subsequent edit in this review.

**Not changed (documented, not fixed, per the same reasoning as the
initial migration):** heading hierarchy. Site-wide there are 60 `<h1>`
elements and only 15 `<h2>`s, zero `<h3>`–`<h6>` — `index.html` alone has
20 `<h1>`s (each project card title uses `<h1>` for consistent visual
sizing rather than document structure). Restructuring this safely would
require per-page visual verification against the live site to confirm no
CSS selector targets these tags by level rather than by class, which
this sandboxed environment cannot do (see the network-access note at the
top of this report). Flagged as a manual follow-up.

## 8. SEO / metadata verification

- All 22 page titles are unique.
- Canonical URL present on 21 of 22 pages — intentionally absent on
  `404.html` (a 404 page has no canonical URL of its own; it also
  carries `<meta name="robots" content="noindex">`).
- `og:url` added to all 21 canonical-bearing pages during this review
  (mirrors each page's own canonical URL — a technical completion, not
  invented marketing copy).
- `og:image` / `twitter:image` confirmed 100% local (see §3).
- Favicon / apple-touch-icon confirmed 100% local (see §3).
- `robots.txt` present, points at `sitemap.xml`, allows all crawling.
- `sitemap.xml` present, well-formed XML, lists the 19 real content
  pages. `demomaps.html` (an empty stub page with no body content) and
  `coming-soon.html` (an unlinked placeholder splash page) are
  deliberately excluded from the sitemap — both files still exist and
  are still reachable by direct URL; they're simply not being actively
  submitted for indexing. This was a deliberate editorial call made
  during the initial migration, re-confirmed reasonable here.
- `404.html` present, uses the site's real nav/footer chrome, wired up
  via `.htaccess`'s `ErrorDocument 404`.
- Alt text: 100% coverage (§7).
- Heading hierarchy: not restructured (§7) — pre-existing, documented.
- Meta descriptions: present on 21 of 22 pages (all identical
  boilerplate text — a pre-existing content characteristic of the
  original site, not something this review invented or altered).
  `coming-soon.html` has no meta description, matching its already-minimal
  `<head>` in the original Webflow export. Content changes were out of
  scope for a technical migration/QA pass per the task's own instruction
  not to invent marketing copy.

## 9. Apache / cPanel / Hostinger / GoDaddy deployment compatibility

- Pure static files, zero build step, zero server-side language, zero
  database — confirmed compatible with any Apache-based shared hosting
  (Hostinger, GoDaddy, generic cPanel) or plain file hosting.
- `.htaccess` reviewed and hardened during this pass:
  - HTTPS + non-www redirect implemented as **two separate, single-
    condition `RewriteRule`s** rather than one combined regex — this
    environment has no Apache installation available to test
    `mod_rewrite` behavior against (confirmed: `apt-get install apache2`
    fails in this sandbox — package mirror unreachable under this
    environment's network policy), and a redirect loop is a far worse
    failure mode than one extra redirect hop for the uncommon
    `http://www.` case. Each rule was hand-traced through all 4 possible
    incoming states (http+www, http+non-www, https+www, https+non-www)
    to confirm every case terminates in at most one redirect with no
    loop possible.
  - `ErrorDocument 404 /404.html` wired to the custom 404 page.
  - `Options -Indexes` prevents directory listing.
  - `<FilesMatch "\.(md)$"> Require all denied </FilesMatch>` blocks
    direct access to any stray `.md` file (defense in depth — the actual
    `public_html_ready` package doesn't include any `.md` files at all,
    see §10).
  - Added in this review: browser caching (`mod_expires`, 1 year for
    images/fonts, 1 month for CSS/JS, 0 for HTML so content edits show up
    immediately) and compression (`mod_deflate` for text/CSS/JS/SVG/font
    assets), each wrapped in `<IfModule>` so hosts without that module
    simply skip the block rather than erroring.
  - Added in this review: conservative security headers
    (`X-Content-Type-Options: nosniff`, `Referrer-Policy:
    strict-origin-when-cross-origin`, `Permissions-Policy` disabling
    geolocation/microphone/camera, `X-Frame-Options: SAMEORIGIN`). **No
    Content-Security-Policy was added** — a CSP strict enough to matter
    needs per-directive tuning for Google Fonts and the Spline iframe
    embeds that cannot be safely verified without live testing against
    the production domain (blocked in this environment); an untuned CSP
    is more likely to silently break those than to add protection.

## 10. `public_html_ready` package

Located at `independent-static-site/public_html_ready/`, with a zipped
copy at `independent-static-site/public_html_ready.zip` (files at the zip
root, not nested — verified in §13). Contains exactly what should be
uploaded to `public_html` — `index.html` at the root, no `.md`
documentation files, no test scripts, no scratch files:

```
public_html_ready/
├── index.html
├── about.html, projects.html, contact.html          (main nav pages)
├── 21 case-study / legal / utility pages             (see MIGRATION_NOTES.md §9 for the full list)
├── 404.html
├── css/            (normalize.css, webflow.css, ericklguevara.webflow.css, site.css)
├── js/             (site.js only — webflow.js removed, see §1)
├── images/         (501 files)
├── fonts/          (4 local .ttf files)
├── .htaccess
├── robots.txt
└── sitemap.xml
```

25 top-level files + 4 directories, 217 MB total (dominated by `/images`
— Webflow's auto-generated responsive variants of each source image;
confirm this fits the target host's storage quota before uploading, per
`MIGRATION_NOTES.md` §7).

## 11. Known limitations / manual checks still recommended

- **No live-site pixel comparison was possible from this environment**
  (network policy blocks `ericklguevara.com` — confirmed via two
  independent tools). Recommend a manual side-by-side check against the
  live Webflow site before fully cutting over DNS.
- **Google Fonts / Spline embeds could not be live-tested** in this
  sandbox (also network-blocked) — confirmed correctly configured by
  source inspection and will need a real-browser check post-deployment
  (see `DEPLOYMENT_GUIDE.md` §7 checklist).
- Heading hierarchy left unrestructured (§7).
- Image `width`/`height` HTML attributes and font `<link rel="preload">`
  were considered as further optimizations but **not applied** in this
  pass: 185 of 187 images have no explicit width/height attributes
  (native dimensions are knowable from each file, but retrofitting
  accurate values across every image without a way to visually verify
  each one against a live rendering was judged higher-risk than the
  layout-shift benefit justified in this pass). Flagged as a future
  optimization opportunity, not a defect.
- Fixed-pixel-width CSS rules on the remaining ~13 non-container elements
  (mostly text columns like `.legal__paragraph`, `.legal__block`,
  `.about__pic`, `.info__main__block` variants) were identified by static
  analysis but did not produce any measurable page-level overflow in
  empirical testing across all 22 pages × 6 widths — left as-is rather
  than modified speculatively. (`.project__paragraph` and
  `.project__subtitle`, also originally on this list, turned out to be
  real bugs on `playground.html` and were fixed — see §4.)
- The pre-existing Wizeline/Walmart project-card mislink (both link to
  `cashi.html` instead of their own pages) and the orphaned
  `coming-soon.html`/`demomaps.html`/`playground.html` pages were
  preserved as-is — content/IA decisions for the site owner, not
  technical defects.

## 12. Pages tested

All 22 HTML pages were included in the link-integrity check, the
Webflow-reference scan, the CDN-localization scan, the `data-w-id`
removal + functional re-verification, and the accessibility pass.
Rendered and interaction-tested with a real (local, offline) headless
Chromium via Playwright:

- Every page: horizontal-overflow check at 1440/1280/1024/768/480/375px
  (§5).
- `index.html`: page-load fade, divider scroll-reveal, project-card hover
  scale, mobile nav open/close + `aria-expanded`, no-JS fallback.
- `about.html`, `projects.html`, `contact.html`, `privacy-policy.html`,
  `404.html`: load + console-error check at desktop/tablet/mobile widths.
- `cashi.html`: lightbox open (mouse click), image display, keyboard
  navigation (Tab to close button, Enter to close), Escape-to-close.
- `dowjones.html`: alt-text spot check on case-study gallery images.
- All 22 pages: full console-error and failed-network-request sweep (the
  only failures found on any page were the expected Google-Fonts/Spline
  blocks from this sandbox's own network policy — zero local asset
  errors, zero JavaScript exceptions).

## 13. Final ZIP verification

`public_html_ready.zip` was extracted into a clean temporary directory
(outside the project entirely) and re-tested from that extracted copy —
not from the working `public_html_ready/` folder — to catch anything the
zip step itself might have broken:

- **`index.html` confirmed at the zip root**, not nested inside a
  `public_html_ready/` folder — `unzip -l` lists `index.html`,
  `.htaccess`, `css/`, `js/`, `images/`, `fonts/`, `robots.txt`,
  `sitemap.xml`, etc. all directly at the archive root.
- **File count matches exactly**: 535 files in the source
  `public_html_ready/` folder, 535 files in the extracted copy.
- **`.htaccess` presence verified explicitly** — the first zip build used
  a `zip -x ".*"` exclusion flag intended to skip stray dotfiles, which
  turned out to also exclude `.htaccess` itself (there were no other
  dotfiles in the source, so this wasn't caught until directly checking
  `unzip -l ... | grep htaccess` came back empty). Caught before this
  report was finalized, not after; the zip was rebuilt without that flag
  and re-verified present.
- **Extracted copy served and tested exactly like the working copy**: a
  local HTTP server against the extraction directory returned `200` for
  `index.html`, `css/site.css`, `js/site.js`, `robots.txt`, `sitemap.xml`,
  `404.html`, the Open Graph image, and a local font file. A full
  Playwright pass against the extracted copy confirmed the page loads
  with the correct title, `body` opacity resolves to `1` (page-load fade
  completes), the footer is the semantic `<footer>` element, the mobile
  nav toggle opens correctly, and the case-study lightbox opens correctly
  — with zero JavaScript console errors.
- **Re-ran the Webflow/CDN reference scan against the extracted copy**
  specifically (not just the source folder) — zero occurrences of
  `webflow.io`, `website-files.com`, `uploads-ssl.webflow.com`,
  `Webflow.push`, or `Webflow.require` anywhere in the extracted HTML,
  CSS, or JS, and `js/webflow.js` is confirmed absent from the archive.

**Confirmed: the site does not depend on Webflow hosting, the Webflow
JavaScript runtime, or any Webflow-owned CDN domain for any asset,
including Open Graph metadata images and favicons — verified from a copy
of the deliverable extracted completely independently of the working
directory that produced it.**
