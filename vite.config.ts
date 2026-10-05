import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En GitHub Pages la app vive en /tablero/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/tablero/' : '/',
  plugins: [react()],
})
