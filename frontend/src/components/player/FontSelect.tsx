import { Select, SelectItem } from "@heroui/react"
import { usePlayer } from "../../contexts/PlayerContext"
import { READER_FONTS, readerFontFamily } from "../../utils/fonts"

type Props = {
  className?: string
}

export const FontSelect = ({ className }: Props) => {
  const { currentFont, setFont } = usePlayer()

  return (
    <Select
      className={className}
      classNames={{
        trigger:
          "bg-foreground/5 data-[hover=true]:bg-foreground/10 rounded-full min-h-10 h-10"
      }}
      items={READER_FONTS}
      selectedKeys={[currentFont]}
      disallowEmptySelection
      aria-label="Select Font"
      size="sm"
      renderValue={items =>
        items.map(item => (
          <span
            key={item.key}
            style={{ fontFamily: readerFontFamily(String(item.key)) }}
          >
            {item.textValue}
          </span>
        ))
      }
      onSelectionChange={keys => {
        const selected = Array.from(keys)[0]
        if (selected !== undefined && selected !== currentFont) {
          setFont(String(selected))
        }
      }}
      // Auto scroll moves the page while reading; keep the list open
      popoverProps={{
        shouldCloseOnScroll: false,
        classNames: { content: "min-w-56" }
      }}
    >
      {font => (
        <SelectItem key={font.key} textValue={font.label}>
          <span style={{ fontFamily: font.family }}>{font.label}</span>
        </SelectItem>
      )}
    </Select>
  )
}
