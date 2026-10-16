import { useEffect, useState } from "react"

// A picture from the API. The API needs the user's token, which an <img>
// cannot send, so the picture is fetched and shown from a blob.
// No src loads nothing.
const useAuthorizedImage = (src: string | null) => {
  const [url, setUrl] = useState<string | null>(null)
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    if (!src) return
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

  return { url, hasFailed }
}

export default useAuthorizedImage
