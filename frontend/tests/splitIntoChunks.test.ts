import { describe, it, expect } from "vitest"
import { splitIntoChunks, toSpeech } from "../src/utils/splitIntoChunks"

describe("splitIntoChunks", () => {
  it("groups sentences into chunks no longer than maxChars", () => {
    const chunks = splitIntoChunks("One. Two. Three.", 10)

    expect(chunks.map(c => c.text)).toEqual(["One. Two.", "Three."])
  })

  it("keeps the whole content when it has no punctuation", () => {
    expect(splitIntoChunks("no punctuation here")).toEqual([
      { text: "no punctuation here", paragraphStart: false }
    ])
  })

  it("marks chunks that open a new paragraph", () => {
    const chunks = splitIntoChunks(
      "First paragraph is here.\n\nSecond paragraph. Still second.",
      26
    )

    expect(chunks).toEqual([
      { text: "First paragraph is here.", paragraphStart: false },
      { text: "Second paragraph.", paragraphStart: true },
      { text: "Still second.", paragraphStart: false }
    ])
  })

  it("never marks the first chunk as a paragraph start", () => {
    const chunks = splitIntoChunks("\n\nLeading break. Then text.")

    expect(chunks[0].paragraphStart).toBe(false)
  })

  it.each([
    ['He said "it is a gift." My turn.', ['He said "it is a gift."', "My turn."]],
    ["Books, films, etc.) We went.", ["Books, films, etc.)", "We went."]],
    ["I hear everything ...and then I stop.", ["I hear everything ...and then I stop."]],
    ["See www.aspie.com for more.", ["See www.aspie.com for more."]],
    ["It costs 3.5 euros. Cheap.", ["It costs 3.5 euros.", "Cheap."]]
  ])("keeps the text around periods not followed by a space: %s", (content, expected) => {
    const chunks = splitIntoChunks(content, 25)

    expect(chunks.map(c => c.text)).toEqual(expected)
  })

  it("drops empty chunks made only of whitespace", () => {
    const chunks = splitIntoChunks("Hello.   \n\n   ", 6)

    expect(chunks).toEqual([{ text: "Hello.", paragraphStart: false }])
  })

  it.each([
    ["A self-\nhosted app.", "A self-\u00adhosted app."],
    ["A docu-\n  ment here.", "A docu-\u00ad\u00ad\u00adment here."],
    ["A self\u2010\r\nhosted app.", "A self\u2010\u00ad\u00adhosted app."],
    ["A docu\u00ad\nment here.", "A docu\u00ad\u00adment here."]
  ])("keeps a word broken over two lines by a hyphen whole: %j", (content, expected) => {
    expect(splitIntoChunks(content).map(c => c.text)).toEqual([expected])
  })

  it.each([
    "Pre- and post-war.",
    "A list -\nnot a word.",
    "Ends with a dash-\n\n- Next item."
  ])("leaves hyphens that do not break a word alone: %j", content => {
    expect(splitIntoChunks(content).map(c => c.text)).toEqual([content])
  })
})

describe("toSpeech", () => {
  it.each([
    ["A self-­hosted app.", "A selfhosted app."],
    ["A docu-­­­ment here.", "A document here."],
    ["A self‐­­hosted app.", "A selfhosted app."],
    ["A docu­­ment here.", "A document here."]
  ])("reads a word broken over two lines without its hyphen: %j", (text, expected) => {
    expect(toSpeech(text)).toBe(expected)
  })

  it.each(["Pre- and post-war.", "A well-known self-hosted app."])(
    "leaves other hyphens alone: %j",
    text => {
      expect(toSpeech(text)).toBe(text)
    }
  )
})
