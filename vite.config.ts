import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/cesium/Build/Cesium/Workers/*',
          dest: 'cesium/Workers'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/ThirdParty/*',
          dest: 'cesium/ThirdParty'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Assets/*',
          dest: 'cesium/Assets'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Widgets/*',
          dest: 'cesium/Widgets'
        }
      ]
    })
  ],
  define: {
    // Define CESIUM_BASE_URL for Cesium
    CESIUM_BASE_URL: JSON.stringify('/cesium/'),
  },
  optimizeDeps: {
    include: ['cesium']
  },
  build: {
    rollupOptions: {
      external: [],
    },
    assetsDir: 'assets',
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
