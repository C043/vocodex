import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

afterEach(() => {
  cleanup()
  fakeBrowser.reset()
})
