import { describe, it, expect, vi } from "vitest"
import type { Mock } from "vitest"
import { render } from "./test-utils"
import Player from "../src/pages/Player"
import { usePlayerData } from "../src/hooks/usePlayerData"
import { useParams } from "react-router-dom"

vi.mock("react-router-dom", async importOriginal => {
  const actual = (await importOriginal()) as typeof import("react-router-dom")
  return {
    ...actual,
    useParams: vi.fn()
  }
})

vi.mock("../src/hooks/usePlayerData")

vi.mock("../src/components/player/EntryContent", () => ({
  default: () => <div>EntryContent</div>
}))

vi.mock("../src/components/player/FontSizeControls", () => ({
  default: () => <div>FontSizeControls</div>
}))

vi.mock("../src/components/player/PlayerControls", () => ({
  PlayerControls: () => <div>PlayerControls</div>
}))

describe("Player component", () => {
  it("should call useParams and usePlayerData with the correct id", () => {
    const testId = "test-id"

    ;(useParams as Mock).mockReturnValue({ id: testId })
    ;(usePlayerData as Mock).mockReturnValue({
      audioRef: { current: null }
    })

    render(<Player />)

    expect(useParams).toHaveBeenCalled()
    expect(usePlayerData).toHaveBeenCalledWith(testId)
  })
})
