// Fonts the reader can be set in; keys match the backend's ReaderFont
export type ReaderFont = {
  key: string
  label: string
  family: string
}

const SERIF = "ui-serif, Georgia, serif"
const SANS = "ui-sans-serif, system-ui, sans-serif"

export const READER_FONTS: ReaderFont[] = [
  { key: "literata", label: "Literata", family: `"Literata", ${SERIF}` },
  {
    key: "merriweather",
    label: "Merriweather",
    family: `"Merriweather", ${SERIF}`
  },
  { key: "lora", label: "Lora", family: `"Lora", ${SERIF}` },
  { key: "georgia", label: "Georgia", family: `"Georgia", ${SERIF}` },
  { key: "inter", label: "Inter", family: `"Inter", ${SANS}` },
  { key: "roboto", label: "Roboto", family: `"Roboto", ${SANS}` },
  { key: "open-sans", label: "Open Sans", family: `"Open Sans", ${SANS}` },
  {
    key: "atkinson",
    label: "Atkinson Hyperlegible",
    family: `"Atkinson Hyperlegible", ${SANS}`
  }
]

export const DEFAULT_FONT = "literata"

export const readerFontFamily = (key: string | undefined) =>
  (
    READER_FONTS.find(font => font.key === key) ??
    READER_FONTS.find(font => font.key === DEFAULT_FONT)!
  ).family
