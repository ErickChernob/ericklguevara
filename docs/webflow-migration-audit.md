# Webflow → Static HTML Migration Audit
**Project:** ericklguevara.com portfolio site
**Phase:** Audit & Planning only — no files modified
**Date:** 2026-07-15
**Scope:** Full repository (21 HTML pages, 3 CSS files, 1 JS bundle, 4 web fonts, ~502 images)

> This document is a read-only audit. Nothing in the repository was changed to produce it. It is meant to be the foundation for a later, incremental migration to a framework-free static site (HTML/CSS/JS/assets only) deployable to Apache-based shared hosting (Hostinger, GoDaddy, etc.) via `public_html`.

---

## 0. Executive Summary

The export is a clean, non-CMS Webflow site (no Ecommerce, no Memberships, no native Webflow forms). It is already close to "static," but it depends on Webflow's hosted JS runtime for **all interactivity and page-load behavior**, on **Google Fonts + Google's WebFont loader** for typography, on a **Webflow/jQuery CDN bundle**, on a **deprecated Google Analytics (Universal Analytics) property that stopped collecting data in July 2023**, and on a handful of images that are **not localized** (still pointed at `uploads-ssl.webflow.com` / `cdn.prod.website-files.com`). Contact is handled via a plain `mailto:` link — **no WhatsApp integration exists in this export**, contrary to the general assumption in the brief.

The interactive surface is small: a slide-down mobile nav menu (`w-nav`), fade/slide entrance animations and hover states driven by Webflow's IX2 engine (`data-w-id`), and image lightbox galleries (`w-lightbox`) on the case-study pages. There are **no tabs, sliders, dropdowns, accordions, or forms** actually used anywhere in the markup (those component classes exist only in the unused portions of the stock `webflow.css` framework file). This significantly narrows the interaction-replacement work.

Overall migration risk is **low-to-medium**: the biggest risks are (1) the externally-hosted lightbox/OG images that will 404 once Webflow hosting is gone, (2) the IX2 interaction data being baked into the single 381 KB `js/webflow.js` bundle rather than being a separate, readable config, and (3) two pre-existing content bugs (Wizeline/Walmart cards linking to `cashi.html`) unrelated to the migration itself.

---

## 1. Webflow-Specific Files, Scripts, Classes, Attributes, Metadata, CDN References

**Files that are Webflow build artifacts (not hand-written):**
- `css/webflow.css` (1,800 lines) — Webflow's generic component framework (grid, nav, forms, sliders, tabs, dropdowns, lightbox, icons font). Confirmed stock via its `webflow-icons` `@font-face` base64 icon font.
- `css/normalize.css` (355 lines) — third-party normalize.css v3.0.3 (MIT), bundled by Webflow's exporter, not Webflow-authored.
- `css/ericklguevara.webflow.css` (2,177 lines) — the site's actual design (classes, breakpoints, custom fonts). Named with the `.webflow.css` suffix by the exporter but this is the one file with real content.
- `js/webflow.js` (381 KB, minified, single line) — Webflow's full client runtime: IX2 interaction engine, nav/menu controller, lightbox, tabs/slider/dropdown/form controllers (mostly unused here), and this **site's own baked-in interaction data** (see §7).

**Every page's `<head>` carries identical Webflow fingerprints:**
- `<!--  This site was created in Webflow. https://webflow.com  -->` and `<!--  Last Published: ... -->` HTML comments
- `<html data-wf-page="…" data-wf-site="623c994393264d0edc82735e">`
- `<meta content="Webflow" name="generator">`
- Inline IIFE that adds `w-mod-js` / `w-mod-touch` classes to `<html>`
- `<body style="opacity:0" class="body">` — Webflow's FOUC-prevention hook; JS removes the inline `opacity:0` after `webflow.js` runs. **If `webflow.js` fails to load, the entire page stays invisible.** This is the single most important behavior to replace (see §6/§14).

**Webflow-specific classes** (utility/component naming): `w-nav`, `w-nav-brand`, `w-nav-menu`, `w-nav-link`, `w-nav-button`, `w-nav-overlay`, `w--open`, `w--current`, `w-inline-block`, `w-button`, `w-embed`, `w-iframe`, `w-lightbox`, `w-json`, `w-mod-js`, `w-mod-touch`, `w-dyn-*`, `w-tab-*`, `w-slider*`, `w-dropdown*`, `w-form*`, `w-radio*`, `w-select` (the last six exist only in `webflow.css`, not used in any page).

**Webflow-specific attributes:** `data-wf-page`, `data-wf-site`, `data-w-id` (231 occurrences across pages — IX2 element bindings), `data-animation`, `data-collapse`, `data-duration`, `data-easing`, `data-easing2` (all on the `.w-nav` element, configuring the mobile menu), `data-json`/inline `<script class="w-json">` (lightbox gallery config), `id="w-node-…"` (Webflow's internal node IDs, used only as anchors, safe to keep or drop).

**CDN references found in the export:**
| Domain | Purpose | Files |
|---|---|---|
| `ajax.googleapis.com` | Google WebFont Loader script | all 21 pages |
| `fonts.googleapis.com` / `fonts.gstatic.com` | Google Fonts preconnects + actual font delivery (Montserrat) | all 21 pages |
| `d3e54v103j8qbb.cloudfront.net` | Webflow's CDN — hosts a pinned jQuery 3.5.1 build (`jquery-3.5.1.min.dc5e7f18c8.js`) with a SRI hash tied to the site ID | all 21 pages |
| `www.googletagmanager.com` | Google's gtag.js loader for the (deprecated) Universal Analytics property | 20 pages |
| `uploads-ssl.webflow.com` | Open Graph / Twitter share image (`EG_OpenGraph.png`) — **never localized** | all 21 pages (meta only) |
| `cdn.prod.website-files.com` | Lightbox gallery source images on 3 case-study pages — **never localized** | `cashi.html`, `walmart.html`, `wizeline.html` |
| `my.spline.design` | Third-party 3D scene embedded via `<iframe>` | `index.html`, `contact.html`, `coming-soon.html` |
| `webflow.com` | Referenced only inside code comments and inside the `webflow.js` bundle (badge SVG URLs that are never rendered because no Webflow badge appears in any page's markup) | all pages (comments only) |

---

## 2. Webflow Dependencies by Interactive Component

| Component | Present in this site? | Current dependency | Notes |
|---|---|---|---|
| Mobile navigation (hamburger menu) | **Yes** — every page | `webflow.js` nav controller, driven by `data-animation/-collapse/-duration/-easing` on `.w-nav`, plus `.w-nav-menu`/`.w-nav-button`/`.w--open` classes | The only genuinely interactive UI chrome on the whole site. Must be rebuilt in vanilla JS + CSS transitions. |
| Dropdown menus | **No** | n/a | `w-dropdown*` classes exist only in the unused `webflow.css` framework; zero usage in any page's HTML. |
| Tabs | **No** | n/a | Same — `w-tabs`/`w-tab-*` unused. |
| Sliders/carousels | **No** | n/a | `w-slider*` unused. |
| Accordions | **No** | n/a | Not present in `webflow.css` output or markup at all. |
| Scroll interactions | **Yes, minimal** | IX2 "divider" width-grow animations (`class="divider"` elements with `data-w-id`, `style="width:0%"` initial state) that animate on scroll-into-view on the home and project pages | Baked into `webflow.js`'s IX2_RAW_DATA (§7); needs to be reproduced with an IntersectionObserver + CSS transition. |
| Hover effects | **Yes** | 12 `:hover` rules in `ericklguevara.webflow.css` (link/button/image hover states) | Pure CSS — **no JS dependency**, ports over unchanged. |
| Page-load animations | **Yes** | The `body[style="opacity:0"]` fade-in trick + IX2 "fade/slide-in" entrance animations on hero text and project cards, all triggered by `webflow.js` on `DOMContentLoaded`/window load | Highest-risk item: if not replaced correctly, pages will load and stay blank (opacity:0) with no JS fallback. |
| Responsive behavior | **Yes, but CSS-only** | Four `@media` breakpoints (479px, 767px, 991px, 1280px) in `ericklguevara.webflow.css`; `srcset`/`sizes` on nearly every `<img>` for responsive image delivery | No JS involved — pure CSS + native `srcset`, safe to keep as-is. |
| Lightbox image galleries | **Yes** — `cashi.html`, `walmart.html`, `wizeline.html` | `webflow.js` lightbox controller reading `<script type="application/json" class="w-json">` blocks per image | Needs a small custom lightbox (or a lightweight dependency-free library) since these 3 pages are the only ones using it, and 6 of the images it references are still pointed at Webflow's CDN (see §4). |
| Embedded 3D scene | **Yes** | Plain `<iframe src="https://my.spline.design/...">` inside a `w-embed w-iframe` div | Not a Webflow dependency — this is a third-party embed and will keep working after decoupling, as long as the Spline project stays published. |

---

## 3. External Dependencies

- **Fonts:**
  - Google Fonts "Montserrat" (all 18 weight/style variants) loaded via the **Google WebFont Loader** (`ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js`) — a render-blocking-adjacent third-party script that then injects the actual `<link>` to `fonts.googleapis.com`.
  - 4 self-hosted `.ttf` files in `/fonts` (Helvetica Neue Light/Thin, Helvetica Neue Cyr Bold/UltraLight) — already local, no dependency.
- **Images:** ~502 files under `/images`, almost entirely local and already present (Webflow's automatic responsive-image variants: `-p-500`, `-p-800`, `-p-1080`, `-p-1600`, `-p-2000`, `-p-2600`, `-p-3200` suffixes). Exceptions noted in §4.
- **Videos:** none found (no `<video>` tags, no video files in the repo).
- **JavaScript libraries:**
  - jQuery 3.5.1, served from Webflow's CDN (`d3e54v103j8qbb.cloudfront.net`) with a site-specific query string and SRI hash — required by `webflow.js` (Webflow's runtime is built on jQuery).
  - Google WebFont Loader (`webfont.js` from `ajax.googleapis.com`).
  - `webflow.js` itself.
- **Analytics:** Google Analytics via `gtag.js`, configured with tracking ID `UA-165292899-1` on 20 of 21 pages (missing only from `coming-soon.html`). **This is a Universal Analytics property ID — Google stopped processing UA data on July 1, 2023.** This script currently loads and fires events into the void; it collects nothing. It should either be removed or replaced with a GA4 property during this migration.
- **Tracking pixels:** none found beyond the above GA snippet.
- **Third-party widgets/embeds:** Spline 3D scene embeds (`my.spline.design`) on `index.html`, `contact.html`, `coming-soon.html`.
- **WhatsApp integrations:** **none found.** Contact is a single `mailto:erickleonelguevara@gmail.com` link on `contact.html`. Flagging this since the task brief assumed WhatsApp/third-party contact tooling might be present — it is not, so no external contact widget needs to be preserved or re-implemented.
- **Embedded content:** the Spline iframes above; three `w-json` lightbox galleries (image-only, no external service).

---

## 4. Resources Currently Loaded From Webflow/External CDN Domains

These are the concrete items that will **break** once Webflow hosting/CDN access is turned off, because they were never copied into `/images`:

| Location | Resource | Used for |
|---|---|---|
| All 21 pages, `<meta property="og:image">` / `<meta name="twitter:image">` | `https://uploads-ssl.webflow.com/623c994393264d0edc82735e/62460c103591c7096ecf7540_EG_OpenGraph.png` | Social share preview image |
| `cashi.html` (6 refs), `walmart.html` (7 refs), `wizeline.html` (7 refs) | `https://cdn.prod.website-files.com/623c994393264d0edc82735e/<hash>_<Name>.png` inside `w-json` lightbox config blocks | Full-resolution images shown when a lightbox thumbnail is clicked |
| `js/webflow.js` (inert, unused) | `https://d3e54v103j8qbb.cloudfront.net/img/webflow-badge-*.svg` | "Made in Webflow" badge assets — never actually rendered on any page (no badge markup present), so this is dead code, not a live dependency |

Everything else under `/images`, `/fonts`, and `/css` is already local. **Action needed before decoupling:** download the OG image and the ~20 lightbox source images and re-point those references at local `/images` paths — this is the only true "missing asset" gap in the export.

---

## 5. HTML Attribute Review

- **Safe to remove** (once IX2/nav JS is replaced): `data-wf-page`, `data-wf-site`, `data-w-id`, `id="w-node-…"`, `data-animation`, `data-collapse`, `data-duration`, `data-easing`, `data-easing2`, the `w-mod-js`/`w-mod-touch` IIFE, `<meta name="generator" content="Webflow">`, both "Created in Webflow" / "Last Published" comments.
- **Must remain until the corresponding phase is done:**
  - `data-w-id` — needed as JS hooks until entrance/scroll animations are re-implemented in custom JS; removing it early silently kills those animations.
  - `data-animation`/`data-collapse`/`data-duration`/`data-easing(2)` on `.w-nav` — needed until the mobile-menu JS is rewritten.
  - `class="w-nav"`, `w-nav-menu`, `w-nav-link`, `w-nav-button`, `w--current`, `w--open` — CSS selectors in `ericklguevara.webflow.css` target these class names directly; renaming/removing them without also rewriting the CSS will break layout.
  - `w-lightbox`/`w-json` — needed until the lightbox is reimplemented.
  - `w-embed`/`w-iframe` — purely structural wrapper classes with real CSS behind them (sizing/positioning the Spline iframe); safe to keep indefinitely or rename later, low priority.
- **Accessibility / semantic issues to address later (not blocking, but should be tracked):**
  - **Every one of the 184 `<img>` tags has `alt=""`.** No descriptive alt text exists anywhere on the site — a real accessibility gap, independent of the Webflow migration.
  - **Heading hierarchy is not semantic.** `index.html` has 20 `<h1>` elements and `projects.html` has 18; site-wide there are 59 `<h1>`s and only 15 `<h2>`s, and **zero** `<h3>`–`<h6>` anywhere. Webflow's "Heading" style class was used purely for visual sizing, not document structure.
  - **`<html>` has no `lang` attribute** on any page (should be `lang="en"` or appropriate).
  - No `<meta name="robots">` on any page, no `robots.txt`, no `sitemap.xml` anywhere in the repo (see §9).
  - No `<link rel="canonical">` on any page.
  - These are pre-existing issues, not something the migration introduces — recommend fixing in the **Cleanup** phase, not before, to keep the visual-preservation phase strictly non-destructive.

---

## 6. CSS Review

- **Webflow-generated utility styles:** `css/webflow.css` is the full generic component framework — grid system, form controls, tabs, sliders, dropdowns, lightbox, and the base icon font (`webflow-icons`, embedded as base64). Only a small subset (nav, lightbox, embed) is actually exercised by this site; the rest (forms, tabs, sliders, dropdown, select, radio/checkbox styling) is dead weight that ships to every visitor unused.
- **Duplicate rules:** all 4 custom fonts are declared via `@font-face` **twice** in `ericklguevara.webflow.css` — once with unquoted `font-family` values (`Helvetica Neue Bold`, `Helveticaneue`) and once with quoted equivalents (`'Helvetica Neue Bold'`, `'Helveticaneue'`), both pointing at the same `.ttf` files. This is a straightforward, low-risk cleanup (collapse to one declaration per font) but should wait for the Cleanup phase so it isn't mixed with structural changes.
- **Unused styles:** the tabs/slider/dropdown/form/select/radio/checkbox rule blocks in `webflow.css`, since none of those components are used anywhere in the markup (confirmed by grepping all HTML for `w-tab*`, `w-slide*`, `w-dropdown*`, `w-form*`, `w-select`, `w-radio*` — zero matches outside the CSS files themselves).
- **Responsive breakpoints** (in `ericklguevara.webflow.css`): `max-width: 479px`, `max-width: 767px`, `max-width: 991px`, `min-width: 1280px` — Webflow's standard 4-breakpoint system (mobile portrait / mobile landscape / tablet / desktop). These carry the real responsive design and must be preserved exactly.
- **Classes that must not be renamed during the fidelity phase:** every custom BEM-ish class actually used in the markup (`main__navbar`, `navbar__menu`, `navbar__link`, `main__heading`, `portfolio__container`, `project__inportfolio`, `extrainfo__*`, `divider`, `complementary_titles`, `footer__container`, etc.) plus every Webflow structural class still wired to `webflow.js`/`ericklguevara.webflow.css` selectors (`w-nav*`, `w--current`, `w--open`, `w-lightbox`, `w-inline-block`, `w-embed`, `w-iframe`). Renaming any of these before the corresponding JS/CSS is rewritten will visibly break layout or interactivity.
- **Styles that depend on Webflow JavaScript:** the `.w-nav-menu` open/closed state styling (driven by the `w--open` class toggle in `webflow.js`), and the initial `width:0%` inline style on every `.divider` element (set in the HTML, animated to a target width by the IX2 engine at runtime — without JS, these dividers will simply stay invisible at 0 width forever).

---

## 7. JavaScript Review

- **Essential (currently required for the site to function as designed):**
  - `js/webflow.js` — powers the mobile nav, all entrance/scroll animations, the lightbox galleries, and the `opacity:0`→`1` reveal on `<body>`. Without it, every page loads permanently invisible.
  - jQuery 3.5.1 (Webflow CDN) — a hard dependency of `webflow.js`.
  - Google WebFont Loader — without it, `Montserrat` never loads (no local fallback `<link>` exists); text falls back to the browser default sans-serif.
  - The inline `w-mod-js`/`w-mod-touch` IIFE — used by some `webflow.css` selectors (`.w-mod-touch`) though impact here is minor since touch-specific rules aren't heavily used.
- **Unused:** the large tabs/slider/dropdown/form/select controller code paths bundled inside `webflow.js` — dead code relative to this site's actual markup, but it can't be selectively stripped since the file is a single minified bundle; it only goes away once `webflow.js` itself is replaced.
- **Interactions that must be recreated with custom JavaScript:**
  1. Mobile nav open/close (currently `data-collapse="medium"` behavior — collapses under 767px, hamburger toggles `.w--open`).
  2. IX2 scroll-triggered "divider" width animations (0% → 100%) on the home and project pages.
  3. IX2 entrance animations on hero text / project cards.
  4. Lightbox open/close + image switching on the 3 case-study pages with galleries.
  5. The `body[style="opacity:0"]` → visible fade-in on load (should be replaced with a CSS-only `@keyframes` fade or simply removed in favor of always-visible content, which is actually the **safer, more robust choice** for a static site with no guaranteed JS runtime).
- **Interactions that can be replaced with CSS alone:** all `:hover` states (already pure CSS), and the load fade-in (can become a CSS animation with no JS dependency at all, removing the "blank page if JS fails" risk entirely).
- **Scripts that may stop working outside Webflow hosting:**
  - The jQuery `<script>` tag's `src` includes `?site=623c994393264d0edc82735e` and a **subresource-integrity hash tied to that exact build** — this is just a normal jQuery CDN file and will keep working indefinitely regardless of Webflow hosting status (CloudFront will keep serving it), but it's still an unnecessary external dependency once `webflow.js` is gone, since nothing else on the site uses jQuery.
  - `webflow.js` has no hard dependency on Webflow's *hosting* (it's a static file you're already serving yourself), but it does assume the page was published *by* Webflow (checks `data-wf-site`/`data-wf-page`) for some internal bookkeeping/analytics beacons back to Webflow's own servers — those calls will simply fail silently on non-Webflow hosting (not a functional break, just noise/console errors).
- **IX2 interaction configuration:** **Present, but not as a separate readable file.** Webflow normally exposes the interactions config as a `IX2_RAW_DATA` object with `actionLists`, trigger definitions, easing curves, and staggered timing. In this export that data is **compiled directly into the single minified `js/webflow.js` bundle** (confirmed via `grep` — the strings `IX2_RAW_DATA`, `actionLists`, and this project's actual page ID `624097645838bd5d7a226682` and specific element `data-w-id` values all appear inside `webflow.js`). It is **not** exposed as a standalone JSON file or inline `<script>` block anywhere in the HTML. This means:
  - The full interaction config exists and is *complete* for the pages that use it (home, project detail pages), but it is only recoverable by digging through the minified bundle or, more practically, by re-deriving each animation from what's visually observed in a browser plus the `data-w-id` bindings in the HTML.
  - Because it's baked into one shared file across all pages, there is no per-page IX2 config to extract cleanly — recommend treating "what does each `data-w-id` element actually animate" as something to verify empirically (open each page, watch the animation, note timing/easing) rather than trying to reverse-engineer it from the bundle.

---

## 8. Internal Links & URL Structure on Apache

All internal navigation uses **relative, extension-ful links** (`href="about.html"`, `href="projects.html"`, etc.) — no leading slashes, no query strings, no hash-routing. This is the most Apache-friendly pattern possible:
- Works unmodified when uploaded directly into `public_html` on Hostinger/GoDaddy.
- Works whether the site sits at the domain root or in a subdirectory, since links are relative rather than absolute.
- No client-side router, no `history.pushState` usage — every "page" is a real file Apache can serve directly.

No broken internal links were found — every `href="images/…"` and `href="*.html"` reference resolves to a file that exists in the repo, and filenames match reference casing exactly (checked programmatically). One caveat: image filenames are inconsistently cased (`CashiScreenSingle1.png`, `str_1.png`, `kal3.png` etc. — 502 of ~500 images contain uppercase characters). This is **not currently a bug** since Linux/Apache is case-sensitive and every reference matches its file exactly, but it's a latent risk: any future manual edit that mistypes case will 404 silently on Apache/Linux even though it might have worked during local preview on a case-insensitive filesystem (macOS/Windows).

**Orphaned pages** (exist in the repo but are not linked from anywhere): `coming-soon.html`, `demomaps.html` (an essentially empty stub page — nav + footer only, no body content), and `playground.html`. `walmart.html` and `wizeline.html` are also currently unreachable through navigation — **not because they're intentionally hidden, but because of a content bug**: on `index.html` and `projects.html`, the "Wizeline" and "Walmart" project cards both link to `href="cashi.html"` instead of `wizeline.html`/`walmart.html` respectively. This is a pre-existing defect in the live site, unrelated to the Webflow migration — flagging it here for a decision, but not fixing it in this audit-only phase.

---

## 9. SEO / Metadata / Discoverability Review

- **Page titles:** present and unique per page (`ERICKLGUEVARA | Home`, `| About`, `| Contact`, etc.) — good.
- **Meta descriptions:** present, but **identical across every single page** ("A forever evolving designer focused on creative & meaningful web experiences") — including project case-study pages that could have unique descriptions. Not a migration blocker, but worth flagging for the content-owner.
- **Canonical tags:** **none exist on any page.**
- **Open Graph metadata:** present on all pages (`og:title`, `og:description`, `og:image`, `og:type`) plus Twitter card equivalents — but the `og:image`/`twitter:image` URL points at Webflow's CDN (see §4), so social share previews will break once that CDN reference is no longer maintained/available.
- **Favicons:** `images/favicon.png` (shortcut icon) and `images/webclip.png` (apple-touch-icon) — both local, both present, no dependency risk. No modern favicon set (no explicit sizes, no `manifest.json`, no SVG favicon) — optional future improvement, not required.
- **robots.txt:** **does not exist in the repository.**
- **sitemap.xml:** **does not exist in the repository.**
- **404 behavior:** **no custom 404 page exists.** (Two content pages merely contain the word "404" in body copy — `callgurus.html` and `privacy-policy.html` — unrelated to actual error handling.) On Apache/shared hosting, an unhandled request will fall back to the host's default error page unless a `404.html` + `.htaccess ErrorDocument` rule is added during packaging.
- **Analytics/tracking scripts:** Google Analytics via `gtag.js`, but bound to a **dead Universal Analytics ID** (`UA-165292899-1`, deprecated July 2023) on 20 of 21 pages. Currently generates network requests that Google silently discards. Needs an explicit decision: remove entirely, or replace with a working GA4 measurement ID.

---

## 10. Deployment Considerations for Apache Hosting

- **Relative vs. absolute paths:** all CSS/JS/image references inside the HTML/CSS are relative (`css/…`, `js/…`, `images/…`, `../fonts/…` from within `css/`). No absolute filesystem or protocol-relative paths were found pointing at local assets. Safe for `public_html` deployment as-is.
- **Uppercase/lowercase filenames:** flagged in §8 — currently consistent (no case-mismatch bugs today), but risky to hand-edit later on case-sensitive Apache/Linux.
- **Spaces/special characters in filenames:** none found — every filename in the repo uses only alphanumerics, hyphens, and underscores.
- **Clean URLs / `.html` extensions:** every internal link explicitly includes `.html`. This means the site works with zero Apache rewrite configuration. Optionally, `.htaccess` rewrite rules could later strip `.html` for cosmetically cleaner URLs, but that is **not required** and would be a scope addition beyond "preserve as-is."
- **Apache configuration / `.htaccess`:** none exists in the repo today (no `.htaccess` file at all). For a plain static export this is optional, but two additions are worth planning for the Packaging phase:
  1. `ErrorDocument 404 /404.html` once a custom 404 page is created.
  2. Optional caching headers (`Expires`/`Cache-Control`) for `/images`, `/fonts`, `/css`, `/js` — meaningful here given the **216 MB images directory** (see §14).
- **Disk footprint:** the `images/` directory alone is ~216 MB (502 files, largely Webflow's auto-generated responsive variants: `-p-500` through `-p-3200` suffixes per source image). Verify this fits within the target host's storage quota before packaging — shared hosting plans sometimes cap total disk space well below this.

---

## 11. Page-by-Page Inventory

| Page | Title | Linked from nav? | Purpose | Notable elements |
|---|---|---|---|---|
| `index.html` | ERICKLGUEVARA \| Home | Yes | Home / hero + recent-projects feed | Spline 3D embed, 13 project cards w/ IX2 divider animations, 20×`<h1>` |
| `about.html` | ERICKLGUEVARA \| About | Yes | About page | No `data-w-id` usage (static content) |
| `projects.html` | ERICKLGUEVARA \| Projects | Yes | Full projects listing | 25×`data-w-id`, 18×`<h1>`, same Wizeline/Walmart→cashi.html link bug as index |
| `contact.html` | ERICKLGUEVARA \| Contact | Yes | Contact | `mailto:` link, Spline embed, **no WhatsApp/form** |
| `cashi.html` | (case study) | Via project cards | Case study — Cashi App Wallet | Lightbox gallery (6 images, sourced from `cdn.prod.website-files.com`, not localized) |
| `walmart.html` | (case study) | **Orphaned** (broken link from cards) | Case study — Walmart post-purchase | Lightbox gallery (7 images, not localized) |
| `wizeline.html` | (case study) | **Orphaned** (broken link from cards) | Case study — Wizeline redesign | Lightbox gallery (7 images, not localized), content appears to duplicate `walmart.html`'s lightbox images |
| `dowjones.html` | (case study) | Yes (from `cashi.html`, `index`, `projects`) | Case study — Dow Jones Professional | Standard case-study layout |
| `assetmark.html` | (case study) | Yes | Case study — AssetMark E-Wealth Manager | Standard case-study layout |
| `gaia.html` | (case study) | Yes | Case study — Gaia streaming | Standard case-study layout |
| `str.html` | (case study) | Yes | Case study — Stock that Rocks | Standard case-study layout |
| `carolinarcuellar.html` | (case study) | Yes | Case study — photography portfolio | Standard case-study layout |
| `callgurus.html` | (case study) | Yes | Case study — The Call Gurus job board | Standard case-study layout |
| `escuelafalcon.html` | (case study) | Yes | Case study — Escuela Falcon (2021) | Standard case-study layout |
| `makeupmx.html` | (case study) | Yes | Case study — MakeupMX (2020) | Standard case-study layout |
| `kalopsic.html` | (case study) | Yes | Case study — Kalopsic landing page | Standard case-study layout |
| `playground.html` | ERICKLGUEVARA \| Playground | **Orphaned** | Experimental/demo page | Links out to an external AR asset (`ericklguevara.com/downloads/plantcell.usdz`) |
| `demomaps.html` | DemoMaps | **Orphaned** | Empty stub | Nav + footer only, single empty `w-embed` div, no real content |
| `coming-soon.html` | ERICKLGUEVARA \| Coming Soon | **Orphaned** | Standalone "coming soon" splash | Logo links out to `https://ericklguevara.com/` (external, `target="_blank"`), Spline embed, no GA snippet (only page without it) |
| `privacy-policy.html` | ERICKLGUEVARA \| Privacy Policy (assumed) | Yes | Legal boilerplate | 48 KB, generic legal template referencing "ericklguevara.com" |
| `terms-and-conditions.html` | ERICKLGUEVARA \| Terms (assumed) | Yes | Legal boilerplate | 36 KB, generic legal template |

*(Titles for the individual case-study/legal pages weren't re-verified line-by-line in this table — confirm exact `<title>` text during the Testing phase.)*

---

## 12. Interaction Inventory (must be preserved)

| # | Interaction | Where | Current mechanism | Replacement approach |
|---|---|---|---|---|
| 1 | Mobile hamburger nav open/close | Every page's `.w-nav` | `webflow.js` + `data-collapse="medium"` | Vanilla JS `classList.toggle` + CSS max-height/transform transition |
| 2 | Nav active-state highlighting | Every page | `w--current` class, applied per page in the static HTML (not JS-driven) | No change needed — already static per-page markup |
| 3 | Page-load fade-in | Every page | `body[style="opacity:0"]` removed by `webflow.js` | CSS-only `@keyframes fadeIn`, remove the inline `opacity:0` risk entirely |
| 4 | "Divider" width-grow animation | `index.html`, `projects.html`, case-study pages (`.divider` elements) | IX2 scroll-triggered animation, `width:0%` → runtime target | Custom JS `IntersectionObserver` + CSS `transition: width` |
| 5 | Hero/heading entrance animation | `index.html`, case-study pages | IX2 on-load animation via `data-w-id` | CSS `@keyframes` triggered on load, or small custom JS if staggered timing is needed |
| 6 | Project card hover states | `index.html`, `projects.html` | Pure CSS `:hover` | No change — already framework-independent |
| 7 | Image lightbox / gallery | `cashi.html`, `walmart.html`, `wizeline.html` | `webflow.js` lightbox controller + `w-json` config | Custom lightweight JS lightbox (dependency-free), **plus localize the 20 externally-hosted source images first** |
| 8 | Responsive image delivery | All pages | Native `srcset`/`sizes` on `<img>` | No change — not a Webflow dependency |
| 9 | Embedded 3D scene | `index.html`, `contact.html`, `coming-soon.html` | Plain `<iframe>` to Spline | No change — third-party embed, framework-independent |

**Not present anywhere, despite being listed in the general brief:** dropdown menus, tabs, sliders/carousels, accordions, native Webflow forms, WhatsApp widgets. Confirmed via exhaustive grep of all 21 HTML files for the relevant Webflow component classes.

---

## 13. Risk Assessment

**High risk**
- Removing `js/webflow.js`/jQuery without first replacing the page-load `opacity:0` mechanism — pages would load permanently blank.
- Localizing the lightbox/OG images late or not at all — visible breakage (broken share previews, broken gallery images) on 3 case-study pages the moment Webflow hosting is decommissioned.
- Reverse-engineering the exact IX2 timing/easing purely from the minified `webflow.js` bundle instead of visually verifying each animation in-browser — high chance of subtly wrong easing/duration going unnoticed.

**Medium risk**
- Rebuilding the mobile nav's open/close behavior to exactly match current timing (`data-duration="400"`, `data-easing="ease-in-out"`) — functionally simple, but easy to get subtly wrong without care.
- Google WebFont Loader removal/replacement — need to switch to a direct `<link>`/`@font-face` for Montserrat (Google Fonts still serves it directly) without introducing layout shift or FOIT/FOUT regressions.
- The Wizeline/Walmart/orphaned-pages content issues (§8, §11) — not a technical migration risk, but could confuse whoever does the hands-on migration work if not explicitly called out and decided on beforehand (fix, leave, or intentionally deprecate those pages).
- Case-sensitive filenames (§8/§10) — no current bugs, but a real risk during any future manual asset edits on Apache.

**Low risk**
- Stripping unused Webflow attributes (`data-wf-page`, `data-wf-site`, `id="w-node-…"`, generator meta, HTML comments) — purely cosmetic, no functional dependency once other phases are complete.
- Removing the dead Universal Analytics snippet — it's already non-functional (collects nothing since 2023); removing it has zero user-facing effect, only requires a decision on whether to replace it with GA4.
- Duplicate `@font-face` declarations — cosmetic CSS cleanup, no visual effect either way.
- Preserving relative link structure / clean `.html` URLs on Apache — already correct, essentially zero risk.
- Hover-state CSS, responsive `srcset` images, breakpoint media queries — already framework-independent.

---

## 14. Proposed Conservative Migration Plan

**Phase 1 — Visual Preservation (no functional changes)**
- Take full-page screenshots (desktop + mobile, per breakpoint) of every reachable page as a fidelity baseline.
- Leave all files exactly as-is; this phase produces reference artifacts only, not code changes.

**Phase 2 — Webflow Decoupling (assets & fonts)**
- Download and localize the Open Graph image (`images/EG_OpenGraph.png` or similar) and all lightbox source images currently on `cdn.prod.website-files.com`; repoint the `w-json` blocks and `<meta>` tags at local paths.
- Replace the Google WebFont Loader (`webfont.js` + `WebFont.load(...)`) with a direct Google Fonts `<link>` (or fully self-hosted Montserrat `.ttf`/`.woff2` files alongside the existing Helvetica Neue fonts, if full independence from Google is desired).
- Remove the jQuery CDN `<script>` tag once `webflow.js` is no longer in use (Phase 3 dependency — don't remove prematurely).
- Decide on Google Analytics: drop entirely, or swap `UA-165292899-1` for a live GA4 ID.

**Phase 3 — Interaction Replacement**
- Build one small vanilla-JS module for the mobile nav toggle, matching current duration/easing.
- Replace the `body[style="opacity:0"]` load-fade with a CSS-only `@keyframes` fade — removes the "blank page without JS" risk entirely.
- Reproduce the `.divider` scroll-grow animation with an `IntersectionObserver` + CSS transition, verified visually per page against the Phase 1 screenshots.
- Reproduce hero/heading entrance animation the same way.
- Build a small dependency-free lightbox for the 3 case-study pages that use `w-lightbox`, reading the same `w-json` data already in the markup.
- Once all of the above are verified working, remove `js/webflow.js` and the jQuery `<script>` tag.

**Phase 4 — Cleanup**
- Strip remaining Webflow-only attributes/comments/meta (`data-wf-page`, `data-wf-site`, generator tag, "Created in Webflow" comments, unused `id="w-node-…"` where not needed for CSS).
- Collapse the duplicate `@font-face` declarations to one per font.
- Remove the unused tabs/slider/dropdown/form/select/radio CSS blocks from `webflow.css` (or fold the small subset of still-used rules — nav, lightbox, embed — into the main stylesheet and delete `webflow.css` entirely).
- Add `lang="en"` to every page, write real per-page meta descriptions, add descriptive `alt` text to images (at minimum on content-bearing images; decorative images can stay `alt=""` intentionally).
- Resolve the Wizeline/Walmart card mislinking and decide the fate of the orphaned pages (`coming-soon.html`, `demomaps.html`, `playground.html`) — keep, relink, or remove, per the site owner's decision.

**Phase 5 — Testing**
- Cross-browser/device pass on the rebuilt nav, animations, and lightbox against the Phase 1 screenshot baseline.
- Verify every internal link resolves with no JS runtime present at all (JS-disabled smoke test) to confirm the site is genuinely framework-free-safe.
- Validate all image/font references load correctly with fully relative paths from a subdirectory (simulate a non-root deployment) as well as from domain root.

**Phase 6 — Optimization**
- Evaluate trimming the 216 MB `/images` directory (many redundant responsive variants); ensure whatever set remains still services the `srcset` breakpoints in use.
- Add basic Apache caching headers via `.htaccess` for `/images`, `/fonts`, `/css`, `/js`.
- Minify/consolidate the final custom CSS/JS if desired (optional, purely a size optimization, not required for correctness).

**Phase 7 — Packaging & Deployment**
- Add `robots.txt` and `sitemap.xml`.
- Add a custom `404.html` plus `.htaccess` `ErrorDocument 404` rule.
- Add canonical `<link>` tags per page.
- Confirm the whole tree copies cleanly into `public_html` with zero build step, zero `node_modules`, zero server-side requirements — a pure file copy.
- Final smoke test directly against the live Hostinger/GoDaddy environment before DNS cutover.

---

*End of audit. No source files were modified to produce this report.*
