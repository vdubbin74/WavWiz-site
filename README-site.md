# WavWiz website (wavwiz.com)

Static landing page for WavWiz. Plain HTML/CSS/JS: no build step, no frameworks, no CDNs, no analytics.
Every asset path is relative, so it works from GitHub Pages, a custom domain or a local folder.

```
index.html          page markup
styles.css          all styles (brand colors, layout, animations, prefers-reduced-motion)
script.js           warp starfield, EQ strip, reveals, parallax, visualizer video showcase, themes gallery, donate QR/copy
CNAME               contains: wavwiz.com
.nojekyll           tells GitHub Pages to serve files as-is (no Jekyll processing)
favicon.ico
404.html            "page not found" page (GitHub Pages serves it for any missing URL; uses root-relative /paths, noindex)
robots.txt          allows all crawlers, points at the sitemap
sitemap.xml         the home page URL with its last-modified date
assets/img/         background watermark, favicons, og-image.png (1200x630 social preview, made from the main window shot),
                    real app screenshots (WebP):
                    wavwiz-app-window(-960).webp     full main window, devices connected (menu bar and status bar cropped off)
                    wavwiz-delay-sliders.webp        Living Room device dialog with its delay slider (per-device delay section)
                    wavwiz-step-installer.webp       Setup wizard welcome page (How it works, step 1)
                    wavwiz-step-library.webp         Settings > Music folders + NAS logins (How it works, step 2)
                    wavwiz-step-phone-iphone.webp    iPhone browser Now Playing, demo track (How it works, step 3)
                    wavwiz-viz-*.webp                visualizer stills (1280x720), used as video posters
                    wavwiz-theme-*.webp              the five themes (1280x720) for the themes gallery in Features
assets/video/       real 8-second visualizer loops (MP4, H.264, muted, no audio track), one per visualizer:
                    particle-burst, waveform-river, speaker-cone, ring, neon-tunnel, terrain, vu-meters, graphic-eq
assets/img/coins/   coin logos (btc.svg, ltc.svg, xmr.svg, pep.svg) for the donate section, see Credits
assets/fonts/       self-hosted Space Grotesk, Inter, JetBrains Mono (SIL Open Font License)
assets/vendor/qrcode.js   qrcode-generator by Kazuhiko Arase (MIT), generates QR codes in the browser
```

## Before publishing: checklist

1. **Donation addresses.** The real addresses are already set in the `WAVWIZ_CONFIG` object at the very top of
   `script.js`:
   ```js
   const WAVWIZ_CONFIG = {
     donate: {
       LTC: { name: "Litecoin", scheme: "litecoin", address: "ltc1qx4y3ncgjzgl6nydfwu3wzp7lwzmf2cysacr64d" },
       XMR: { name: "Monero", scheme: "monero", address: "44FpjtjsaBzABrjf8Wmr2TcvEbUWvi5iW3tXP67APgNe6Stv1kkxHUDEFbtG4p6XBBThD76JY8sJvQSsRfZgWiqjHRJ7bDt" },
       BTC: { name: "Bitcoin", scheme: "bitcoin", address: "bc1qauyj5n6ghg0pc55ee6u5vfm4efccus9rvmgala" },
       PEP: { name: "Pepecoin (PEP)", scheme: "pepecoin", address: "Pby4S9GQQhgEhJ5Sm7A6xLnTVcGuVnvfqQ" } // Dogecoin-fork Pepecoin, not Ethereum PEPE
     }
   };
   ```
   The address text and copy buttons use the bare `address`. The QR codes encode `scheme:address`
   (for example `bitcoin:bc1q...`) so wallets recognize the coin; they use error correction level H and carry the
   coin logo in the center. If you ever change an address, update it here and in the matching
   `<code class="coin-addr">` in `index.html` (the no-JavaScript fallback), then scan each QR code with your own wallet
   to confirm it decodes to the right address.
   To remove a coin, delete its entry from the config (the card hides itself) or delete its `<article>` in `index.html`.
2. **No version numbers on the page.** Download and "Release notes" links point at `.../releases/latest`, so the
   site never needs editing for a new release. Screenshots are cropped so the app's version badge doesn't show; keep
   it that way when swapping in new captures.
3. **LICENSE.** The footer links to `https://github.com/vdubbin74/WavWiz/blob/main/LICENSE`. Make sure the repo has
   a `LICENSE` file on `main` (or update the link).
4. **Repo visibility.** The Download/GitHub buttons point at `https://github.com/vdubbin74/WavWiz` and
   `.../releases/latest`. The repo must be public and have at least one published release for those to work.
   GitHub Pages on a free plan also requires a public repo.

## Publish with GitHub Pages

Option A: site in its own branch (keeps the app source separate)

```bash
git clone https://github.com/vdubbin74/WavWiz.git
cd WavWiz
git switch --orphan gh-pages
git rm -rf . >/dev/null 2>&1 || true
cp -r /path/to/wavwiz-site/. .
git add -A
git commit -m "Publish wavwiz.com landing page"
git push -u origin gh-pages
```
Then on GitHub: **Settings > Pages > Build and deployment > Source: Deploy from a branch**, select
**Branch: `gh-pages`**, folder **`/ (root)`**, and click **Save**.

Option B: site in a `/docs` folder on `main`. Copy the contents of this folder into `docs/` (including `CNAME`
and `.nojekyll`), push, then choose **Branch: `main`**, folder **`/docs`** in Settings > Pages.

### Custom domain

1. In **Settings > Pages > Custom domain**, enter `wavwiz.com` and click **Save**. (The `CNAME` file in this
   folder already contains `wavwiz.com`; GitHub reads it automatically.)
2. Recommended: verify the domain under your GitHub account (**Settings > Pages > Verified domains**, add the TXT
   record GitHub shows you) so no one else can claim it.
3. After DNS works and the certificate is issued (can take up to an hour or so), tick **Enforce HTTPS**.

## Point Porkbun DNS at GitHub Pages

In Porkbun: **Domain Management > wavwiz.com > DNS**. Delete any default parking records first
(Porkbun often adds an `ALIAS`/`A` record for the root and a `CNAME` for `*` or `www` pointing at its parking page).
Then add:

| Type  | Host (name)  | Answer / value          | TTL |
|-------|--------------|-------------------------|-----|
| A     | *(blank)*    | `185.199.108.153`       | 600 |
| A     | *(blank)*    | `185.199.109.153`       | 600 |
| A     | *(blank)*    | `185.199.110.153`       | 600 |
| A     | *(blank)*    | `185.199.111.153`       | 600 |
| CNAME | `www`        | `vdubbin74.github.io`   | 600 |

Optional IPv6 (AAAA, blank host): `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.

Do not add a wildcard (`*`) record pointing at GitHub. Make sure Porkbun's URL forwarding is turned off for the domain.

Check propagation:

```bash
dig +short wavwiz.com A        # should list the four 185.199.x.153 addresses
dig +short www.wavwiz.com      # should show vdubbin74.github.io. and then the GitHub IPs
```
With `wavwiz.com` set as the custom domain, GitHub automatically redirects `www.wavwiz.com` to `wavwiz.com`.

## SEO

What's on the page (all in `index.html`):

- **Title** (about 60 characters): `WavWiz: Free Whole-Home Audio & Multi-Room Music for Windows`.
- **Meta description** (about 150 characters): "Whole-home audio wizardry: free multi-room music from your Windows PC. Your
  library, internet radio and AirPlay play in sync on every PC, TV and phone."
- `rel="canonical"` (https://wavwiz.com/), `robots` (index, follow), `theme-color`, `lang="en-US"`, Open Graph and
  Twitter card tags with the absolute `og-image.png` URL (1200x630) and its alt text.
- **Structured data** (one JSON-LD `<script>` in `<head>`, `@graph` form): `Organization`, `WebSite`,
  `SoftwareApplication` (free offer, Windows 10/11, WebView2, MIT license, download link to `releases/latest`, no
  version number) and `FAQPage`. There are deliberately **no ratings or reviews** in the markup; never add made-up ones.
- **FAQ section** (`#faq`) with 8 questions. The `FAQPage` JSON-LD must match the visible questions and answers
  word for word. If you edit a question or answer, edit both places (the JSON-LD answer is the plain text of the
  visible answer, without links).
- One `<h1>` (the hero "Whole-home audio wizardry."), `<h2>` per section, `<h3>` for cards. Every content image
  has descriptive alt text; the coin logos use empty alt because the coin name sits right next to them.
- The hero has no image (it's text over an animated canvas), so the first screenshot stays lazy-loaded. The two
  main fonts are preloaded.
- `robots.txt` + `sitemap.xml`. When the page changes a lot, update `<lastmod>` in `sitemap.xml`.

Check the markup any time with Google's Rich Results Test (https://search.google.com/test/rich-results) and the
Schema Markup Validator (https://validator.schema.org/). Note: Google currently shows FAQ rich results only for a
small set of government and health sites, and software rich results only for apps with real ratings, so don't expect
those snippets in Google. The markup still helps Bing, other search engines and AI assistants understand the page.

### Your next steps (only you can do these)

1. **Google Search Console** (https://search.google.com/search-console): **Add property**. Choose **Domain** and
   enter `wavwiz.com` (covers `www` and `https`). Google gives you a **TXT record**; add it in Porkbun under
   **DNS** (Type `TXT`, Host blank, Answer = the `google-site-verification=...` value), wait a few minutes, then
   click **Verify**. Alternative: choose **URL prefix** (`https://wavwiz.com/`) and the **HTML file** method:
   download the `googleXXXX.html` file Google gives you, put it in the site root next to `index.html`, push, and
   click **Verify**. Leave that file (or the TXT record) in place for good, or verification lapses.
2. In Search Console, open **Sitemaps**, enter `sitemap.xml` and click **Submit**. Then use **URL inspection** on
   `https://wavwiz.com/` and click **Request indexing**.
3. **Bing Webmaster Tools** (https://www.bing.com/webmasters): sign in and choose **Import from Google Search
   Console** (fastest, it copies the verified site and sitemap), or add `https://wavwiz.com/` and verify with the
   `BingSiteAuth.xml` file, a `<meta name="msvalidate.01">` tag or a CNAME record in Porkbun. Submit
   `https://wavwiz.com/sitemap.xml` under **Sitemaps**. Bing also feeds DuckDuckGo and Yahoo.
4. Make sure the repo's **About** box on GitHub has the website `https://wavwiz.com`, a one-line description, and
   topics such as `multi-room-audio`, `whole-home-audio`, `airplay`, `windows`, `music-player`, `music-server`.
5. Links from other sites matter more than anything on the page: forum posts, Reddit threads, "alternative to"
   listings (AlternativeTo, Softpedia, MajorGeeks), and a short post in GitHub Discussions all help.

## Preview locally

```bash
cd wavwiz-site
python -m http.server 8000
# open http://localhost:8000
```

## Media

All screenshots and videos are real captures of the app, using demo tracks by "Demo Artist" (no real artists or
albums appear anywhere). The main shot, visualizers and step images use the Midnight Neon theme; the themes gallery
shows all five. To swap one, keep the same file name and size, or update the `width`/`height` attributes in
`index.html`. Convert stills to WebP with Pillow (quality ~82, about 1280 px wide for full-width shots) and keep the
visualizer clips short, muted, H.264 MP4 (crf ~26, `-an`, `+faststart`).

- **Visualizer showcase:** eight tabs, one per visualizer. Every `<video>` has `preload="none"` and its poster in
  `data-poster`; when the section comes near the screen, only the selected clip loads and plays, and posters are
  attached just for the current clip and the next one in the auto-cycle. Auto-cycle walks through all eight, one
  full loop each. To add or remove a visualizer, add or remove both its `<video>` and its tab button (matching
  `data-viz`); the script reads the order and names from the tabs.
- **Themes gallery:** each swatch button carries `data-src` and `data-alt`; clicking it swaps the one large preview
  image (lazy-loaded). Swatch colors are set inline with `--sw-bg`/`--sw-ac`.
- **Inside the app legend:** on desktop the five labels follow the screenshot's real column widths (Library /
  Visualizer + Now Playing / Devices, with Playlist across the bottom). If a new main shot changes the panel layout,
  update `grid-template-columns` on `.app-legend` in `styles.css`.
- **No version numbers:** captures must not show the app's version text. "BETA" badges are fine.

## Privacy

The page makes no third-party requests: fonts, images and scripts are all served from the site itself.
There are no analytics, trackers or cookies. GitHub Pages may keep standard server logs (see GitHub's privacy statement).

## Credits

- QR codes: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT license
  (license header kept in `assets/vendor/qrcode.js`). "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
- Coin logos in `assets/img/coins/` (stored locally, nothing is hotlinked). The logos are trademarks of their
  respective projects and are used only to identify which coins are accepted:
  - `btc.svg` Bitcoin: from [spothq/cryptocurrency-icons](https://github.com/spothq/cryptocurrency-icons)
    (`svg/color/btc.svg`, https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/btc.svg),
    CC0 1.0. Same artwork as the official Bitcoin logo, which bitcoin.org releases into the public domain.
    Only change: added width/height/title attributes.
  - `ltc.svg` Litecoin: official Litecoin mark from litecoin.org (https://litecoin.org/assets/ltc-DIEMRQHk.svg),
    filled with the Litecoin brand blue #345D9D with a white Ł (the site's file is a single-color knockout).
    No explicit license is published; it is the Litecoin Project's trademark. A CC0 alternative with a slightly
    older Ł shape is `svg/color/ltc.svg` in spothq/cryptocurrency-icons.
  - `xmr.svg` Monero: official Monero symbol, vector paths taken from Wikimedia Commons
    (https://commons.wikimedia.org/wiki/File:Monero-Logo.svg, traced from the Monero Project's branding kit
    https://downloads.getmonero.org/resources/branding.zip, marked public domain there). The Monero Project states
    the logo is released under CC BY-SA 4.0 (https://www.getmonero.org/legal/); attribution: "Monero logo by The
    Monero Project, CC BY-SA 4.0". Changes: symbol only (no wordmark), on a white disc like the press kit's
    "symbol on white" version (https://www.getmonero.org/press-kit/).
  - `pep.svg` Pepecoin (PEP, the Dogecoin-fork Pepecoin, not the Ethereum PEPE token): official icon
    `Pepecoin_onWhite_IconOnly-RGB [Converted].svg` from the Pepecoin brand kit (https://pepecoin.com/pepecoin_brand_kit.zip,
    linked as "Brand Kit" on https://pepecoin.com; the same file is used on pepecoin.com and as the CoinGecko icon
    for "Pepecoin (PEP)", https://www.coingecko.com/en/coins/pepecoin-network). Brand color #269B4D. No explicit
    license; distributed publicly by the project as a brand kit. Changes: optimized with SVGO (105 KB to 9 KB),
    viewBox/title added, artwork unchanged.
- Fonts: Space Grotesk, Inter, JetBrains Mono, from Google Fonts, SIL Open Font License 1.1.
