// Speed options are percentages added to the normal speed: "+50%" -> 1.5
export const speedRate = (speed: string) => {
  const percent = parseFloat(speed)
  return Number.isNaN(percent) ? 1 : 1 + percent / 100
}

export type SpeedOption = {
  key: string
  label: string
}

// The speeds the player of the app offers
export const speedOptions: SpeedOption[] = [
  { key: "+100%", label: "2x" },
  { key: "+50%", label: "1.5x" },
  { key: "+0%", label: "1x" }
]
