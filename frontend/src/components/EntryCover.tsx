import {
  BookOpenIcon,
  DocumentIcon,
  SpeakerWaveIcon
} from "@heroicons/react/24/solid"
import useAuthorizedImage from "../hooks/useAuthorizedImage"

type EntryCoverProps = {
  entryId: number
  kind: "text" | "pdf" | "epub"
  // Large fills the width of a card in the grid of entries
  size?: "small" | "large"
}

// Gives each entry a stable color, shown until its cover is loaded, or
// for good when it has none
const COVER_GRADIENTS = [
  "from-violet-500 to-indigo-500",
  "from-sky-400 to-blue-600",
  "from-fuchsia-500 to-pink-500",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500"
]

// The thumbnail of an entry: the cover of a PDF or EPUB, in the shape of
// a page, or an icon of its kind
const EntryCover = ({ entryId, kind, size = "small" }: EntryCoverProps) => {
  const isFile = kind !== "text"
  const { url } = useAuthorizedImage(
    isFile ? `${import.meta.env.VITE_API_URL}/entries/${entryId}/cover` : null
  )

  const Icon =
    kind === "pdf" ? DocumentIcon : kind === "epub" ? BookOpenIcon : SpeakerWaveIcon

  const shape =
    size === "large"
      ? "w-full aspect-[3/4] rounded-2xl"
      : isFile
        ? "w-12 h-16 rounded-xl"
        : "size-12 rounded-2xl"

  return (
    <span
      className={`shrink-0 grid place-items-center overflow-hidden bg-gradient-to-br text-white ${shape} ${
        COVER_GRADIENTS[entryId % COVER_GRADIENTS.length]
      }`}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Icon className={size === "large" ? "size-10" : "size-5"} />
      )}
    </span>
  )
}

export default EntryCover
