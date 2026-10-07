# WavWiz website (wavwiz.com)

Static landing page for WavWiz. Plain HTML/CSS/JS: no build step, no frameworks, no CDNs, no analytics.
Every asset path is relative, so it works from GitHub Pages, a custom domain or a local folder.

```
index.html          page markup
styles.css          all styles (brand colors, layout, animations, prefers-reduced-motion)
script.js           warp starfield, EQ strip, reveals, parallax, visualizer demo, donate QR/copy
CNAME               contains: wavwiz.com
.nojekyll           tells GitHub Pages to serve files as-is (no Jekyll processing)
favicon.ico
assets/img/         emblem, background watermark, favicons, OG image, visualizer screenshots (+ -thumb versions; not currently shown on the page)
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
2. **Copyright line.** In the footer of `index.html`, replace `© 2026 WavWiz contributors` once the owner name is decided.
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

## Preview locally

```bash
cd wavwiz-site
python -m http.server 8000
# open http://localhost:8000
```

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
