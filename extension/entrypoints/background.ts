import { browser } from "wxt/browser"
import { defineBackground } from "wxt/utils/define-background"
import { loadSettings, synthesize } from "../utils/api"
import { createAudioPlayer } from "../utils/audioPlayer"
import type { AudioEvent } from "../utils/messages"
import { createOffscreenPlayer, createRouter } from "../utils/router"

const OFFSCREEN_URL = "/offscreen.html"

let opening: Promise<void> | null = null

// One offscreen page at a time, opened again after Chrome closes it
const ensureOffscreen = async () => {
  const open = await browser.runtime.getContexts({
    contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT]
  })
  if (open.length > 0) return
  opening ??= browser.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: [browser.offscreen.Reason.AUDIO_PLAYBACK],
      justification: "Plays the web page read aloud"
    })
    .finally(() => { opening = null })
  await opening
}

export default defineBackground({
  // Firefox plays the audio here, so the page has to stay open
  persistent: { firefox: true },
  main() {
    const sendToTab = (tabId: number, event: AudioEvent) =>
      browser.tabs.sendMessage(tabId, event).catch(() => {})

    // Chrome's service worker has no audio, Firefox's background page does
    const player = import.meta.env.FIREFOX
      ? createAudioPlayer(new Audio(), sendToTab)
      : createOffscreenPlayer(ensureOffscreen, command => browser.runtime.sendMessage(command))

    const route = createRouter({ player, sendToTab, loadSettings, synthesize })

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const answer = route(message, sender)
      if (!answer) return false
      answer.then(sendResponse)
      return true
    })
  }
})
