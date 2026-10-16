import { storage } from "wxt/utils/storage"
import type { Synthesis } from "./reader"

export type Settings = {
  // Address of the Vocodex backend, like VITE_API_URL in the app
  serverUrl: string
  voice: string
  speed: string
}

export type VoiceOption = {
  key: string
  name: string
  locale: string
  language: string
}

// Same speeds as the player of the app
export const speedOptions = [
  { key: "+0%", label: "1x" },
  { key: "+50%", label: "1.5x" },
  { key: "+100%", label: "2x" }
]

const settingsItem = storage.defineItem<Settings>("local:settings", {
  // An empty voice lets the server pick its default one
  fallback: { serverUrl: "http://localhost:8000", voice: "", speed: "+0%" }
})

export const loadSettings = () => settingsItem.getValue()

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
