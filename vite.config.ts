import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

const REACT_VENDOR_PACKAGES = /\/node_modules\/(?:react|react-dom|react-router|react-router-dom|scheduler)\//;

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      sourcemap: false,
      minify: "esbuild",
      cssMinify: true,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[hash].js",
          chunkFileNames: "assets/[hash].js",
          assetFileNames: "assets/[hash][extname]",
          manualChunks(id) {
            const normalizedId = id.replaceAll("\\", "/");
            if (!normalizedId.includes("/node_modules/")) return;

            // Keep feature packages such as react-pdf out of the application bootstrap.
            if (REACT_VENDOR_PACKAGES.test(normalizedId)) return "react-vendor";
            if (normalizedId.includes("/node_modules/livekit-client/")) return "livekit-vendor";
          },
        },
      },
    },
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      legalComments: "none",
    },
    server: {
      host: "127.0.0.1",
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {
        ignored: [
          "**/.git/**",
          "**/.data/**",
          "**/.actions-runner/**",
          "**/dist/**",
          "**/test-results/**",
          "**/docs/**",
          "**/tmp*.json"
        ]
      },
    },
  };
});
