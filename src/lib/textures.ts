import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace, Texture } from 'three'

/* ============================================================================
 *  Procedural textures, generated once on a 2D canvas. No image assets, no
 *  network requests, no loading state.
 * ========================================================================== */

let windowTexture: Texture | null = null

/**
 * The emissive map for building walls: a grid of windows, most of them lit at
 * night, a few dark. Used only as an emissive map, so the daytime building is
 * flat matte colour and the windows appear as the sun goes down.
 */
export function getWindowTexture(): Texture {
  if (windowTexture) return windowTexture

  const S = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, S, S)

  const cols = 6
  const rows = 8
  const cw = S / cols
  const rh = S / rows
  const winW = cw * 0.42
  const winH = rh * 0.34

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // A stable pseudo-random so the pattern looks organic but never rerolls.
      const n = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453
      const lit = n - Math.floor(n)
      if (lit < 0.28) continue
      const warmth = 190 + Math.floor((lit - 0.28) * 90)
      ctx.fillStyle = `rgb(255, ${warmth}, ${Math.max(120, warmth - 60)})`
      ctx.fillRect(
        c * cw + (cw - winW) / 2,
        r * rh + (rh - winH) / 2,
        winW,
        winH,
      )
    }
  }

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.needsUpdate = true
  windowTexture = tex
  return tex
}

let foamTexture: Texture | null = null

/** Soft radial falloff used for the shoreline foam rings and the sun glow. */
export function getFalloffTexture(): Texture {
  if (foamTexture) return foamTexture

  const S = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.78, 'rgba(255,255,255,0.28)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, S, S)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  foamTexture = tex
  return tex
}
