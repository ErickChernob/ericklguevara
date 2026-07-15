# Deployment Guide — ericklguevara.com

This guide covers deploying `public_html_ready/` (or the equivalent
`public_html_ready.zip`) to a traditional Apache-based host — Hostinger,
GoDaddy, cPanel, or any shared/VPS hosting with `public_html` + FTP/File
Manager access. No build step, database, or server-side language is
required; this is a pure static site.

## 0. Before you start

- Confirm your domain (`ericklguevara.com`) is pointed at the hosting
  account you're deploying to. If it isn't yet, do that first and allow
  DNS to propagate before proceeding.
- Confirm the host runs Apache (cPanel-based hosts like Hostinger and
  GoDaddy shared hosting do) — the included `.htaccess` relies on
  `mod_rewrite`, `mod_headers`, `mod_deflate`, and `mod_expires`, all of
  which are enabled by default on virtually all cPanel/Apache shared
  hosting. If any module isn't available, the relevant `.htaccess` block
  is wrapped in `<IfModule>` and will simply be skipped rather than
  causing an error.

## 1. Back up current hosting

Even if `public_html` currently looks empty or unused, back it up before
uploading:

- **cPanel / Hostinger / GoDaddy File Manager**: open File Manager, select
  everything inside `public_html`, and use the built-in "Compress" /
  "Download" option to save a `.zip` copy locally before making changes.
- **FTP**: connect with an FTP client (FileZilla, Cyberduck, etc.) and
  download the entire current contents of `public_html` to a local backup
  folder.
- **cPanel Backup Wizard** (if available): Hostinger and many cPanel
  hosts offer a one-click "Backup" tool under the hosting dashboard that
  creates a full account snapshot — use this if you have any doubt about
  what's currently live.

Keep this backup until you've verified the new site is fully working
(see §6).

## 2. Upload the files

**index.html must end up directly inside `public_html`** — not inside a
subfolder like `public_html/independent-static-site/` or
`public_html/public_html_ready/`. The browser resolves
`https://ericklguevara.com/` to whatever `index.html` sits at the web
root, so nesting it one level too deep will make the whole site 404.

### Option A — File Manager (no FTP client needed)

1. Log in to your host's control panel (Hostinger hPanel, GoDaddy cPanel,
   or generic cPanel) and open **File Manager**.
2. Navigate into `public_html`. If there are old files there from a
   previous version of the site, remove or move them aside now (after
   completing the backup in §1).
3. Upload `public_html_ready.zip` into `public_html` using the File
   Manager's upload button.
4. Once uploaded, right-click the zip file and choose **Extract**.
5. Confirm the extraction placed `index.html`, `css/`, `js/`, `images/`,
   `fonts/`, `.htaccess`, `404.html`, `robots.txt`, and `sitemap.xml`
   **directly inside `public_html`** — not inside an extra
   `public_html_ready` subfolder. If your extractor created that
   subfolder, move all its contents up one level into `public_html`
   itself, then delete the now-empty subfolder.
6. Delete the `.zip` file from `public_html` once extraction is confirmed
   correct (it isn't needed to serve the site, and leaving it there is
   harmless but unnecessary).

### Option B — FTP/SFTP client

1. Connect to your hosting account's FTP/SFTP credentials (found in
   Hostinger hPanel → Files → FTP Accounts, or GoDaddy/cPanel → FTP
   Accounts).
2. Navigate to `public_html` on the remote side.
3. Upload the **contents** of the local `public_html_ready/` folder
   (not the folder itself) directly into `public_html` — select
   everything inside `public_html_ready/` and drag it into the remote
   `public_html` directory, rather than dragging the `public_html_ready`
   folder itself (which would create an unwanted extra nesting level).
4. Make sure hidden files transferred too — `.htaccess` starts with a
   dot and some FTP clients hide dotfiles by default; check your
   client's "show hidden files" setting before and after the transfer.

## 3. Where index.html must be located

```
public_html/
├── index.html          <- must be here, at the root
├── about.html
├── projects.html
├── ... (all other .html pages)
├── css/
├── js/
├── images/
├── fonts/
├── .htaccess
├── 404.html
├── robots.txt
└── sitemap.xml
```

If your hosting account serves multiple domains/subdomains from one
cPanel account, double check `public_html` is the document root actually
mapped to `ericklguevara.com` (some multi-domain setups use
`public_html/domain.com/` instead — check your host's domain settings if
unsure).

## 4. Configure the domain

- If the domain was previously pointed at Webflow's hosting (an
  `A`/`CNAME` record pointing at Webflow's servers, or Webflow-managed
  nameservers), update DNS to point at your new host instead — either by
  changing nameservers to the new host's, or updating the `A` record to
  the new host's IP address (both found in your hosting welcome
  email/dashboard).
- DNS changes can take anywhere from a few minutes to 48 hours to fully
  propagate. You can check propagation status with a tool like
  `whatsmydns.net`.
- If you're only testing before switching DNS, most hosts provide a
  temporary preview URL (e.g. a `*.hostingerapp.com` style link, found in
  the hosting dashboard) that lets you verify the upload before cutting
  over the live domain.

## 5. Verify SSL

- Most cPanel hosts (Hostinger, GoDaddy) auto-issue a free Let's Encrypt
  SSL certificate once the domain resolves to their server — this
  typically happens automatically within a few minutes to a few hours of
  DNS propagating, with no action needed.
- If HTTPS isn't active after DNS has propagated, check the hosting
  dashboard's SSL/TLS section (Hostinger: hPanel → SSL; GoDaddy/cPanel:
  cPanel → SSL/TLS Status) and manually trigger "Run AutoSSL" or
  equivalent if it hasn't issued automatically.
- Once SSL is active, visit `http://ericklguevara.com/` (plain HTTP) and
  confirm it redirects to `https://ericklguevara.com/` — the included
  `.htaccess` forces this redirect, but it only takes effect once a valid
  certificate exists; visiting over HTTP before SSL is issued may show a
  browser warning instead of redirecting cleanly.
- Confirm there's no mixed-content warning in the browser console (padlock
  icon should show fully secure, no "not fully secure" indicator) — this
  project has zero hardcoded `http://` references, so this should pass
  automatically once SSL is active.

## 6. Clear hosting cache

- If your host provides a caching layer (Hostinger's "LiteSpeed Cache" /
  object cache, GoDaddy's built-in CDN, or any cPanel caching plugin),
  clear/purge it after uploading so visitors don't see a stale cached
  version of the old site.
- Hostinger: hPanel → Website → Cache Manager → Purge Now.
- GoDaddy: cPanel → varies by plan; look for "Cache Manager" or contact
  support if using their Managed WordPress-style caching (unlikely to
  apply to a plain static site, but check if present).
- Also do a hard-refresh in your own browser (Ctrl/Cmd+Shift+R) when
  testing, since your browser's local cache can also show a stale page
  independent of any server-side cache.

## 7. Test the site after deployment

Work through this checklist on the live domain:

- [ ] `https://ericklguevara.com/` loads (home page, not a 404 or
      directory listing).
- [ ] `http://ericklguevara.com/` (no `www`, no `https`) redirects to
      `https://ericklguevara.com/`.
- [ ] `https://www.ericklguevara.com/` redirects to
      `https://ericklguevara.com/` (non-www).
- [ ] Every nav link (Home, About, Projects, Contact) works.
- [ ] The mobile hamburger menu opens/closes correctly on a real phone or
      narrow browser window.
- [ ] At least one case-study page's image lightbox opens, navigates
      (arrows), and closes (X, click-outside, and Escape key).
- [ ] Fonts render as Montserrat (not a fallback system font) — open
      DevTools → Network and confirm `fonts.googleapis.com` requests
      succeed (this couldn't be verified from the environment this
      package was built in — see `FINAL_QA_REPORT.md`).
- [ ] The Spline 3D embeds on the home, about, and contact pages load.
- [ ] Visiting a nonexistent URL (e.g.
      `https://ericklguevara.com/does-not-exist`) shows the custom
      `404.html` page, not the host's generic error page.
- [ ] View page source on a couple of pages and confirm the Open Graph
      image (`og:image`) and favicon load as local `images/...` paths,
      not a broken image icon.
- [ ] Check the browser console for any errors on at least the home page
      and one case-study page.

## 8. Roll back if necessary

If something goes wrong after deployment:

1. In File Manager or via FTP, delete everything you uploaded to
   `public_html` in step 2.
2. Re-upload the backup you made in step 1 (the `.zip` you downloaded, or
   the FTP-downloaded copy) back into `public_html`.
3. If you changed DNS/nameservers in step 4 and need to revert to
   Webflow hosting, change the DNS records back to whatever Webflow's
   hosting documentation specifies (or restore the nameservers/records
   you noted down before making the change in step 4 — **note down the
   original DNS records before changing anything**, precisely so this
   rollback step is possible).
4. If SSL was reissued for the new host, note that reverting DNS may
   temporarily show a certificate mismatch warning until the old host's
   certificate (or a new one) is reassociated with the domain — this
   typically resolves itself within a few minutes to hours after DNS
   points back.

Because this is a static site with no database, rollback is purely a
matter of file restoration and DNS — there's no data migration risk.
