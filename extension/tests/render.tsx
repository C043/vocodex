import { HeroUIProvider } from "@heroui/react"
import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement } from "react"

// Renders inside the HeroUI provider, like the popup
const renderWithProvider = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: HeroUIProvider, ...options })

export * from "@testing-library/react"
export { renderWithProvider as render }
