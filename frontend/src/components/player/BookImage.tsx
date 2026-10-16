import useAuthorizedImage from "../../hooks/useAuthorizedImage"

type BookImageProps = {
  src: string
  alt: string
}

// A picture of a book
const BookImage = ({ src, alt }: BookImageProps) => {
  const { url, hasFailed } = useAuthorizedImage(src)

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
