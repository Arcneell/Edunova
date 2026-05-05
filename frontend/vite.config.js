import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
