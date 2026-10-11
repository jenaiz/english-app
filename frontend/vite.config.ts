import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Polling makes file watching reliable on Docker bind mounts.
    watch: process.env.VITE_USE_POLLING ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:8080', changeOrigin: true },
    },
  },
})
