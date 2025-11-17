import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(import.meta.url)

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'lint-on-build',
      buildStart() {
        // Run oxlint during build
        const { execSync } = require('child_process')
        try {
          execSync('npx oxlint --config oxlint.config.json', { stdio: 'inherit' })
        } catch (error) {
          console.error('Linting failed:', error.message)
          // Don't fail the build, just warn
        }
      }
    }
  ],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // Enable built-in linting during build
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress some warnings during build
        if (warning.code === 'THIS_IS_UNDEFINED') return
        warn(warning)
      }
    }
  },
  optimizeDeps: {
    // Disable dependency optimization
    disabled: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    // Enable HMR with linting
    hmr: {
      overlay: true
    }
  }
})