import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "./test-utils"
import userEvent from "@testing-library/user-event"
import { addToast } from "@heroui/react"
import Home from "../src/pages/Home"
import { checkAuthentication } from "../src/utils/authUtils"

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock("../src/utils/authUtils", () => ({
  checkAuthentication: vi.fn(),
  parseJwt: vi.fn()
}))

vi.mock("@heroui/react", async () => {
  const actual = await vi.importActual("@heroui/react")
  return { ...actual, addToast: vi.fn() }
})

const epubFile = () =>
  new File(["PK fake"], "My Novel.epub", { type: "application/epub+zip" })

const entriesResponse = (entries: object[] = []) =>
  new Response(JSON.stringify({ entries }), { status: 200 })

describe("Upload EPUB", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkAuthentication).mockReturnValue(true)
    window.localStorage.setItem("vocodex-jwt", "test-token")
  })

  it("uploads the chosen file and refreshes the entries", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async (input, init) =>
        init?.method === "POST"
          ? new Response(JSON.stringify({ id: 3 }), { status: 201 })
          : entriesResponse()
      )
    render(<Home />)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    const file = epubFile()
    await userEvent.upload(screen.getByLabelText("EPUB file"), file)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3))
    const [url, init] = fetchSpy.mock.calls[1]
    expect(String(url)).toMatch(/\/entries\/epub$/)
    expect(init?.method).toBe("POST")
    expect(init?.headers).toEqual({ Authorization: "Bearer test-token" })
    expect((init?.body as FormData).get("file")).toBe(file)
    expect(String(fetchSpy.mock.calls[2][0])).toMatch(/\/entries\/list\/me$/)
  })

  it("only accepts EPUB files", () => {
    vi.spyOn(window, "fetch").mockResolvedValue(entriesResponse())
    render(<Home />)

    expect(screen.getByLabelText("EPUB file")).toHaveAttribute(
      "accept",
      "application/epub+zip,.epub"
    )
  })

  it("shows why an EPUB was refused", async () => {
    vi.spyOn(window, "fetch").mockImplementation(async (input, init) =>
      init?.method === "POST"
        ? new Response(
            JSON.stringify({ detail: "DRM protected EPUBs are not supported" }),
            { status: 422 }
          )
        : entriesResponse()
    )
    render(<Home />)

    await userEvent.upload(screen.getByLabelText("EPUB file"), epubFile())

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "The EPUB could not be uploaded.",
          description: "DRM protected EPUBs are not supported",
          color: "danger"
        })
      )
    )
  })

  it("shows the upload is in progress on the EPUB tile only", async () => {
    let finish: (resp: Response) => void = () => {}
    vi.spyOn(window, "fetch").mockImplementation((input, init) =>
      init?.method === "POST"
        ? new Promise(resolve => (finish = resolve))
        : Promise.resolve(entriesResponse())
    )
    render(<Home />)

    await userEvent.upload(screen.getByLabelText("EPUB file"), epubFile())

    expect(await screen.findAllByText("Uploading…")).toHaveLength(1)
    expect(
      screen.getByRole("button", { name: /Upload EPUB/ })
    ).toHaveTextContent("Uploading…")
    finish(new Response(JSON.stringify({ id: 3 }), { status: 201 }))
    await waitFor(() =>
      expect(screen.queryByText("Uploading…")).not.toBeInTheDocument()
    )
  })

  it("marks EPUB entries in the list", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      entriesResponse([
        { id: 1, title: "A novel", kind: "epub", date: "2026-10-14" },
        { id: 2, title: "Some text", kind: "text", date: "2026-10-14" }
      ])
    )
    render(<Home />)

    expect(await screen.findByText("A novel")).toBeInTheDocument()
    expect(screen.getAllByText("EPUB", { selector: "li *" })).toHaveLength(1)
  })
})
