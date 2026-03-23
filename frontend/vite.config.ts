import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/jarvis/',
  plugins: [vue()],
  server: {
    proxy: {
      '/jarvis/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    allowedHosts: ['leongrass.ch', 'www.leongrass.ch', 'jarvis.leongrass.ch'],
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['leongrass.ch', 'www.leongrass.ch', 'jarvis.leongrass.ch', 'localhost'],
  },
})
