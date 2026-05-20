import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Permite imports como: import api from '@/services/api'
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    // Proxy para evitar CORS en desarrollo — redirige /api al backend FastAPI
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
