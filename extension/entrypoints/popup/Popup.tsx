import { useEffect, useMemo, useState } from "react"
import { speedOptions, type VoiceOption } from "../../utils/api"
import type { ReaderCommand } from "../../utils/messages"
import type { PopupClient } from "../../utils/popupClient"
import type { ReaderState } from "../../utils/reader"

const icons = {
  play: "M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z",
  pause: "M7 5h3v14H7zM14 5h3v14h-3z",
  backward: "M6 5h2v14H6zM20 6.2v11.6a1 1 0 0 1-1.54.84L9.5 12.84a1 1 0 0 1 0-1.68l8.96-5.8A1 1 0 0 1 20 6.2Z",
  forward: "M16 5h2v14h-2zM4 6.2v11.6a1 1 0 0 0 1.54.84l8.96-5.8a1 1 0 0 0 0-1.68L5.54 5.36A1 1 0 0 0 4 6.2Z"
}

const Icon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={path} fill="currentColor" />
  </svg>
)

const voiceLabel = (voice: VoiceOption) => `${voice.name} (${voice.locale})`

const matches = (voice: VoiceOption, search: string) =>
  [voice.key, voice.name, voice.locale, voice.language]
    .some(field => field.toLowerCase().includes(search.toLowerCase()))

export const Popup = ({ client }: { client: PopupClient }) => {
  const [reader, setReader] = useState<ReaderState | null>(null)
  const [voice, setVoice] = useState("")
  const [speed, setSpeed] = useState("+0%")
  const [serverUrl, setServerUrl] = useState("")
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  const listVoices = async (url: string) => {
    try {
      setVoices(await client.fetchVoices(url))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    const stop = client.onState(setReader)
    ;(async () => {
      const settings = await client.loadSettings()
      setVoice(settings.voice)
      setSpeed(settings.speed)
      setServerUrl(settings.serverUrl)
      setReader(await client.readerState())
      listVoices(settings.serverUrl)
    })()
    return stop
  }, [client])

  const on = reader !== null

  const send = async (command: ReaderCommand) => {
    if (!on) return
    const state = await client.send(command)
    if (state) setReader(state)
  }

  const toggle = async () => {
    if (on) {
      await client.send({ type: "reader:off" })
      setReader(null)
      return
    }
    try {
      setReader(await client.switchOn())
      setError(null)
    } catch {
      setError("This page cannot be read")
    }
  }

  const changeVoice = (value: string) => {
    setVoice(value)
    client.saveSettings({ voice: value })
    send({ type: "reader:voice", voice: value })
  }

  const changeSpeed = (value: string) => {
    setSpeed(value)
    client.saveSettings({ speed: value })
    send({ type: "reader:speed", speed: value })
  }

  const saveServer = async () => {
    const settings = await client.saveSettings({ serverUrl })
    setServerUrl(settings.serverUrl)
    listVoices(settings.serverUrl)
  }

  const shown = useMemo(
    () => voices.filter(option => matches(option, search)),
    [voices, search]
  )
  // The voice picked stays selected while the search hides it
  const picked = voices.find(option => option.key === voice)
  const pickedHidden = picked && !shown.includes(picked)

  const playing = reader?.playing ?? false
  const message = reader?.error ?? error

  return (
    <main className="popup">
      <header>
        <h1>Vocodex</h1>
        <label className="toggle">
          <span>Read this page</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Read this page"
            onClick={toggle}
          />
        </label>
      </header>

      <section className="controls">
        <button type="button" aria-label="Backward" disabled={!on} onClick={() => send({ type: "reader:previous" })}>
          <Icon path={icons.backward} />
        </button>
        <button
          type="button"
          className="play"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!on}
          onClick={() => send({ type: playing ? "reader:pause" : "reader:play" })}
        >
          <Icon path={playing ? icons.pause : icons.play} />
        </button>
        <button type="button" aria-label="Forward" disabled={!on} onClick={() => send({ type: "reader:next" })}>
          <Icon path={icons.forward} />
        </button>
        {reader && reader.count > 0 && (
          <span className="position">{reader.index + 1} / {reader.count}</span>
        )}
      </section>

      <section className="field">
        <label htmlFor="voice">Voice</label>
        <input
          type="search"
          aria-label="Search voices"
          placeholder="Search voices"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <select id="voice" value={voice} onChange={event => changeVoice(event.target.value)}>
          {pickedHidden && <option value={picked.key} hidden>{voiceLabel(picked)}</option>}
          <option value="">Server default</option>
          {shown.map(option => (
            <option key={option.key} value={option.key}>{voiceLabel(option)}</option>
          ))}
        </select>
      </section>

      <section className="field">
        <label htmlFor="speed">Speed</label>
        <select id="speed" value={speed} onChange={event => changeSpeed(event.target.value)}>
          {speedOptions.map(option => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
      </section>

      {message && <p className="error" role="alert">{message}</p>}

      <section className="field server">
        <label htmlFor="server">Server</label>
        <div className="row">
          <input id="server" type="text" value={serverUrl} onChange={event => setServerUrl(event.target.value)} />
          <button type="button" onClick={saveServer}>Save</button>
        </div>
      </section>
    </main>
  )
}
