import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/demo': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
    },
  },
})
