import { browser } from "wxt/browser"
import { defineContentScript } from "wxt/utils/define-content-script"
import { loadSettings } from "../utils/api"
import { caretAt, cssHighlighter, follow } from "../utils/dom"
import type { AudioCommand, AudioEvent, ReaderCommand, SynthesizeResponse } from "../utils/messages"
import { createPageReader, type PageReader } from "../utils/pageReader"
import { readingRoot } from "../utils/pageText"

type Flagged = Window & { __vocodexReader?: boolean }

// Added to the page by the popup when switched on, so every page starts off
export default defineContentScript({
  matches: [],
  registration: "runtime",
  main() {
    const win = window as Flagged
    if (win.__vocodexReader) return
    win.__vocodexReader = true

    const toBackground = (command: AudioCommand) => {
      browser.runtime.sendMessage(command).catch(console.error)
    }

    let reader: PageReader | null = null
    const ready = loadSettings().then(({ voice, speed }) => {
      reader = createPageReader({
        root: readingRoot(document),
        settings: { voice, speed },
        synthesize: async (text, voice) => {
          const answer: SynthesizeResponse = await browser.runtime.sendMessage({ type: "synthesize", text, voice })
          if ("error" in answer) throw new Error(answer.error)
          return answer
        },
        audio: {
          play: (audio, at, rate) => toBackground({ type: "audio:play", audio, at, rate }),
          pause: () => toBackground({ type: "audio:pause" }),
          setRate: rate => toBackground({ type: "audio:rate", rate })
        },
        // The popup is often closed, with nobody to hear it
        notify: state => {
          browser.runtime.sendMessage({ type: "reader:changed", state }).catch(() => {})
        },
        highlighter: cssHighlighter(document),
        caretAt: (x, y) => caretAt(document, x, y),
        follow: range => follow(window, range)
      })
    })

    const onMessage = (
      message: ReaderCommand | AudioEvent,
      _sender: unknown,
      sendResponse: (response: unknown) => void
    ) => {
      if (typeof message?.type !== "string") return false
      if (message.type.startsWith("audio:")) {
        ready.then(() => reader?.onAudioEvent(message as AudioEvent))
        return false
      }
      if (!message.type.startsWith("reader:")) return false
      ready.then(() => {
        const state = reader?.handle(message as ReaderCommand) ?? null
        if (message.type === "reader:off") {
          // Switched off: the popup adds the reader again to switch it on
          browser.runtime.onMessage.removeListener(onMessage)
          reader = null
          win.__vocodexReader = false
          sendResponse(null)
        } else {
          sendResponse(state)
        }
      })
      return true
    }
    browser.runtime.onMessage.addListener(onMessage)
  }
})
