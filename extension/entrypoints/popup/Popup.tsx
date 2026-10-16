import { SpeedSelect } from "../../components/SpeedSelect"
import { VoiceSelect } from "../../components/VoiceSelect"
import { speedOptions } from "../../utils/speed"
import { useEffect, useState } from "react"
import type { VoiceOption } from "../../utils/api"
import type { ReaderCommand } from "../../utils/messages"
import type { PopupClient } from "../../utils/popupClient"
import type { ReaderState } from "../../utils/reader"

const icons = {
  play: "M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z",
  pause: "M7 5h3v14H7zM14 5h3v14h-3z",
  backward: "M6 5h2v14H6zM20 6.2v11.6a1 1 0 0 1-1.54.84L9.5 12.84a1 1 0 0 1 0-1.68l8.96-5.8A1 1 0 0 1 20 6.2Z",
  // ViewfinderCircleIcon of heroicons, as on the auto scroll button of the app
  autoScroll: "M6 3a3 3 0 0 0-3 3v1.5a.75.75 0 0 0 1.5 0V6A1.5 1.5 0 0 1 6 4.5h1.5a.75.75 0 0 0 0-1.5H6ZM16.5 3a.75.75 0 0 0 0 1.5H18A1.5 1.5 0 0 1 19.5 6v1.5a.75.75 0 0 0 1.5 0V6a3 3 0 0 0-3-3h-1.5ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5ZM4.5 16.5a.75.75 0 0 0-1.5 0V18a3 3 0 0 0 3 3h1.5a.75.75 0 0 0 0-1.5H6A1.5 1.5 0 0 1 4.5 18v-1.5ZM21 16.5a.75.75 0 0 0-1.5 0V18a1.5 1.5 0 0 1-1.5 1.5h-1.5a.75.75 0 0 0 0 1.5H18a3 3 0 0 0 3-3v-1.5Z",
  forward: "M16 5h2v14h-2zM4 6.2v11.6a1 1 0 0 0 1.54.84l8.96-5.8a1 1 0 0 0 0-1.68L5.54 5.36A1 1 0 0 0 4 6.2Z"
}

const Icon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={path} fill="currentColor" />
  </svg>
)

export const Popup = ({ client }: { client: PopupClient }) => {
  const [reader, setReader] = useState<ReaderState | null>(null)
  const [voice, setVoice] = useState("")
  const [speed, setSpeed] = useState("+0%")
  const [autoScroll, setAutoScroll] = useState(true)
  const [serverUrl, setServerUrl] = useState("")
  const [voices, setVoices] = useState<VoiceOption[]>([])
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
      setAutoScroll(settings.autoScroll)
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

  const toggleAutoScroll = () => {
    const value = !autoScroll
    setAutoScroll(value)
    client.saveSettings({ autoScroll: value })
    send({ type: "reader:autoScroll", autoScroll: value })
  }

  const saveServer = async () => {
    const settings = await client.saveSettings({ serverUrl })
    setServerUrl(settings.serverUrl)
    listVoices(settings.serverUrl)
  }

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
        <button
          type="button"
          className="auto-scroll"
          aria-label="Auto scroll"
          aria-pressed={autoScroll}
          title={autoScroll ? "Auto scroll on" : "Auto scroll off"}
          onClick={toggleAutoScroll}
        >
          <Icon path={icons.autoScroll} />
        </button>
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
        <span className="label">Voice</span>
        <VoiceSelect voices={voices} selectedVoice={voice} onChange={changeVoice} />
      </section>

      <section className="field">
        <span className="label">Speed</span>
        <SpeedSelect speeds={speedOptions} selectedSpeed={speed} onChange={changeSpeed} />
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
