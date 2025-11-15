import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000, // Use a different default port
    strictPort: false, // Allow port to be automatically changed if occupied
    host: true // Expose to network
  }
})