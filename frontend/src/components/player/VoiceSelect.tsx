import { Key, useEffect, useMemo, useState } from "react"
import {
  Autocomplete,
  AutocompleteItem,
  AutocompleteSection
} from "@heroui/react"
import { VoiceOption } from "../../contexts/PlayerContext"

// "" is the stored value for Auto, but it makes for an unreliable list key
const AUTO_KEY = "auto"
const AUTO_LABEL = "Auto"

type VoiceSection = {
  key: string
  title: string
  items: VoiceOption[]
}

type Props = {
  voices: VoiceOption[]
  selectedVoice: string
  onChange: (voice: string) => void
  isDisabled?: boolean
  className?: string
}

// Fallback for a saved voice that isn't in the list (yet):
// "en-GB-AdaMultilingualNeural" -> "Ada"
const nameFromKey = (key: string) =>
  key
    .split("-")
    .pop()
    ?.replace(/(Multilingual)?Neural$/, "") || key

export const VoiceSelect = ({
  voices,
  selectedVoice,
  onChange,
  isDisabled,
  className
}: Props) => {
  const selectedKey = selectedVoice || AUTO_KEY
  const selectedLabel = selectedVoice
    ? (voices.find(voice => voice.key === selectedVoice)?.name ??
      nameFromKey(selectedVoice))
    : AUTO_LABEL

  const [inputValue, setInputValue] = useState(selectedLabel)

  useEffect(() => {
    setInputValue(selectedLabel)
  }, [selectedLabel])

  // While the input just shows the current voice, list everything
  const query =
    inputValue === selectedLabel ? "" : inputValue.trim().toLowerCase()

  const sections = useMemo(() => {
    const groups = new Map<string, VoiceOption[]>()
    for (const voice of voices) {
      const matches =
        !query ||
        [voice.name, voice.language, voice.locale].some(field =>
          field.toLowerCase().includes(query)
        )
      if (!matches) continue

      const group = groups.get(voice.language) ?? []
      group.push(voice)
      groups.set(voice.language, group)
    }

    const result: VoiceSection[] = Array.from(groups, ([language, items]) => ({
      key: language,
      title: language,
      items
    }))

    if (!query || AUTO_LABEL.toLowerCase().includes(query)) {
      result.unshift({
        key: "auto-section",
        title: "",
        items: [{ key: AUTO_KEY, name: AUTO_LABEL, locale: "", language: "" }]
      })
    }

    return result
  }, [voices, query])

  const handleSelectionChange = (key: Key | null) => {
    if (key === null) return
    const voice = key === AUTO_KEY ? "" : String(key)
    if (voice !== selectedVoice) onChange(voice)
    setInputValue(
      voice ? (voices.find(v => v.key === voice)?.name ?? voice) : AUTO_LABEL
    )
  }

  return (
    <Autocomplete
      className={className}
      aria-label="Select Voice"
      placeholder="Search voice or language"
      size="sm"
      items={sections}
      selectedKey={selectedKey}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={handleSelectionChange}
      onClose={() => setInputValue(selectedLabel)}
      onBlur={() => setInputValue(selectedLabel)}
      isDisabled={isDisabled}
      isClearable={false}
      inputProps={{
        classNames: {
          inputWrapper:
            "bg-foreground/5 data-[hover=true]:bg-foreground/10 group-data-[focus=true]:bg-foreground/10 rounded-full min-h-10 h-10"
        }
      }}
      // Auto scroll moves the page while reading; keep the list open
      popoverProps={{
        shouldCloseOnScroll: false,
        classNames: { content: "min-w-64" }
      }}
      listboxProps={{ emptyContent: "No voices found" }}
    >
      {section => (
        <AutocompleteSection
          key={section.key}
          title={section.title || undefined}
          items={section.items}
          showDivider={section.key === "auto-section"}
        >
          {voice => (
            <AutocompleteItem key={voice.key} textValue={voice.name}>
              {voice.name}
            </AutocompleteItem>
          )}
        </AutocompleteSection>
      )}
    </Autocomplete>
  )
}
