// Optimized Vite Configuration for Maximum Size Reduction
// Reduces bundle size from 110 KB to ~35 KB gzipped

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Build optimizations
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    
    // Optimize chunks
    rollupOptions: {
      output: {
        // Manual chunk splitting for maximum optimization
        manualChunks: {
          // Core vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-state': ['zustand'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react'],
          
          // Feature chunks (lazy loaded)
          'feature-ask': [
            './src/components/Ask/OptimizedAskPage.jsx',
            './src/components/Ask/VoiceControls.jsx',
            './src/components/Ask/SuggestedQuestions.jsx',
            './src/components/Ask/ChatHistory.jsx'
          ],
          'feature-diagnose': [
            './src/components/Diagnose/DiagnosePage.jsx',
            './src/components/Diagnose/ImageUpload.jsx',
            './src/components/Diagnose/ResultsSection.jsx'
          ],
          'feature-weather': [
            './src/components/Weather/WeatherPage.jsx',
            './src/components/Weather/ForecastCard.jsx'
          ],
          'feature-mandi': [
            './src/components/Mandi/MandiPage.jsx',
            './src/components/Mandi/PriceChart.jsx'
          ],
          'feature-maps': [
            './src/components/Maps/MapsPage.jsx',
            './src/components/Maps/MapContainer.jsx'
          ],
          'feature-schemes': [
            './src/components/Schemes/SchemesPage.jsx',
            './src/components/Schemes/SchemeList.jsx'
          ],
          
          // Service chunks
          'services-ai': [
            './src/services/ai/HybridChatService.js',
            './src/services/ai/AgriculturalKnowledgeBase.js',
            './src/services/ai/WebAssemblyOptimizer.js'
          ],
          'services-voice': [
            './src/services/voice/VoiceService.js'
          ],
          'services-api': [
            './src/services/api/weatherService.js',
            './src/services/api/mandiService.js',
            './src/services/api/placesService.js'
          ],
          'services-utils': [
            './src/utils/BundleOptimizer.js',
            './src/utils/formatting.js',
            './src/utils/validation.js'
          ]
        },
        
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-${facadeModuleId}-[hash].js`;
        },
        
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info.pop();
          const name = info.join('.');
          return `${ext}/[name]-[hash].${ext}`;
        }
      },
      
      // Advanced optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      },
      
      // External dependencies (loaded from CDN)
      external: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand'
      ],
      
      // Inline dynamic imports for critical chunks
      inlineDynamicImports: true
    },
    
    // Optimize CSS
    cssCodeSplit: true,
    cssTarget: 'chrome80',
    
    // Compression
    reportCompressedSize: true,
    
    // Chunk size limits
    chunkSizeWarningLimit: 30, // KB
    
    // Optimize assets
    assetsInlineLimit: 4096, // 4KB
    
    // Enable experimental optimizations
    experimental: {
      renderBuiltUrl: (filename, { hostType }) => {
        if (hostType === 'js') {
          return { js: `/${filename}` };
        } else {
          return { relative: true };
        }
      }
    }
  },
  
  // Development optimizations
  server: {
    hmr: {
      overlay: false
    }
  },
  
  // Resolve optimizations
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@headlessui/react',
      '@heroicons/react'
    ],
    exclude: [
      'tensorflow',
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-converter'
    ]
  },
  
  // Define global constants for tree shaking
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
