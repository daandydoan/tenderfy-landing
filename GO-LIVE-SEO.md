# Tenderfy — Go-Live SEO Playbook

This static prototype is prepped to replace the production WordPress site at
**tenderfy.org** with **no ranking loss**. The strategy is *match the old slugs*:
every main page keeps the exact URL it has today, so there are no redirects on the
URLs that carry Google's authority.

---

## 1. URL map (prototype file → live URL)

| Prototype file   | Live URL (canonical)         | Notes                    |
|------------------|------------------------------|--------------------------|
| `index.html`     | `https://tenderfy.org/`      | home                     |
| `product.html`   | `/product/`                  | unchanged from prod      |
| `solutions.html` | `/solution/`                 | prod slug is **singular**|
| `pricing.html`   | `/pricing/`                  | unchanged                |
| `about.html`     | `/about-us/`                 | unchanged                |
| `trust.html`     | `/trust-centre/`             | unchanged                |
| `insights.html`  | `/our-insights/`             | unchanged                |
| `ai-policy.html` | `/ai-policy/`                | unchanged                |
| `guides.html`    | `/guides/`                   | new page (no old URL)    |
| `showcase.html`  | `/showcase/`                 | embedded film (noindex)  |
| `article.html`   | — (noindex reader)           | see §5                   |

All `<link rel="canonical">`, `og:url`, and `sitemap.xml` entries already point at
these URLs. **This is the source of truth** — the host just has to *serve* the files
at these paths (see §3).

---

## 2. Staging de-index guard (done)

The github.io staging must never be indexed — a duplicate of tenderfy.org would
split rankings. Because one codebase deploys to both staging and production, we use
a **host-aware** guard rather than a static tag: each page's `<head>` runs

```js
if (location.hostname.indexOf('tenderfy.org') === -1) { /* inject noindex,nofollow */ }
```

- On **tenderfy.org** → nothing happens, page is fully indexable.
- On **daandydoan.github.io** / **localhost** → `noindex,nofollow` is injected.

No file swap at cutover, no risk of shipping a noindex to production. `robots.txt`
stays `Allow: /` for the same reason (it's correct for prod; staging is handled by
the guard). `article.html` also carries a permanent static `noindex` (see §5).

---

## 3. Serving clean slugs (deploy step)

The files are named `*.html`; the live URLs are directory-style slugs. Point the host
at the prototype with these rules. A ready-to-use **`_redirects`** file (Netlify /
Cloudflare Pages) is in the repo root. Equivalents:

**Apache `.htaccess`**
```apache
RewriteEngine On
RewriteRule ^product/?$        product.html    [L]
RewriteRule ^solution/?$       solutions.html  [L]
RewriteRule ^pricing/?$        pricing.html    [L]
RewriteRule ^about-us/?$       about.html      [L]
RewriteRule ^trust-centre/?$   trust.html      [L]
RewriteRule ^our-insights/?$   insights.html   [L]
RewriteRule ^ai-policy/?$      ai-policy.html  [L]
RewriteRule ^guides/?$         guides.html     [L]
# retire .html aliases
RewriteRule ^solutions\.html$  /solution/      [R=301,L]
RewriteRule ^about\.html$      /about-us/      [R=301,L]
RewriteRule ^trust\.html$      /trust-centre/  [R=301,L]
RewriteRule ^insights\.html$   /our-insights/  [R=301,L]
RewriteRule ^(product|pricing|ai-policy|guides)\.html$  /$1/  [R=301,L]
```

**Nginx**
```nginx
location = /product/       { try_files /product.html =404; }
location = /solution/      { try_files /solutions.html =404; }
location = /about-us/      { try_files /about.html =404; }
# …one per slug; then 301 the .html aliases with `return 301 /slug/;`
```

Simplest alternative: rename the files into folders (`solutions.html` →
`solution/index.html`, etc.) and switch internal links + asset paths to root-absolute
(`/styles.css`). Only do this on the final root domain — it breaks GitHub Pages
project hosting, which is why the prototype keeps flat `.html` files and relative paths.

---

## 4. Redirects summary

Because we matched the slugs, **the main marketing pages need no redirects** — their
URLs don't change, they just start serving new content. The only 301s are the `.html`
aliases and a couple of legacy plural paths (all in `_redirects`). No production URL is
orphaned by the migration.

---

## 5. Blog / articles — the SEO-best decision

**Decision: keep the blog on WordPress, served at its existing root URLs.**

Rationale (this is the SEO-optimal path):
- The ~21 posts already rank and already have server-rendered HTML. Leaving them at
  their current URLs preserves **100% of their equity** — no redirect hop, no
  re-crawl-and-reassess, no thin-content risk.
- The prototype's `article.html` is a **JavaScript, hash-URL reader** (`#slug`). That
  is invisible to search engines — shipping it as the canonical blog would delete the
  blog's SEO overnight. So it is marked `noindex` and used only as an on-site reading
  experience; Google keeps indexing the real WordPress articles.

**How to keep the URLs at cutover (best):** route the post slugs to WordPress at the
host/proxy layer — the static site owns `/`, `/product/`, `/solution/`, … and WP owns
the article slugs. Zero redirects, full equity.

**Acceptable fallback (a little more work, tiny loss):** move WP to
`blog.tenderfy.org` and 301 each old post URL to the new one (uncomment the template
line in `_redirects` and generate one line per slug). You keep rankings but pay one
redirect hop.

**Not recommended:** pre-rendering static article HTML on the main domain. It's great
for consolidating authority long-term, but it needs a build step and a careful 1:1
canonical migration — unnecessary risk when the WP articles already rank.

The live `insights.html` feed (`wp-feed.js`) pulls from `WP_API`; keep that pointed at
whichever host serves WP so the on-site list always mirrors the indexable articles.

---

## Still open (not blockers)
- Replace `og-image.svg` with a 1200×630 PNG (some crawlers ignore SVG OG images).
- Add Organization / WebSite JSON-LD structured data.
- Terms & Privacy pages before collecting form data.
