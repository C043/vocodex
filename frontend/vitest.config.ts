import { defineConfig, UserConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/vitest-setup.ts"],
    include: ["**/*.test.{ts,tsx}"]
  }
} as UserConfig)
