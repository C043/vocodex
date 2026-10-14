import { vi } from "vitest"

// jsdom has no matchMedia: fake a screen that is at least `width` px wide
export const setScreenWidth = (width: number) => {
  window.matchMedia = vi.fn((query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return {
      matches: width >= min,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as MediaQueryList
  })
}

export const resetScreenWidth = () => {
  // @ts-expect-error jsdom ships without it
  delete window.matchMedia
}
