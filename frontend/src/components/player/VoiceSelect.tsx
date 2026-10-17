import { Key, useEffect, useMemo, useState } from "react"
import {
  Autocomplete,
  AutocompleteItem,
  AutocompleteSection,
  Modal,
  ModalContent
} from "@heroui/react"
import {
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from "@heroicons/react/24/outline"
import { VoiceOption } from "../../contexts/PlayerContext"
import { useIsDesktop } from "../../hooks/useIsDesktop"
import { useIsTouch } from "../../hooks/useIsTouch"

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

// Voices matching the query, grouped by language, with Auto first
const groupVoices = (voices: VoiceOption[], query: string) => {
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
}

const labelOf = (voices: VoiceOption[], voice: string) =>
  voice
    ? (voices.find(option => option.key === voice)?.name ?? nameFromKey(voice))
    : AUTO_LABEL

// Touch screens get the full screen list even when wide, as on tablets and
// phones in landscape, where a popover leaves little room above the keyboard
export const VoiceSelect = (props: Props) => {
  const isDesktop = useIsDesktop()
  const isTouch = useIsTouch()
  return isDesktop && !isTouch ? (
    <VoiceAutocomplete {...props} />
  ) : (
    <VoicePicker {...props} />
  )
}

const VoiceAutocomplete = ({
  voices,
  selectedVoice,
  onChange,
  isDisabled,
  className
}: Props) => {
  const selectedKey = selectedVoice || AUTO_KEY
  const selectedLabel = labelOf(voices, selectedVoice)

  const [inputValue, setInputValue] = useState(selectedLabel)

  useEffect(() => {
    setInputValue(selectedLabel)
  }, [selectedLabel])

  // While the input just shows the current voice, list everything
  const query =
    inputValue === selectedLabel ? "" : inputValue.trim().toLowerCase()

  const sections = useMemo(() => groupVoices(voices, query), [voices, query])

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

// Phones and tablets get a full screen list, roomier than a popover above the
// keyboard
const VoicePicker = ({
  voices,
  selectedVoice,
  onChange,
  isDisabled,
  className
}: Props) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const query = search.trim().toLowerCase()
  const sections = useMemo(() => groupVoices(voices, query), [voices, query])
  const selectedKey = selectedVoice || AUTO_KEY

  const open = () => {
    setSearch("")
    setIsOpen(true)
  }

  const select = (key: string) => {
    const voice = key === AUTO_KEY ? "" : key
    if (voice !== selectedVoice) onChange(voice)
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Voice: ${labelOf(voices, selectedVoice)}`}
        aria-haspopup="dialog"
        disabled={isDisabled}
        onClick={open}
        className={`flex items-center gap-2 h-10 px-3 rounded-full bg-foreground/5 active:bg-foreground/10 text-sm text-left transition cursor-pointer disabled:opacity-50 disabled:cursor-default ${className ?? ""}`}
      >
        <span className="flex-1 truncate">
          {labelOf(voices, selectedVoice)}
        </span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0 opacity-60" />
      </button>
      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="full"
        hideCloseButton
        aria-label="Choose a voice"
        classNames={{ base: "!rounded-none" }}
      >
        <ModalContent aria-label="Choose a voice">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b border-foreground/10">
              <h2 className="flex-1 text-lg font-semibold">Choose a voice</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="grid place-items-center size-10 rounded-full hover:bg-foreground/10 active:scale-90 transition cursor-pointer"
              >
                <XMarkIcon aria-hidden className="size-6" />
              </button>
            </div>
            <div className="px-4 py-3">
              <label className="flex items-center gap-2 h-11 px-4 rounded-full bg-foreground/5 focus-within:bg-foreground/10">
                <MagnifyingGlassIcon
                  aria-hidden
                  className="size-5 shrink-0 opacity-60"
                />
                <input
                  type="search"
                  aria-label="Search voice or language"
                  placeholder="Search voice or language"
                  value={search}
                  onChange={ev => setSearch(ev.target.value)}
                  // The player listens for space and arrows on the window
                  onKeyDown={ev => ev.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent outline-none text-base"
                />
              </label>
            </div>
            <div
              role="listbox"
              aria-label="Voices"
              className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
            >
              {sections.length === 0 && (
                <p className="px-4 py-8 text-center text-foreground/60">
                  No voices found
                </p>
              )}
              {sections.map(section => (
                <div
                  key={section.key}
                  role="group"
                  aria-label={section.title || undefined}
                >
                  {section.title && (
                    <div
                      aria-hidden
                      className="sticky top-0 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/60 bg-content1"
                    >
                      {section.title}
                    </div>
                  )}
                  {section.items.map(voice => {
                    const isSelected = voice.key === selectedKey
                    return (
                      <button
                        key={voice.key}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => select(voice.key)}
                        className={`flex items-center w-full min-h-12 px-4 text-left text-base active:bg-foreground/10 cursor-pointer ${isSelected ? "text-primary font-semibold" : ""}`}
                      >
                        <span className="flex-1 truncate">{voice.name}</span>
                        {isSelected && (
                          <CheckIcon aria-hidden className="size-5 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  )
}
