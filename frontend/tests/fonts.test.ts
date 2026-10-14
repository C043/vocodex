import { describe, it, expect } from "vitest"
import {
  DEFAULT_FONT,
  READER_FONTS,
  readerFontFamily
} from "../src/utils/fonts"

describe("reader fonts", () => {
  it("offer the popular reading fonts", () => {
    expect(READER_FONTS.map(font => font.label)).toEqual([
      "Literata",
      "Merriweather",
      "Lora",
      "Georgia",
      "Inter",
      "Roboto",
      "Open Sans",
      "Atkinson Hyperlegible"
    ])
  })

  it("default to Literata", () => {
    expect(DEFAULT_FONT).toBe("literata")
    expect(readerFontFamily(DEFAULT_FONT)).toMatch(/^"Literata"/)
  })

  it("give each font a fallback of the same style", () => {
    expect(readerFontFamily("lora")).toMatch(/^"Lora".*serif$/)
    expect(readerFontFamily("inter")).toMatch(/^"Inter".*sans-serif$/)
  })

  it("fall back to the default for a missing or unknown font", () => {
    expect(readerFontFamily(undefined)).toBe(readerFontFamily(DEFAULT_FONT))
    expect(readerFontFamily("comic-sans")).toBe(readerFontFamily(DEFAULT_FONT))
  })
})
