import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

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
            if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
              return "react-vendor";
            }
            if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run/router")) {
              return "router-vendor";
            }
            if (id.includes("node_modules/livekit-client") || id.includes("node_modules/@livekit")) {
              return "livekit-vendor";
            }
            if (id.includes("node_modules/@paypal")) {
              return "paypal-vendor";
            }
            if (id.includes("node_modules/socket.io-client")) {
              return "socket-vendor";
            }
            if (id.includes("node_modules/motion") || id.includes("node_modules/framer-motion")) {
              return "motion-vendor";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "icons-vendor";
            }
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
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
