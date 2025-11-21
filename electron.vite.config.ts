import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert } from 'node:console'
import fs from 'node:fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

assert(fs.existsSync(resolve(__dirname, 'electron/main.ts')), 'Electron main process entry not found')
assert(fs.existsSync(resolve(__dirname, 'electron/preload.ts')), 'Electron preload script entry not found')
assert(fs.existsSync(resolve(__dirname, 'index.html')), 'Renderer process entry (index.html) not found')

// If any of the above assertions fail, exit the process
if (
  !fs.existsSync(resolve(__dirname, 'electron/main.ts')) ||
  !fs.existsSync(resolve(__dirname, 'electron/preload.ts')) ||
  !fs.existsSync(resolve(__dirname, 'index.html'))
) {
  console.error('One or more required files are missing.')
  process.exit(1)
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        },
        output: {
          entryFileNames: '[name].js',
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    root: __dirname,
    publicDir: resolve(__dirname, 'src/public'),
    base: './', // Ensure assets are loaded with relative paths
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    server: {
      port: 5576,
      host: '0.0.0.0',
      strictPort: false,
      // host: true,
      // Enable HMR with linting
      hmr: {
        overlay: true
      }
    }
  }
})