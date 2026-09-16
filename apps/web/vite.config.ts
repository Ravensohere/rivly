import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  envDir: "../../",
  // Strip console/debugger from production bundles. Keeps dev logging intact.
  esbuild: mode === "production" ? { drop: ["console", "debugger"] } : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: [
          "**/three-*.js",
          "**/HeroOrb3D-*.js",
          "**/AdminDashboard-*.js",
          "**/AnalyticsDashboard-*.js",
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: { cacheName: "image-cache", expiration: { maxEntries: 60 } },
          },
        ],
      },
      manifest: {
        name: "Rivly",
        short_name: "Rivly",
        description: "A calm space to plan your day, focus deeply, and rest well.",
        start_url: "/",
        display: "standalone",
        background_color: "#1a1625",
        theme_color: "#5a8f6c",
        icons: [
          // Sizes must match the real files: icon-513.png is actually 500x500.
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "/icon-513.png", sizes: "500x500", type: "image/png", purpose: "any" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/three/') || id.includes('@react-three/')) return 'three';
          if (id.includes('gsap')) return 'gsap';
          if (id.includes('framer-motion')) return 'framer';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('@tanstack')) return 'tanstack';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@capacitor')) return 'capacitor';
          if (id.includes('react-dom') || id.includes('react-router') || /[\\/]react[\\/]/.test(id)) return 'react-vendor';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  }
}));
