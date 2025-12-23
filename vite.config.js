import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  publicDir: 'public',
  define: {
    'global': 'globalThis',
    'process.env': {},
    'process.browser': true
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    fs: {
      strict: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'buffer-polyfill': ['buffer'],
          'solana': ['@solana/web3.js', '@solana/spl-token'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom']
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@lib': resolve(__dirname, 'lib'),
      '@sdk': resolve(__dirname, 'sdk/src'),
      'buffer': 'buffer/',
      'stream': 'stream-browserify',
      'process': 'process/browser'
    }
  }
});
