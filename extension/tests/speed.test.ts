import { describe, it, expect } from "vitest"
import { speedRate } from "../utils/speed"

describe("speedRate", () => {
  it("turns the speed options into playback rates", () => {
    expect(speedRate("+0%")).toBe(1)
    expect(speedRate("+50%")).toBe(1.5)
    expect(speedRate("+100%")).toBe(2)
    expect(speedRate("-50%")).toBe(0.5)
  })

  it("falls back to normal speed for unknown values", () => {
    expect(speedRate("")).toBe(1)
    expect(speedRate("fast")).toBe(1)
  })
})
