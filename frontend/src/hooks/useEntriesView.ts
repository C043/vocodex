import { useState } from "react"

// The entries on the home page, as rows or as a grid of covers
export type EntriesView = "list" | "grid"

const STORAGE_KEY = "vocodex-entries-view"

const readStored = (): EntriesView => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "grid" ? "grid" : "list"
  } catch {
    return "list"
  }
}

// How the entries are shown, remembered per browser
export const useEntriesView = () => {
  const [entriesView, setView] = useState<EntriesView>(readStored)

  const setEntriesView = (next: EntriesView) => {
    setView(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage blocked: the choice just won't survive a reload
    }
  }

  return { entriesView, setEntriesView }
}
