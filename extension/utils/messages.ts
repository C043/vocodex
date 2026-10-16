import type { ReaderState, Synthesis } from "./reader"

// Popup -> content script of the tab, answered with the reader state
export type ReaderCommand =
  | { type: "reader:state" }
  | { type: "reader:play" }
  | { type: "reader:pause" }
  | { type: "reader:next" }
  | { type: "reader:previous" }
  | { type: "reader:voice"; voice: string }
  | { type: "reader:speed"; speed: string }
  | { type: "reader:autoScroll"; autoScroll: boolean }
  | { type: "reader:off" }

// Content script -> popup, whenever the reader changes
export type ReaderChanged = { type: "reader:changed"; state: ReaderState }

// Content script -> background
export type SynthesizeRequest = { type: "synthesize"; text: string; voice: string }
export type SynthesizeResponse = Synthesis | { error: string }

export type AudioCommand =
  | { type: "audio:play"; audio: string; at: number; rate: number }
  | { type: "audio:pause" }
  | { type: "audio:rate"; rate: number }

// Audio player -> content script of the tab it plays for
export type AudioEvent =
  | { type: "audio:time"; time: number }
  | { type: "audio:ended" }
  | { type: "audio:interrupted" }

// Background -> offscreen page (Chrome), and back
export type OffscreenCommand = AudioCommand & { target: "offscreen"; tabId: number }
export type OffscreenEvent = { type: "audio:event"; tabId: number; event: AudioEvent }
