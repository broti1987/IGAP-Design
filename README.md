# IGAP home — clean rebuild

Static, hand-coded rebuild of the Webflow wireframe "Home v2". No framework,
no build step for anything except the hero animation bundle.

## Running it

Open `index.html` directly, or serve the folder:

    python3 -m http.server 8000

Both work. Everything but the web fonts is local — the page needs no network.

## Files

    index.html                  markup
    css/style.css               all layout, type and colour (tokens on :root)
    css/_embed-fragments.css    the four Webflow code-embed stylesheets, verbatim
    js/site.js                  menu overlay + scroll reveals
    js/text-reveal.js           letter-by-letter heading reveal (data-reveal)
    js/scramble-hover.js        scramble-on-hover for small caps labels
    js/hero-scene.js            Three.js hero — SOURCE, an ES module
    js/hero-scene.bundle.js     Three.js hero — BUILT, what index.html loads
    vendor/three/               Three.js 0.160.0 + the Line2 addons
    images/                     assets from the Webflow export

## The hero animation

`js/hero-scene.js` is an ES module that imports `three`. Browsers refuse to load
ES modules from `file://` URLs, so a page that used it directly would show no
animation until it was served over http. To avoid that, `index.html` loads
`js/hero-scene.bundle.js`: Three.js and the scene compiled into one classic
script.

Edit `js/hero-scene.js`, then rebuild:

    ./build.sh

**Use the script, not a bare esbuild call.** `hero-scene.js` imports the bare
specifier `three`, which the page resolves through the importmap in
`index.html`. esbuild does not read importmaps and there is no `node_modules`,
so a plain

    npx esbuild js/hero-scene.js --bundle ...        # DOES NOT WORK

fails with `Could not resolve "three"` **and leaves the old bundle in place** —
the page goes on running the previous build, so an edit looks like it did
nothing. `build.sh` passes the `--alias:` flags that point `three` and the five
Line2 addons at `vendor/three/`.

After building, sanity-check that the bundle actually changed (`md5 js/hero-scene.bundle.js`)
before concluding an edit had no effect.

To develop against the unbundled module instead, swap the two script tags at the
bottom of `index.html` — the importmap in `<head>` already points at
`vendor/three/`. Remember the page then has to be served over http.
