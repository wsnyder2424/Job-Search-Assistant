/**
 * Inlines the production build into one self-contained HTML file.
 *
 *   npm run build:single   →   dist-single/portfolio-archipelago.html
 *
 * Useful for pasting into a host that only takes a single file, emailing a
 * working copy, or opening straight off disk with no server. Everything ships
 * inline — three.js, React, the shaders, the stylesheet — so the only network
 * request the page makes is for the DM Sans webfont.
 *
 * One caveat: the resume link stays relative. If you use the single file, put
 * resume.pdf next to it or point identity.resumeHref at an absolute URL.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const OUT_DIR = 'dist-single'
const OUT = join(OUT_DIR, 'portfolio-archipelago.html')

let assets
try {
  assets = readdirSync(join(DIST, 'assets'))
} catch {
  console.error('No dist/assets — run `npm run build` first.')
  process.exit(1)
}

const pick = (ext) => {
  const found = assets.filter((f) => f.endsWith(ext))
  if (found.length !== 1) {
    console.error(`Expected exactly one ${ext} in dist/assets, found ${found.length}.`)
    process.exit(1)
  }
  return readFileSync(join(DIST, 'assets', found[0]), 'utf8')
}

const css = pick('.css')
// A literal </script> inside a bundled string would close the tag early; the
// escaped form is equivalent to the JS parser.
const js = pick('.js').replaceAll('</script', String.raw`<\/script`)

// The charset declaration is not optional: the em dashes, the sun and moon
// glyphs on the time slider and the arrows in the panel are all multi-byte,
// and without it the parser falls back to windows-1252 and mangles every one.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Portfolio Archipelago</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<noscript>This portfolio is an interactive 3D archipelago and needs JavaScript.</noscript>
<script type="module">
${js}
</script>
</body>
</html>
`

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT, html, 'utf8')
console.log(`${OUT} — ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`)
