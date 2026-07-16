import { fileURLToPath, URL } from "node:url";
import { defineConfig } from 'vitest/config';
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            // Mirrors the "@/*" -> "src/*" mapping in tsconfig.json. tsconfig's
            // `paths` only affects type-checking — Vite's own bundler needs this
            // alias too, or every `@/...` import across the codebase fails to
            // resolve at build/dev time.
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    // Vitest — runs in node environment so no DOM/canvas needed for pure
    // modules. The resolve alias above is inherited automatically.
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        globals: true,
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.svg"],
            manifest: {
                name: "Passport Photo Resizer",
                short_name: "PassportPhoto",
                description: "Resize, crop, and format portrait photos into compliant passport photos. 100% local, no uploads.",
                theme_color: "#1B2430",
                background_color: "#F6F4EF",
                display: "standalone",
                icons: [
                    {
                        src: "icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
            workbox: {
                maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
                globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
                runtimeCaching: [
                    {
                        // Google Fonts stylesheet — small, changes rarely.
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
                        handler: "StaleWhileRevalidate",
                        options: { cacheName: "google-fonts-stylesheets" },
                    },
                    {
                        // Actual font files — cache aggressively, they're immutable.
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-webfonts",
                            expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // MediaPipe WASM runtime + model file — large but immutable per
                        // version; CacheFirst lets the app re-detect faces offline once
                        // a user has loaded it at least once on this device.
                        urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|storage\.googleapis\.com)\//,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "mediapipe-assets",
                            expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 20 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
    ],
    worker: {
        format: "es",
    },
});
