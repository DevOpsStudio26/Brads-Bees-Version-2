import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // In development, /api goes to the Cloudflare Worker (npm run worker, port 8787),
  // which sends form emails and runs the admin page. To use the Railway email
  // server instead (npm run server), put API_TARGET=http://localhost:3001 in .env.
  const { API_TARGET = 'http://localhost:8787' } = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: { '/api': API_TARGET },
    },
  }
})
