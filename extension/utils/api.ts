import { storage } from "wxt/utils/storage"
import type { Synthesis } from "./reader"

// A voice of the server, as listed by /voices
export type VoiceOption = {
  key: string
  name: string
  locale: string
  language: string
}

export type Settings = {
  // Address of the Vocodex backend, like VITE_API_URL in the app
  serverUrl: string
  voice: string
  speed: string
  // Whether the page scrolls to follow the voice, on by default like the app
  autoScroll: boolean
}

// An empty voice lets the server pick its default one
const defaults: Settings = {
  serverUrl: "http://localhost:8000",
  voice: "",
  speed: "+0%",
  autoScroll: true
}

const settingsItem = storage.defineItem<Partial<Settings>>("local:settings", {
  fallback: {}
})

// Settings saved by an older version miss the newer fields
export const loadSettings = async (): Promise<Settings> => ({
  ...defaults,
  ...(await settingsItem.getValue())
})

export const saveSettings = async (changes: Partial<Settings>) => {
  const settings = { ...(await loadSettings()), ...changes }
  settings.serverUrl = settings.serverUrl.trim().replace(/\/+$/, "")
  await settingsItem.setValue(settings)
  return settings
}

const request = async (serverUrl: string, path: string, failure: string, init?: RequestInit) => {
  let resp: Response
  try {
    resp = init ? await fetch(`${serverUrl}${path}`, init) : await fetch(`${serverUrl}${path}`)
  } catch {
    throw new Error(`Cannot reach the server at ${serverUrl}`)
  }
  if (!resp.ok) throw new Error(failure)
  return resp.json()
}

export const fetchVoices = (serverUrl: string): Promise<VoiceOption[]> =>
  request(serverUrl, "/voices", "The server could not list the voices")

export const synthesize = (serverUrl: string, text: string, voice: string): Promise<Synthesis> =>
  request(serverUrl, "/synthesis/GET", "The server could not read this text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice })
  })
