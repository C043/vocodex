import { browser } from "wxt/browser"
import { createAudioPlayer } from "../../utils/audioPlayer"
import type { OffscreenCommand } from "../../utils/messages"

// Chrome only: plays the audio the service worker cannot
const player = createAudioPlayer(new Audio(), (tabId, event) => {
  browser.runtime.sendMessage({ type: "audio:event", tabId, event }).catch(() => {})
})

browser.runtime.onMessage.addListener((message: OffscreenCommand) => {
  if (message?.target !== "offscreen") return false
  if (message.type === "audio:play") player.play(message.tabId, message.audio, message.at, message.rate)
  else if (message.type === "audio:pause") player.pause(message.tabId)
  else if (message.type === "audio:rate") player.setRate(message.tabId, message.rate)
  return false
})
