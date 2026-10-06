import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetUrl = env.VITE_API_URL || 'http://localhost:5000';
  const serverPort = Number(env.VITE_PORT) || 5173;
  const serverHost = env.VITE_HOST === 'true' ? true : (env.VITE_HOST === 'false' ? false : (env.VITE_HOST || true));
  const allowedHostsConfig = env.VITE_ALLOWED_HOSTS
    ? (env.VITE_ALLOWED_HOSTS === 'true' ? true : env.VITE_ALLOWED_HOSTS.split(',').map((h: string) => h.trim()).filter(Boolean))
    : true;

  return {
  base: './',
  plugins: [
    react(),
    nodePolyfills({
      include: ['stream', 'fs', 'path', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
      ],
    },
  },
  server: {
    port: serverPort,
    host: serverHost,
    allowedHosts: allowedHostsConfig,
    hmr: {
      timeout: 30000,
    },
    proxy: {
      '/api': {
        target: targetUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          let lastRefusalLoggedAt = 0;
          proxy.on('error', (err, req, res) => {
            const time = new Date().toLocaleTimeString();
            const code = (err as any).code || '';
            const isRefused = code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED');
            
            if (isRefused) {
              const now = Date.now();
              // Log refusal warning at most once every 15 seconds to prevent spamming
              if (now - lastRefusalLoggedAt > 15000) {
                console.log(
                  `\x1b[90m[${time}]\x1b[0m \x1b[36m[vite:proxy]\x1b[0m \x1b[33mWARN\x1b[0m Backend offline at \x1b[36m${targetUrl}\x1b[0m (ECONNREFUSED) [Throttled]`
                );
                lastRefusalLoggedAt = now;
              }
              if ('writeHead' in res) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend server is offline (ECONNREFUSED)' }));
              }
            } else {
              console.log(
                `\x1b[90m[${time}]\x1b[0m \x1b[36m[vite:proxy]\x1b[0m \x1b[31mERROR\x1b[0m Proxy error: ${err.message}`
              );
              if ('writeHead' in res) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
              }
            }
          });
        }
      },
    },
  },
  build: {
    // heroui (~620KB), pdf-vendor (~624KB) are inherently large third-party libs
    // that cannot be split further. Raise the limit to suppress false positives.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── React core ──────────────────────────────────────────
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // ── Routing ─────────────────────────────────────────────
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'router-vendor';
          }
          // ── HeroUI ──────────────────────────────────────────────
          if (id.includes('node_modules/@heroui') || id.includes('node_modules/@nextui')) {
            return 'heroui-vendor';
          }
          // ── Framer Motion ───────────────────────────────────────
          if (id.includes('node_modules/framer-motion')) {
            return 'motion-vendor';
          }
          // ── Recharts ────────────────────────────────────────────
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) {
            return 'charts-vendor';
          }
          // ── Socket.io ───────────────────────────────────────────
          if (id.includes('node_modules/socket.io-client') || id.includes('node_modules/engine.io-client')) {
            return 'socket-vendor';
          }
          // ── PDF / Canvas (lazily used) ───────────────────────────
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf-vendor';
          }
          // ── XLSX (lazily imported everywhere via dynamic import) ──
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-vendor';
          }
          // ── Lucide icons ─────────────────────────────────────────
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
        },
      },
    },
  },
  };
});