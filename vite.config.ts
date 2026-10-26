import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// On GitHub Pages the app is served from /symmetry-accountability/; on Netlify
// (which sets NETLIFY=true at build time) and in local dev it is served from
// the root. VITE_BASE overrides either when set.
const base = process.env.VITE_BASE || (process.env.NETLIFY ? '/' : undefined)
export default defineConfig(({ command }) => ({
  base: base ?? (command === 'build' ? '/symmetry-accountability/' : '/'),
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: false,
  },
}))
