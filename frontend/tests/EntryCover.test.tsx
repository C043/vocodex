import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, waitFor } from "./test-utils"
import EntryCover from "../src/components/EntryCover"

describe("EntryCover", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.setItem("vocodex-jwt", "test-token")
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:cover"),
      revokeObjectURL: vi.fn()
    })
  })

  it.each(["pdf", "epub"] as const)(
    "shows the cover of a %s entry",
    async kind => {
      const fetchSpy = vi
        .spyOn(window, "fetch")
        .mockResolvedValue(new Response(new Blob(["jpeg"]), { status: 200 }))

      const { container } = render(<EntryCover entryId={7} kind={kind} />)

      await waitFor(() =>
        expect(container.querySelector("img")).toHaveAttribute(
          "src",
          "blob:cover"
        )
      )
      expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/entries\/7\/cover$/)
      expect(fetchSpy.mock.calls[0][1]).toEqual({
        headers: { Authorization: "Bearer test-token" }
      })
      // The cover takes the place of the icon
      expect(container.querySelector("svg")).not.toBeInTheDocument()
    }
  )

  it("keeps the icon when the entry has no cover", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }))

    const { container } = render(<EntryCover entryId={7} kind="epub" />)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(container.querySelector("img")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("does not look for the cover of a text", () => {
    const fetchSpy = vi.spyOn(window, "fetch")

    const { container } = render(<EntryCover entryId={7} kind="text" />)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("fills the width of a grid card when large", () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 404 }))

    const { container } = render(<EntryCover entryId={7} kind="pdf" size="large" />)

    const cover = container.querySelector("svg")!.parentElement
    expect(cover).toHaveClass("w-full", "aspect-[3/4]")
    expect(cover).not.toHaveClass("w-12")
  })

  it("is a small thumbnail by default", () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 404 }))

    const { container } = render(<EntryCover entryId={7} kind="pdf" />)

    const cover = container.querySelector("svg")!.parentElement
    expect(cover).toHaveClass("w-12", "h-16")
  })
})
