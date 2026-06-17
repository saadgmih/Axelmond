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
            if (id.includes("node_modules")) {
              if (id.includes("livekit-client")) return "livekit-vendor";
              if (id.includes("@paypal")) return "paypal-vendor";
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
                return "react-vendor";
              }
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
