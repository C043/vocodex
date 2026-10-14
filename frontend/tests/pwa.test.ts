import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { registerServiceWorker } from "../src/registerServiceWorker"

const root = resolve(__dirname, "..")
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("web app manifest", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"))

  it("is installable as a standalone app", () => {
    expect(manifest.name).toBe("VOCODEX")
    expect(manifest.start_url).toBe("/")
    expect(manifest.scope).toBe("/")
    expect(manifest.display).toBe("standalone")
  })

  it("lists 192px, 512px and maskable icons that exist", () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]))
    expect(
      manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")
    ).toBe(true)
    for (const icon of manifest.icons) {
      expect(existsSync(resolve(root, "public", icon.src.slice(1)))).toBe(true)
    }
  })
})

describe("index.html", () => {
  const html = read("index.html")

  it("links the favicon, apple touch icon and manifest", () => {
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/icon.svg"')
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"')
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
  })
})

describe("registerServiceWorker", () => {
  let register: ReturnType<typeof vi.fn>
  let sw: Navigator

  // Fresh spies so load listeners from earlier tests hit their own mocks
  beforeEach(() => {
    register = vi.fn(() => Promise.resolve())
    sw = { serviceWorker: { register } } as unknown as Navigator
  })

  it("registers /sw.js after the page loads in production", () => {
    registerServiceWorker(sw, true)
    expect(register).not.toHaveBeenCalled()
    window.dispatchEvent(new Event("load"))
    expect(register).toHaveBeenCalledWith("/sw.js")
  })

  it("does nothing in development", () => {
    registerServiceWorker(sw, false)
    window.dispatchEvent(new Event("load"))
    expect(register).not.toHaveBeenCalled()
  })

  it("does nothing when service workers are unsupported", () => {
    expect(() => registerServiceWorker({} as Navigator, true)).not.toThrow()
  })
})

describe("service worker", () => {
  type Listener = (event: unknown) => void
  const ORIGIN = "https://vocodex.test"

  function loadWorker(network: (req: Request) => Promise<Response>) {
    const listeners: Record<string, Listener> = {}
    const store = new Map<string, Response>()
    const cache = {
      addAll: vi.fn(() => Promise.resolve()),
      put: vi.fn((req: Request | string, res: Response) => {
        store.set(typeof req === "string" ? req : new URL(req.url).pathname, res)
        return Promise.resolve()
      }),
      match: vi.fn((req: Request | string) =>
        Promise.resolve(
          store.get(typeof req === "string" ? req : new URL(req.url).pathname)
        )
      )
    }
    const self = {
      location: { origin: ORIGIN },
      addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() }
    }
    const caches = {
      open: vi.fn(() => Promise.resolve(cache)),
      keys: vi.fn(() => Promise.resolve([])),
      delete: vi.fn()
    }
    new Function("self", "caches", "fetch", read("public/sw.js"))(
      self,
      caches,
      network
    )
    const dispatch = (request: Request, mode?: string) => {
      let responded: Promise<Response> | undefined
      listeners.fetch({
        request: mode
          ? Object.defineProperty(request, "mode", { value: mode })
          : request,
        respondWith: (p: Promise<Response>) => (responded = p)
      })
      return responded
    }
    return { dispatch, store }
  }

  it("leaves API calls to other origins alone", () => {
    const { dispatch } = loadWorker(vi.fn())
    expect(dispatch(new Request("https://api.vocodex.test/entries/1"))).toBe(
      undefined
    )
  })

  it("leaves non-GET requests alone", () => {
    const { dispatch } = loadWorker(vi.fn())
    expect(
      dispatch(new Request(`${ORIGIN}/upload`, { method: "POST" }))
    ).toBe(undefined)
  })

  it("serves the cached app shell when navigating offline", async () => {
    const { dispatch, store } = loadWorker(() =>
      Promise.reject(new TypeError("offline"))
    )
    store.set("/", new Response("shell"))
    const res = await dispatch(new Request(`${ORIGIN}/player/3`), "navigate")
    expect(await res!.text()).toBe("shell")
  })

  it("caches built assets after the first fetch", async () => {
    const network = vi.fn(() => Promise.resolve(new Response("js")))
    const { dispatch } = loadWorker(network)
    const url = `${ORIGIN}/assets/index-abc.js`
    await (await dispatch(new Request(url)))!.text()
    await new Promise(r => setTimeout(r))
    const again = await dispatch(new Request(url))
    expect(await again!.text()).toBe("js")
    expect(network).toHaveBeenCalledTimes(1)
  })
})
