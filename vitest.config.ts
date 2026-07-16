import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts because this Vitest release uses its own
// Vite type dependency. Production Vite plugins must not be typed against it.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
