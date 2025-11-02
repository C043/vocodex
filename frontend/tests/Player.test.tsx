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
    return <div>Title: {playerData?.entry?.title}</div>
  }
  return { default: ContextConsumer }
})

vi.mock("../src/components/player/FontSizeControls", () => ({
  default: () => <div>FontSizeControls</div>
}))

vi.mock("../src/components/player/PlayerControls", () => ({
  PlayerControls: () => <div>PlayerControls</div>
}))

describe("Player component", () => {
  beforeEach(() => {
    const mockPlayerData = {
      audioRef: { current: null },
      entry: { title: "My test Title", content: "Some content" }
    }

    ;(useParams as Mock).mockReturnValue({ id: "test-id" })
    ;(usePlayerData as Mock).mockReturnValue(mockPlayerData)

    render(<Player />)
  })

  it("should call useParams and usePlayerData with the correct id", () => {
    expect(useParams).toHaveBeenCalled()
    expect(usePlayerData).toHaveBeenCalledWith("test-id")
  })

  it("should render all child components", () => {
    expect(screen.getByText("FontSizeControls")).toBeInTheDocument()
    expect(screen.getByText("PlayerControls")).toBeInTheDocument()
  })

  it("should provide correct value to PlayerContext", () => {
    expect(screen.getByText("Title: My test Title")).toBeInTheDocument()
  })
})
