import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget =
  process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    hmr:
      mode === 'production'
        ? false
        : {
            host: '10.10.40.220',
            port: 80,
          },
  },
}))
