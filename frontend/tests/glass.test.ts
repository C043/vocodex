// @vitest-environment node
// Vite's build needs esbuild, which does not run under jsdom
import { describe, it, expect } from "vitest"
import { resolve } from "node:path"
import { build } from "vite"
import type { Rollup } from "vite"

const root = resolve(__dirname, "..")

// The stylesheet as the production build minifies it
const buildCss = async () => {
  const result = (await build({
    root,
    configFile: resolve(root, "vite.config.ts"),
    logLevel: "silent",
    build: {
      write: false,
      rollupOptions: { input: resolve(root, "src/index.css") }
    }
  })) as Rollup.RollupOutput
  const css = result.output.find(file => file.fileName.endsWith(".css"))
  return css && "source" in css ? String(css.source) : ""
}

describe("glass utility", () => {
  // The dev server keeps both declarations, but the build's minifier kept only
  // the last one, the prefixed form that only Safari reads, so the glass bars
  // lost their blur in Chrome and Firefox
  it("keeps the standard backdrop-filter in the production build", async () => {
    const glass = (await buildCss()).match(/\.glass\{[^}]*\}/)?.[0] ?? ""
    expect(glass).toMatch(/(^|[;{])backdrop-filter:blur\(24px\)/)
  }, 60_000)

  it("keeps the prefixed backdrop-filter for older Safari", async () => {
    const glass = (await buildCss()).match(/\.glass\{[^}]*\}/)?.[0] ?? ""
    expect(glass).toMatch(/-webkit-backdrop-filter:blur\(24px\)/)
  }, 60_000)
})
