import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use different base paths for development and production
  const base = mode === 'production' ? '/debris-simulator-claude-code/' : '/';

  return {
    base,
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
      // Define CESIUM_BASE_URL for Cesium - use base path + cesium/
      CESIUM_BASE_URL: JSON.stringify(base + 'cesium/'),
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
  };
});
