import { describe, it, expect } from "vitest"
import { alignBoundaries, wordAt } from "../src/utils/wordTiming"

describe("wordAt", () => {
  const starts = [0.1, 0.5, 1.0]

  it("shows the first word before the voice reaches it", () => {
    expect(wordAt(starts, 0)).toBe(0)
  })

  it("follows the word being spoken", () => {
    expect(wordAt(starts, 0.1)).toBe(0)
    expect(wordAt(starts, 0.7)).toBe(1)
    expect(wordAt(starts, 1.2)).toBe(2)
  })

  // The voice pauses between words and on punctuation
  it("keeps the last word in the pause before the next one", () => {
    expect(wordAt(starts, 0.49)).toBe(0)
  })

  it("keeps the last word once the voice is done", () => {
    expect(wordAt(starts, 99)).toBe(2)
  })

  it("has no word without timings", () => {
    expect(wordAt([], 0.3)).toBe(-1)
  })
})

describe("alignBoundaries", () => {
  const b = (...texts: string[]) =>
    texts.map((text, i) => ({ text, start: i, end: i + 0.5 }))

  it("maps each spoken word to the word of the text", () => {
    expect(alignBoundaries("Hello brave world.", b("Hello", "brave", "world")))
      .toEqual([0, 1, 2])
  })

  it("counts words without ASCII letters, like Italian è", () => {
    expect(
      alignBoundaries("La città è bella", b("La", "città", "è", "bella"))
    ).toEqual([0, 1, 2, 3])
  })

  it("skips punctuation the voice does not say", () => {
    expect(alignBoundaries("Hi — it's me", b("Hi", "it's", "me"))).toEqual([
      0, 1, 2
    ])
  })

  it("keeps words the voice says in parts on the same word", () => {
    expect(
      alignBoundaries("A well-known fact", b("A", "well", "known", "fact"))
    ).toEqual([0, 1, 1, 2])
  })

  it("matches regardless of case", () => {
    expect(alignBoundaries("NASA rocks", b("nasa", "rocks"))).toEqual([0, 1])
  })

  it("moves on to the next word when a spoken word is not in the text", () => {
    expect(
      alignBoundaries("It costs 5 dollars", b("It", "costs", "five", "dollars"))
    ).toEqual([0, 1, 2, 3])
  })
})
