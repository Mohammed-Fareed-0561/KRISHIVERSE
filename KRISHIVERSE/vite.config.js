import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  const base = process.env.VITE_BASE_PATH || '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        devOptions: { enabled: isDev },
        manifest: {
          id: base,
          name: 'KrishiVerse',
          short_name: 'KrishiVerse',
          description: 'Offline-first agricultural advisory for farmers in South India',
          lang: 'en',
          dir: 'ltr',
          theme_color: '#22C55E',
          background_color: '#FFFFFF',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'portrait',
          scope: base,
          start_url: base,
          categories: ['agriculture', 'productivity', 'education'],
          shortcuts: [
            {
              name: 'Ask KrishiVerse AI',
              short_name: 'Ask AI',
              url: `${base}ask`,
            },
            {
              name: 'Weather Forecast',
              short_name: 'Weather',
              url: `${base}weather`,
            },
            {
              name: 'Mandi Prices',
              short_name: 'Prices',
              url: `${base}prices`,
            },
          ],
          icons: [
            {
              src: 'icons/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512-maskable.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          importScripts: ['custom-sw.js'],
          navigateFallback: `${base}index.html`,
          maximumFileSizeToCacheInBytes: 45 * 1024 * 1024, // allow 16MB ONNX + 13MB wasm precache
          globPatterns: [
            '**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,woff2,wasm,onnx,json,mjs}',
          ],
          globIgnores: [
            // WebGPU/JSEP ORT build (26.8MB wasm) + its JS glue: not precached,
            // not fetched on demand either — the classifier uses the wasm-only
            // build (plain ort-wasm-simd-threaded.mjs, 24KB) which IS precached.
            // The JSEP path is unnecessary because the classifier explicitly
            // requests executionProviders: ["wasm"] (plain CPU, no WebGPU EP).
            'onnx/ort-wasm-simd-threaded.jsep.*',
            // Vite also emits a byte-duplicate of the plain wasm into assets/
            // (pulled in by the onnxruntime-web/wasm ESM wrapper). At runtime
            // ort.env.wasm.wasmPaths redirects ALL wasm/glue loads to /onnx/
            // (proven by offline QA: only /onnx/*.mjs+*.wasm are ever fetched),
            // so the assets/ copy is dead weight — keep it out of the precache.
            'assets/ort-wasm-simd-threaded-*.wasm',
          ],
          runtimeCaching: [
            // Cache ONNX model + runtime wasm for offline on-device inference
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/models/') ||
                url.pathname.includes('/onnx/') ||
                url.pathname.includes('ort-wasm-simd-threaded'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'ondevice-models',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://api.openweathermap.org',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'weather-api',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            // ── Cache OSM map tiles for offline map use ──────────────────────
            {
              urlPattern: ({ url }) =>
                url.hostname.endsWith('.tile.openstreetmap.org'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.hostname.includes('overpass-api.de') ||
                url.hostname.includes('overpass.kumi.systems'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'overpass-data',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 2, // 2 hours
                },
                cacheableResponse: { statuses: [0, 200] },
                backgroundSync: {
                  name: 'overpass-syncQueue',
                  options: {
                    maxRetentionTime: 24 * 60, // Retry for up to 24 hours
                  },
                },
              },
            },
            // Background sync for image requests
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: true,
      // Phone testing goes through Cloudflare quick tunnels, whose
      // *.trycloudflare.com hostname is random on every run — so the
      // allow-list cannot name it in advance. `true` accepts any Host
      // (localhost automation keeps working; preview is a local static
      // server, never a production host).
      allowedHosts: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id) return;
            if (id.includes('onnxruntime-web') || id.includes('@xenova/transformers') || id.includes('worker-ohYn2n')) {
              return 'ai-worker';
            }
            if (id.includes('@mlc-ai/web-llm') || id.includes('mlc-ai')) {
              return 'llm-vendor';
            }
            if (id.includes('massive_dataset.json') || id.includes('seedingService') || id.includes('IndexedDBChatbotEngine') || id.includes('AgriculturalNLP')) {
              return 'offline-ai';
            }
            if (id.includes('node_modules')) {
              if (id.includes('react-router')) return 'router-vendor';
              if (id.includes('@phosphor-icons') || id.includes('@tabler/icons-react') || id.includes('lucide-react')) return 'icons-vendor';
              if (id.includes('framer-motion')) return 'motion-vendor';
              if (id.includes('i18next')) return 'i18n-vendor';
              if (id.includes('axios') || id.includes('uuid') || id.includes('zustand') || id.includes('idb')) return 'data-vendor';
              if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps';
            if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) return 'charts';
          }
        }
      }
    },
  }
})
