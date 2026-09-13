/*
 * Export a static slide to a flat SVG for Figma.
 *
 *   node tools/slide-to-svg.mjs
 *
 * Walks the rendered DOM and emits one <rect> per painted box, so the SVG
 * matches the page exactly rather than being redrawn by hand. Each surface
 * becomes a named <g> with a clipPath standing in for CSS overflow:hidden,
 * which is what Figma turns into a frame with "clip content" on.
 *
 * Shadows are deliberately not emitted: SVG filters import badly into Figma
 * and can force a group to rasterise. Apply a drop shadow to the nine frames
 * in Figma instead — everything here stays editable vector.
 *
 * Requires the Playwright install at /opt/pw-browsers.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';

const b = await chromium.launch();
const p = await b.newPage({ viewport:{ width:1600, height:900 } });
await p.goto('file:///home/user/Job-Search-Assistant/presentation/05-settings-surfaces.html');
await p.waitForTimeout(400);

const shapes = await p.evaluate(() => {
  const stage = document.getElementById('stage');
  const base = stage.getBoundingClientRect();
  const out = [];

  const rgba = str => {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r,g,bl,a] = m[1].split(',').map(v => parseFloat(v.trim()));
    if (a === 0) return null;
    const hex = '#' + [r,g,bl].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
    return { hex, alpha: a === undefined ? 1 : a };
  };

  // which surface (if any) an element belongs to, for grouping
  const walk = (node, group) => {
    for (const el of node.children) {
      const cs = getComputedStyle(el);
      const r  = el.getBoundingClientRect();
      const isScreen = el.classList.contains('screen');
      const g = isScreen ? { name: el.dataset.name || ('surface-' + (out.filter(s=>s.newGroup).length + 1)), items: [] } : group;
      if (isScreen) out.push({ newGroup: true, name: g.name });

      const fill   = rgba(cs.backgroundColor);
      const bw     = parseFloat(cs.borderTopWidth) || 0;
      const stroke = bw > 0 && cs.borderTopStyle === 'solid' ? rgba(cs.borderTopColor) : null;
      // right-only borders (the nav rail divider) are their own thin rect
      const rw     = parseFloat(cs.borderRightWidth) || 0;
      const bbw    = parseFloat(cs.borderBottomWidth) || 0;

      if (fill || stroke){
        let rx = parseFloat(cs.borderTopLeftRadius) || 0;
        if (cs.borderTopLeftRadius.includes('%')) rx = r.height / 2;
        rx = Math.min(rx, r.width/2, r.height/2);
        out.push({
          x: +(r.left - base.left).toFixed(2), y: +(r.top - base.top).toFixed(2),
          w: +r.width.toFixed(2), h: +r.height.toFixed(2), rx: +rx.toFixed(2),
          fill, stroke, sw: bw,
        });
      } else if (rw > 0 || bbw > 0){
        const c = rgba(rw > 0 ? cs.borderRightColor : cs.borderBottomColor);
        if (c) out.push({
          x: +((rw > 0 ? r.right - rw : r.left) - base.left).toFixed(2),
          y: +((rw > 0 ? r.top : r.bottom - bbw) - base.top).toFixed(2),
          w: +(rw > 0 ? rw : r.width).toFixed(2),
          h: +(rw > 0 ? r.height : bbw).toFixed(2),
          rx: 0, fill: c, stroke: null, sw: 0,
        });
      }
      walk(el, g);
    }
  };
  walk(stage, null);
  return out;
});

await b.close();

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">\n`;
svg += `  <rect width="1600" height="900" fill="#FDFDFC" id="background"/>\n`;

let open = false, n = 0, pendingGroup = null;
const defs = [];
const body = [];
let buf = null;

for (const s of shapes){
  if (s.newGroup){
    if (open){ body.push(buf.join('')); body.push(`  </g>\n`); }
    n += 1;
    pendingGroup = s.name || ('surface-' + n);
    buf = [];
    open = true;
    continue;
  }
  if (pendingGroup){
    // the first shape of a group is the card itself — it defines the clip
    defs.push(`    <clipPath id="clip-${n}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx}"/></clipPath>\n`);
    body.push(`  <g id="${pendingGroup}" clip-path="url(#clip-${n})">\n`);
    pendingGroup = null;
  }
  const attrs = [
    `x="${s.x}"`, `y="${s.y}"`, `width="${s.w}"`, `height="${s.h}"`,
    s.rx ? `rx="${s.rx}"` : null,
    s.fill ? `fill="${s.fill.hex}"` : `fill="none"`,
    s.fill && s.fill.alpha < 1 ? `fill-opacity="${s.fill.alpha}"` : null,
    s.stroke ? `stroke="${s.stroke.hex}"` : null,
    s.stroke ? `stroke-width="${s.sw}"` : null,
  ].filter(Boolean).join(' ');
  buf.push(`    <rect ${attrs}/>\n`);
}
if (open){ body.push(buf.join('')); body.push(`  </g>\n`); }
svg += `  <defs>\n${defs.join('')}  </defs>\n`;
svg += body.join('');
svg += `</svg>\n`;

writeFileSync('/home/user/Job-Search-Assistant/presentation/assets/settings-surfaces.svg', svg);
console.log('shapes:', shapes.filter(s=>!s.newGroup).length, '| groups:', n, '| bytes:', svg.length);
