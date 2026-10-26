import { existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// On GitHub Pages the app is served from /symmetry-accountability/ on the
// github.io address, or from the root on the custom domain named in
// public/CNAME (which Vite copies into dist, where Pages reads it). Local dev
// always stays at the root so `npm run dev` is unaffected.
const customDomain = existsSync('public/CNAME') && readFileSync('public/CNAME', 'utf8').trim() !== ''
export default defineConfig(({ command }) => ({
  base: command === 'build' && !customDomain ? '/symmetry-accountability/' : '/',
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: false,
  },
}))
