// Speed options are percentages added to the normal speed: "+50%" -> 1.5
export const speedRate = (speed: string) => {
  const percent = parseFloat(speed)
  return Number.isNaN(percent) ? 1 : 1 + percent / 100
}
