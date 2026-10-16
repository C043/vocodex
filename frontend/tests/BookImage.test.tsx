import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "./test-utils"
import BookImage from "../src/components/player/BookImage"

describe("BookImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.setItem("vocodex-jwt", "test-token")
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:picture"),
      revokeObjectURL: vi.fn()
    })
  })

  it("loads the picture with the user's token", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(new Blob(["png"]), { status: 200 }))

    const { unmount } = render(
      <BookImage src="http://api/entries/1/images/0" alt="A rabbit" />
    )

    const img = await screen.findByRole("img", { name: "A rabbit" })
    expect(img).toHaveAttribute("src", "blob:picture")
    expect(fetchSpy).toHaveBeenCalledWith("http://api/entries/1/images/0", {
      headers: { Authorization: "Bearer test-token" }
    })

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:picture")
  })

  it("shows nothing when the picture cannot be loaded", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }))

    render(<BookImage src="http://api/entries/1/images/9" alt="Gone" />)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})
