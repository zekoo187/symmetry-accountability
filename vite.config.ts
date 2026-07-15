import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// In production (GitHub Pages) the app is served from /symmetry-accountability/.
// In local dev it stays at the root so `npm run dev` is unaffected.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/symmetry-accountability/' : '/',
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: false,
  },
}))
