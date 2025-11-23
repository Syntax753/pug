import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_URL || './',
    plugins: [react()],
    css: {
      modules: {
        scopeBehaviour: 'local',
      }
    },
    server: { port: 3000 },
    resolve: {
      alias: { 
        '@': '/src',
        // Provide browser polyfills for Node.js modules
        'os': path.resolve(__dirname, 'src/polyfills/os-browser.js'),
        'process': path.resolve(__dirname, 'src/polyfills/process-browser.js')
      }
    },
    build: { 
      sourcemap: true, 
      manifest: true
    },
    optimizeDeps: {
      esbuildOptions: {
        // Define global variables for Node.js polyfills
        define: {
          global: 'globalThis'
        }
      }
    },
    test: {
      environment: 'node',
      globals: true
    }
  };
});
