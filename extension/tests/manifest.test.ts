import { describe, expect, it } from "vitest"
import config from "../wxt.config"

const manifestFor = async (browser: string) => {
  const manifest = config.manifest
  if (typeof manifest !== "function") throw new Error("The manifest is built per browser")
  return manifest({ browser, manifestVersion: browser === "firefox" ? 2 : 3, mode: "production", command: "build" })
}

// addons.mozilla.org refuses a new extension that does not declare its data
// collection: the text of the page is sent to the Vocodex server
describe("the Firefox manifest", () => {
  it("declares that it sends the content of the page", async () => {
    const { browser_specific_settings } = await manifestFor("firefox")
    expect(browser_specific_settings?.gecko).toMatchObject({
      id: "extension@vocodex",
      data_collection_permissions: { required: ["websiteContent"] }
    })
  })

  it("needs a Firefox that knows that declaration", async () => {
    const { browser_specific_settings } = await manifestFor("firefox")
    expect(browser_specific_settings?.gecko?.strict_min_version).toBe("140.0")
  })
})

describe("the Chrome manifest", () => {
  it("has no Firefox settings", async () => {
    const { browser_specific_settings } = await manifestFor("chrome")
    expect(browser_specific_settings).toBeUndefined()
  })
})
