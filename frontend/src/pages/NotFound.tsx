import { Link } from "react-router-dom"

const NotFound = () => {
  return (
    <div className="min-h-[calc(100dvh-10rem)] flex flex-col items-center justify-center text-center gap-3">
      <p className="text-8xl md:text-9xl font-extrabold tracking-tighter text-gradient">
        404
      </p>
      <h1 className="text-2xl font-bold">404 Not Found</h1>
      <p className="text-foreground/60">This page went silent.</p>
      <Link
        to="/"
        className="mt-3 px-6 py-3 rounded-full bg-brand text-white font-semibold shadow-lg shadow-violet-500/30"
      >
        Back to library
      </Link>
    </div>
  )
}

export default NotFound
