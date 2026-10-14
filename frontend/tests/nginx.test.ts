import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const conf = readFileSync(resolve(__dirname, "..", "nginx.conf"), "utf8")

describe("nginx.conf", () => {
  // The PDF.js worker ships as .mjs, which nginx's stock mime.types does not
  // know; served as application/octet-stream with nosniff, browsers refuse to
  // start the module worker and no PDF ever opens
  it("serves .mjs files as JavaScript", () => {
    expect(conf).toMatch(/types\s*\{[^}]*application\/javascript\s+mjs\s*;/)
  })

  it("keeps the stock MIME types alongside the .mjs mapping", () => {
    expect(conf).toMatch(/include\s+\/etc\/nginx\/mime\.types\s*;/)
  })
})
