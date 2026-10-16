import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, within, createTestStore } from "./test-utils"
import "@testing-library/jest-dom"
import Home from "../src/pages/Home"
import { checkAuthentication, parseJwt } from "../src/utils/authUtils"

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

vi.mock("../src/utils/authUtils", () => ({
  checkAuthentication: vi.fn(), // Return false for unauthenticated
  parseJwt: vi.fn()
}))

describe("Home Page", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    window.localStorage.setItem("vocodex-jwt", "test-token")
  })

  it("renders Welcome heading with username", () => {
    const testUsername = "testuser"

    const testStore = createTestStore({
          isLoggedIn: true,
          userId: 1,
          username: testUsername
        })

    render(<Home />, { store: testStore })

    expect(screen.getByText(`Welcome, ${testUsername}`)).toBeInTheDocument()
  })
})

describe("Upload text", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    global.fetch = vi.fn()
  })

  it("should call the right api endpoint", async () => {
    const { userEvent } = await import("@testing-library/user-event")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [] })
      })
    ) as any

    const testStore = createTestStore({ isLoggedIn: true, userId: 1, username: "testuser" })

    render(<Home />, { store: testStore })

    await userEvent.click(screen.getByRole("button", { name: /Upload Text/i }))
    await userEvent.type(screen.getByLabelText(/title/i), "title")
    await userEvent.type(screen.getByLabelText(/content/i), "content")
    await userEvent.click(screen.getByRole("button", { name: /Upload/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/entries/text"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "title",
          content: "content"
        })
      })
    )
  })
})

describe("Entries", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    global.fetch = vi.fn()
  })

  it("should render one row", async () => {
    const { waitFor } = await import("@testing-library/react")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [{ id: 1, title: "title" }] })
      })
    ) as any

    const testStore = createTestStore({ isLoggedIn: true, userId: 1, username: "testuser" })

    render(<Home />, { store: testStore })

    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument()
    })
  })

  const renderWithEntry = async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [{ id: 1, title: "title" }] })
      })
    ) as any

    const testStore = createTestStore({ isLoggedIn: true, userId: 1, username: "testuser" })

    render(<Home />, { store: testStore })

    await screen.findByText("title")
  }

  const deleteCalls = () =>
    vi
      .mocked(global.fetch)
      .mock.calls.filter(([, init]) => (init as RequestInit)?.method === "DELETE")

  it("should ask for confirmation in a modal instead of the browser", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    window.confirm = vi.fn(() => true)
    await renderWithEntry()

    await userEvent.click(screen.getByTestId("delete-entry-1"))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Delete entry?")
    expect(dialog).toHaveTextContent("title")
    expect(window.confirm).not.toHaveBeenCalled()
    expect(deleteCalls()).toHaveLength(0)
  })

  it("should call delete api once the deletion is confirmed", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    const { waitFor } = await import("@testing-library/react")
    await renderWithEntry()

    await userEvent.click(screen.getByTestId("delete-entry-1"))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Delete"
      })
    )

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/entries/1"),
      expect.objectContaining({
        method: "DELETE"
      })
    )
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("should not delete when the deletion is cancelled", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    const { waitFor } = await import("@testing-library/react")
    await renderWithEntry()

    await userEvent.click(screen.getByTestId("delete-entry-1"))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Cancel"
      })
    )

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(deleteCalls()).toHaveLength(0)
    expect(screen.getByText("title")).toBeInTheDocument()
  })

  it("should not show an arrow next to the entry", async () => {
    await renderWithEntry()

    const openButton = screen.getByText("title").closest("button")!
    // Only the cover icon is left
    expect(openButton.querySelectorAll("svg")).toHaveLength(1)
  })
})

describe("Entries view", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [{ id: 1, title: "title" }] })
      })
    ) as any
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  const renderHome = async () => {
    const testStore = createTestStore({ isLoggedIn: true, userId: 1, username: "testuser" })
    const result = render(<Home />, { store: testStore })
    await screen.findByText("title")
    return result
  }

  const entriesList = () => screen.getByRole("list", { name: "Entries" })

  it("shows the entries as a list by default", async () => {
    await renderHome()

    expect(entriesList()).toHaveAttribute("data-view", "list")
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("switches the entries to a grid and back", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    await renderHome()

    await userEvent.click(screen.getByRole("button", { name: "Grid view" }))
    expect(entriesList()).toHaveAttribute("data-view", "grid")
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    await userEvent.click(screen.getByRole("button", { name: "List view" }))
    expect(entriesList()).toHaveAttribute("data-view", "list")
  })

  it("remembers the chosen view", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    const { unmount } = await renderHome()
    await userEvent.click(screen.getByRole("button", { name: "Grid view" }))
    unmount()

    await renderHome()

    expect(entriesList()).toHaveAttribute("data-view", "grid")
  })

  it("keeps the open and delete actions in the grid", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    await renderHome()

    await userEvent.click(screen.getByRole("button", { name: "Grid view" }))

    expect(screen.getByText("title")).toBeInTheDocument()
    expect(screen.getByTestId("delete-entry-1")).toBeInTheDocument()
  })
})

describe("Import website", () => {
  const renderHome = () => {
    const testStore = createTestStore({ isLoggedIn: true, userId: 1, username: "testuser" })

    render(<Home />, { store: testStore })
  }

  const mockApi = (importResponse: { ok: boolean; json: () => Promise<any> }) => {
    global.fetch = vi.fn((url: string) =>
      Promise.resolve(
        url.includes("/entries/website")
          ? importResponse
          : { ok: true, json: () => Promise.resolve({ entries: [] }) }
      )
    ) as any
  }

  const importUrl = async (url: string) => {
    const { userEvent } = await import("@testing-library/user-event")

    await userEvent.click(
      screen.getByRole("button", { name: /Import Website/i })
    )
    await userEvent.type(screen.getByLabelText(/url/i), url)
    await userEvent.click(screen.getByRole("button", { name: /^Import$/i }))
  }

  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    window.localStorage.setItem("vocodex-jwt", "test-token")
  })

  it("should call the website import endpoint with the url", async () => {
    mockApi({ ok: true, json: () => Promise.resolve({ id: 7 }) })
    renderHome()

    await importUrl("https://blog.test/article")

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/entries/website"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token"
        }),
        body: JSON.stringify({ url: "https://blog.test/article" })
      })
    )
  })

  it("should refresh the entries and close the form after importing", async () => {
    const { waitFor } = await import("@testing-library/react")
    mockApi({ ok: true, json: () => Promise.resolve({ id: 7 }) })
    renderHome()

    await importUrl("https://blog.test/article")

    await waitFor(() => {
      expect(screen.queryByLabelText(/url/i)).not.toBeInTheDocument()
    })
    const listCalls = vi
      .mocked(global.fetch)
      .mock.calls.filter(([url]) => String(url).includes("/entries/list/me"))
    expect(listCalls).toHaveLength(2)
  })

  it("should keep the form open and show the backend error", async () => {
    mockApi({
      ok: false,
      json: () =>
        Promise.resolve({ detail: "No readable content found on the website" })
    })
    renderHome()

    await importUrl("https://spa.test")

    expect(
      await screen.findByText("No readable content found on the website")
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/url/i)).toHaveValue("https://spa.test")
  })

  it("should explain when the backend rejects the url", async () => {
    mockApi({
      ok: false,
      json: () =>
        Promise.resolve({
          detail: [{ type: "url_scheme", loc: ["body", "url"], msg: "..." }]
        })
    })
    renderHome()

    await importUrl("ftp://files.test/doc.html")

    expect(
      await screen.findByText("Enter a valid http or https link.")
    ).toBeInTheDocument()
  })
})
