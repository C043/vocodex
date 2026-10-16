// play() returns a promise that rejects with AbortError when a later
// pause() or src change interrupts it. That is expected when switching
// sentences, so only surface real playback errors.
export const playAudio = (audio: HTMLAudioElement, onError: () => void) =>
  audio.play().catch(err => {
    if (err instanceof DOMException && err.name === "AbortError") return
    console.error(err)
    onError()
  })
