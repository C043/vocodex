import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(__dirname, "..")
const SKIPPED = new Set(["node_modules", ".output", ".wxt", "public"])

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return SKIPPED.has(name) ? [] : sources(path)
    return /\.(ts|tsx|css|html|json)$/.test(name) && name !== "package-lock.json" ? [path] : []
  })

// The extension builds on its own: nothing outside of its folder
describe("the extension", () => {
  it("uses no file of the web app", () => {
    const outside = sources(root).filter(path => {
      if (path === __filename) return false
      const text = readFileSync(path, "utf8")
      return /@vocodex\/|(\.\.\/)+frontend\b/.test(text)
    })
    expect(outside.map(path => relative(root, path))).toEqual([])
  })
})
