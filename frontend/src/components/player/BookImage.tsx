import { useEffect, useState } from "react"

type BookImageProps = {
  src: string
  alt: string
}

// A picture of a book. The API needs the user's token, which an <img>
// cannot send, so the picture is fetched and shown from a blob
const BookImage = ({ src, alt }: BookImageProps) => {
  const [url, setUrl] = useState<string | null>(null)
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let isCancelled = false
    const token = window.localStorage.getItem("vocodex-jwt")

    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then(async resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        if (isCancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(err => {
        console.error(err)
        if (!isCancelled) setHasFailed(true)
      })

    return () => {
      isCancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  // A missing picture leaves no gap in the text
  if (hasFailed) return null

  return (
    <figure data-book-image={src} className="my-[1.4em] first:mt-0">
      {url && (
        <img
          src={url}
          alt={alt}
          className="mx-auto max-h-[70vh] w-auto max-w-full rounded-xl"
        />
      )}
    </figure>
  )
}

export default BookImage
