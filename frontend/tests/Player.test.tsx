import { describe, it, expect, vi } from "vitest"
import type { Mock } from "vitest"
import { render, screen } from "./test-utils"
import Player from "../src/pages/Player"
import { usePlayerData } from "../src/hooks/usePlayerData"
import { useParams } from "react-router-dom"
import { useContext } from "react"
import { PlayerContext } from "../src/contexts/PlayerContext"

vi.mock("react-router-dom", async importOriginal => {
  const actual = (await importOriginal()) as typeof import("react-router-dom")
  return {
    ...actual,
    useParams: vi.fn()
  }
})

vi.mock("../src/hooks/usePlayerData")

vi.mock("../src/components/player/EntryContent", () => {
  const ContextConsumer = () => {
    const playerData = useContext(PlayerContext)
    return <div>Title: {playerData?.title}</div>
  }
  return { default: ContextConsumer }
})

vi.mock("../src/components/player/FontSizeControls", () => ({
  default: () => <div>FontSizeControls</div>
}))

vi.mock("../src/components/player/PlayerControls", () => ({
  PlayerControls: () => <div>PlayerControls</div>
}))

const makePlayerData = (title = "My test Title") => ({
  audioRef: { current: null as HTMLAudioElement | null },
  title
})

describe("Player component", () => {
  let mockPlayerData: ReturnType<typeof makePlayerData>

  beforeEach(() => {
    mockPlayerData = makePlayerData()
    ;(useParams as Mock).mockReturnValue({ id: "test-id" })
    ;(usePlayerData as Mock).mockReturnValue(mockPlayerData)
  })

  it("should call useParams and usePlayerData with the correct id", () => {
    render(<Player />)
    expect(useParams).toHaveBeenCalled()
    expect(usePlayerData).toHaveBeenCalledWith("test-id")
  })

  it("should pass undefined to usePlayerData when the route has no id", () => {
    ;(useParams as Mock).mockReturnValue({})
    render(<Player />)
    expect(usePlayerData).toHaveBeenCalledWith(undefined)
  })

  it("should render all child components", () => {
    render(<Player />)
    expect(screen.getByText("FontSizeControls")).toBeInTheDocument()
    expect(screen.getByText("PlayerControls")).toBeInTheDocument()
  })

  it("should render children in order: content, font size, controls", () => {
    const { container } = render(<Player />)
    const playerRoot = container.querySelector("audio")!.parentElement!
    const texts = Array.from(playerRoot.children)
      .filter(el => el.tagName !== "AUDIO")
      .map(el => el.textContent)
    expect(texts).toEqual([
      "Title: My test Title",
      "FontSizeControls",
      "PlayerControls"
    ])
  })

  it("should provide correct value to PlayerContext", () => {
    render(<Player />)
    expect(screen.getByText("Title: My test Title")).toBeInTheDocument()
  })

  it("should render a single audio element attached to audioRef", () => {
    const { container } = render(<Player />)
    const audios = container.querySelectorAll("audio")
    expect(audios).toHaveLength(1)
    expect(mockPlayerData.audioRef.current).toBe(audios[0])
  })

  it("should update context consumers when player data changes", () => {
    const { rerender } = render(<Player />)
    ;(usePlayerData as Mock).mockReturnValue(makePlayerData("Updated Title"))
    rerender(<Player />)
    expect(screen.getByText("Title: Updated Title")).toBeInTheDocument()
    expect(screen.queryByText("Title: My test Title")).not.toBeInTheDocument()
  })

  it("should request new player data when the route id changes", () => {
    const { rerender } = render(<Player />)
    ;(useParams as Mock).mockReturnValue({ id: "other-id" })
    rerender(<Player />)
    expect(usePlayerData).toHaveBeenLastCalledWith("other-id")
  })
})
