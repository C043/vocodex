import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { browser, type Browser } from "wxt/browser"
import { createPopupClient } from "../utils/popupClient"

const state = { playing: false, index: 0, count: 2 }

// The browser types offer callbacks too, which the mocks never use
const answer = (value: unknown) => value as never

describe("popup client", () => {
  const tabId = 3
  beforeEach(() => {
    const query = vi.spyOn(browser.tabs, "query")
    query.mockResolvedValue(answer([{ id: tabId } as Browser.tabs.Tab]))
  })

  it("asks the page of the active tab for its reader", async () => {
    const send = vi.spyOn(browser.tabs, "sendMessage").mockResolvedValue(answer(state))
    expect(await createPopupClient().readerState()).toEqual(state)
    expect(send).toHaveBeenCalledWith(tabId, { type: "reader:state" })
  })

  it("knows the page is off when nothing in it answers", async () => {
    vi.spyOn(browser.tabs, "sendMessage").mockRejectedValue(new Error("No receiver"))
    expect(await createPopupClient().readerState()).toBeNull()
    expect(await createPopupClient().send({ type: "reader:play" })).toBeNull()
  })

  it("switches the page on by adding the reader to it", async () => {
    const inject = vi.spyOn(browser.scripting, "executeScript").mockResolvedValue(answer([]))
    vi.spyOn(browser.tabs, "sendMessage").mockResolvedValue(answer(state))
    expect(await createPopupClient().switchOn()).toEqual(state)
    expect(inject).toHaveBeenCalledWith({
      target: { tabId },
      files: ["/content-scripts/reader.js"]
    })
  })

  it("hears the changes of its own tab only", async () => {
    const listener = vi.fn()
    createPopupClient().onState(listener)
    await fakeBrowser.runtime.onMessage.trigger(
      { type: "reader:changed", state: { index: 9 } }, answer({ tab: { id: tabId + 1 } }), () => {}
    )
    await fakeBrowser.runtime.onMessage.trigger(
      { type: "reader:changed", state }, answer({ tab: { id: tabId } }), () => {}
    )
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(state)
  })
})
