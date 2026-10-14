import { useState } from "react"

// A PDF shows its pages, or just its text, easier to read on small screens
export type PdfView = "pdf" | "text"

const STORAGE_KEY = "vocodex-pdf-view"

const readStored = (): PdfView => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "text" ? "text" : "pdf"
  } catch {
    return "pdf"
  }
}

// How PDFs are shown, remembered per browser
export const usePdfView = () => {
  const [pdfView, setPdfView] = useState<PdfView>(readStored)

  const togglePdfView = () => {
    const next = pdfView === "pdf" ? "text" : "pdf"
    setPdfView(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage blocked: the choice just won't survive a reload
    }
  }

  return { pdfView, togglePdfView }
}
