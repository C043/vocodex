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

const pdfFile = () =>
  new File(["%PDF-1.4 fake"], "My Book.pdf", { type: "application/pdf" })

const entriesResponse = (entries: object[] = []) =>
  new Response(JSON.stringify({ entries }), { status: 200 })

describe("Upload PDF", () => {
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

    const file = pdfFile()
    await userEvent.upload(screen.getByLabelText("PDF file"), file)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3))
    const [url, init] = fetchSpy.mock.calls[1]
    expect(String(url)).toMatch(/\/entries\/pdf$/)
    expect(init?.method).toBe("POST")
    expect(init?.headers).toEqual({ Authorization: "Bearer test-token" })
    expect((init?.body as FormData).get("file")).toBe(file)
    expect(String(fetchSpy.mock.calls[2][0])).toMatch(/\/entries\/list\/me$/)
  })

  it("only accepts PDF files", () => {
    vi.spyOn(window, "fetch").mockResolvedValue(entriesResponse())
    render(<Home />)

    expect(screen.getByLabelText("PDF file")).toHaveAttribute(
      "accept",
      "application/pdf,.pdf"
    )
  })

  it("shows why a PDF was refused", async () => {
    vi.spyOn(window, "fetch").mockImplementation(async (input, init) =>
      init?.method === "POST"
        ? new Response(
            JSON.stringify({ detail: "This PDF has no readable text" }),
            { status: 422 }
          )
        : entriesResponse()
    )
    render(<Home />)

    await userEvent.upload(screen.getByLabelText("PDF file"), pdfFile())

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "This PDF has no readable text",
          color: "danger"
        })
      )
    )
  })

  it("shows the upload is in progress", async () => {
    let finish: (resp: Response) => void = () => {}
    vi.spyOn(window, "fetch").mockImplementation((input, init) =>
      init?.method === "POST"
        ? new Promise(resolve => (finish = resolve))
        : Promise.resolve(entriesResponse())
    )
    render(<Home />)

    await userEvent.upload(screen.getByLabelText("PDF file"), pdfFile())

    expect(await screen.findByText("Uploading…")).toBeInTheDocument()
    finish(new Response(JSON.stringify({ id: 3 }), { status: 201 }))
    await waitFor(() =>
      expect(screen.queryByText("Uploading…")).not.toBeInTheDocument()
    )
  })

  it("marks PDF entries in the list", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      entriesResponse([
        { id: 1, title: "A book", kind: "pdf", date: "2026-10-14" },
        { id: 2, title: "Some text", kind: "text", date: "2026-10-14" }
      ])
    )
    render(<Home />)

    expect(await screen.findByText("A book")).toBeInTheDocument()
    expect(screen.getAllByText("PDF", { selector: "li *" })).toHaveLength(1)
  })

  it("shows the cover of PDF entries in the list", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:cover"),
      revokeObjectURL: vi.fn()
    })
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async input =>
        String(input).endsWith("/cover")
          ? new Response(new Blob(["jpeg"]), { status: 200 })
          : entriesResponse([
              { id: 1, title: "A book", kind: "pdf", date: "2026-10-14" },
              { id: 2, title: "Some text", kind: "text", date: "2026-10-14" }
            ])
      )
    const { container } = render(<Home />)

    await waitFor(() =>
      expect(container.querySelector("li img")).toHaveAttribute(
        "src",
        "blob:cover"
      )
    )
    const coverRequests = fetchSpy.mock.calls
      .map(([url]) => String(url))
      .filter(url => url.endsWith("/cover"))
    expect(coverRequests).toEqual([expect.stringMatching(/\/entries\/1\/cover$/)])
  })
})
