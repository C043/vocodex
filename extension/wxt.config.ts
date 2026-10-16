import { resolve } from "node:path"
import { defineConfig } from "wxt"

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // The text tools of the web app, so the page is chunked and highlighted
  // the same way as an entry
  alias: {
    "@vocodex/utils": resolve(__dirname, "../frontend/src/utils")
  },
  manifest: ({ browser }) => ({
    name: "Vocodex",
    description: "Reads web pages aloud with your Vocodex server, highlighting each word",
    // activeTab: the page is only read once switched on from the popup.
    // offscreen: Chrome plays audio from an offscreen page, Firefox from its
    // background page
    permissions: [
      "activeTab",
      "scripting",
      "storage",
      ...(browser === "firefox" ? [] : ["offscreen"])
    ],
    browser_specific_settings:
      browser === "firefox" ? { gecko: { id: "extension@vocodex" } } : undefined
  })
})
