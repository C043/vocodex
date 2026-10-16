import { Select, SelectItem } from "@heroui/react"
import type { SpeedOption } from "../utils/speed"

type Props = {
  speeds: SpeedOption[]
  selectedSpeed: string
  onChange: (speed: string) => void
  isDisabled?: boolean
  className?: string
}

export const SpeedSelect = ({
  speeds,
  selectedSpeed,
  onChange,
  isDisabled,
  className
}: Props) => (
  <Select
    className={className}
    classNames={{
      trigger:
        "bg-foreground/5 data-[hover=true]:bg-foreground/10 rounded-full min-h-10 h-10"
    }}
    items={speeds}
    selectedKeys={[selectedSpeed]}
    disallowEmptySelection
    aria-label="Select Speed"
    size="sm"
    // Auto scroll moves the page while reading; keep the list open
    popoverProps={{ shouldCloseOnScroll: false }}
    onSelectionChange={keys => {
      const selected = Array.from(keys)[0] as string | undefined
      if (selected && selected !== selectedSpeed) onChange(selected)
    }}
    isDisabled={isDisabled}
  >
    {speed => <SelectItem>{speed.label}</SelectItem>}
  </Select>
)
