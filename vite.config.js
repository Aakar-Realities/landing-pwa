import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "images/favicon.ico",
        "images/apple-touch-icon-180x180.png",
        "images/aakar-realities-logo.png",
      ],
      manifest: {
        id: "/",
        name: "Aakar Realities",
        short_name: "Aakar",
        description:
          "Aakar Realities business tools — inventory, invoice comparison, task management, research, cashflow, and more.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#f7f9fc",
        theme_color: "#f7f9fc",
        icons: [
          { src: "images/pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "images/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "images/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "images/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
});
