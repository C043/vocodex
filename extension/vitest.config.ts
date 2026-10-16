import { defineConfig } from "vitest/config"
import { WxtVitest } from "wxt/testing/vitest-plugin"

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/vitest-setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"]
  }
})
