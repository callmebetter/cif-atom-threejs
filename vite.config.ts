import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
  ],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // Enable built-in linting during build
    rollupOptions: {
     
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    // port: 3000,
    strictPort: false,
    open: true,
    // host: true,
    // Enable HMR with linting
    hmr: {
      overlay: true
    }
  }
})