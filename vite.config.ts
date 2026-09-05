import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the static build works from any host or subpath
// (GitHub Pages project sites, Netlify, Vercel, or a plain file server).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    // three is one large chunk on purpose: splitting it just adds a round trip
    // before anything can be drawn.
    chunkSizeWarningLimit: 1400,
  },
})
