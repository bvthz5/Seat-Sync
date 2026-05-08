import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
      ],
    },
  },
  server: {
    hmr: {
      timeout: 30000,
    },
    allowedHosts: [
      'tucking-oversold-doctrine.ngrok-free.dev',
      'localhost',
      '127.0.0.1',
    ],
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
})