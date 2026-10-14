import React, { FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch, useSelector } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"
import {
  addToast,
  Button,
  Form,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
  Textarea,
  useDisclosure
} from "@heroui/react"
import {
  ChevronRightIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  SpeakerWaveIcon,
  TrashIcon
} from "@heroicons/react/24/solid"
import { motion } from "framer-motion"

type Entry = {
  id: number
  title: string
  date: string
}

type State = {
  user: {
    username: String
  }
}

const Home = () => {
  const env = import.meta.env

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const username = useSelector((state: State) => state.user.username)
  const token = window.localStorage.getItem("vocodex-jwt")

  const [textTitle, setTextTitle] = useState("")
  const [textContent, setTextContent] = useState("")

  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState("")

  const [entries, setEntries] = useState<Entry[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const triggerSubmit = () => {
    formRef.current?.requestSubmit()
  }

  const handleUpload = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()

    try {
      setIsLoading(true)
      setHasError(false)
      const token = window.localStorage.getItem("vocodex-jwt")
      const url = `${env.VITE_API_URL}/entries/text`
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }

      const body = {
        title: textTitle,
        content: textContent
      }

      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      })

      if (!resp.ok) {
        throw new Error(`There was an error: ${resp.status}`)
      }

      await getUserEntries()
    } catch (err) {
      console.error(err)
      addToast({
        title: "There was an error uploading.",
        description: "Retry later.",
        color: "danger"
      })
      setHasError(true)
    } finally {
      setIsLoading(false)
      setTextTitle("")
      setTextContent("")
    }
  }

  const handleImportWebsite = async (
    ev: FormEvent<HTMLFormElement>,
    onClose: () => void
  ) => {
    ev.preventDefault()

    try {
      setIsImporting(true)
      setImportError("")
      const url = `${env.VITE_API_URL}/entries/website`
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }

      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ url: websiteUrl })
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        // Validation errors come as a list, the other errors as a string
        const detail = Array.isArray(data?.detail)
          ? "Enter a valid http or https link."
          : typeof data?.detail === "string"
            ? data.detail
            : "The website could not be imported."
        setImportError(detail)
        return
      }

      setWebsiteUrl("")
      onClose()
      await getUserEntries()
    } catch (err) {
      console.error(err)
      setImportError("The website could not be imported. Retry later.")
    } finally {
      setIsImporting(false)
    }
  }

  const handleDelete = async (ev: React.MouseEvent, entryId: number) => {
    try {
      ev.stopPropagation()
      setIsLoading(true)
      setHasError(false)
      const confirmed = window.confirm(
        "Are you sure you want to delete this entry?"
      )

      if (confirmed) {
        const url = `${env.VITE_API_URL}/entries/${entryId}`
        const headers = {
          Authorization: `Bearer ${token}`
        }
        const method = "DELETE"
        const resp = await fetch(url, {
          method,
          headers
        })

        if (!resp.ok) {
          const data = await resp.json().catch(() => null)
          const detail = data?.detail ?? `HTTP ${resp.status}`
          throw new Error(detail)
        }

        await getUserEntries()
      }
    } catch (err) {
      setHasError(true)
      addToast({
        title: "There was an error deleting.",
        description: "Retry later.",
        color: "danger"
      })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getUserEntries = async () => {
    try {
      setIsLoading(true)
      setHasError(false)
      const url = `${env.VITE_API_URL}/entries/list/me`
      const headers = {
        Authorization: `Bearer ${token}`
      }
      const resp = await fetch(url, { headers })

      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        const detail = data?.detail ?? `HTTP ${resp.status}`
        throw new Error(detail)
      }

      const data = await resp.json()
      data.entries.forEach((entry: Entry) => {
        entry.date = new Date(entry.date).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      })
      setEntries(data.entries)
    } catch (err) {
      setHasError(true)
      console.error(err)

      addToast({
        title: "There was an error fetching entries.",
        description: "Retry later.",
        color: "danger"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const token = window.localStorage.getItem("vocodex-jwt")
    const isAuthenticated = checkAuthentication(token)
    if (!isAuthenticated) {
      dispatch(setIsLoggedIn(false))
      navigate("/login")
    } else {
      dispatch(setIsLoggedIn(true))
      ;(async () => {
        await getUserEntries()
      })().catch(console.error)
    }
  }, [])

  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const {
    isOpen: isImportOpen,
    onOpen: onImportOpen,
    onOpenChange: onImportOpenChange
  } = useDisclosure()

  // Gives each entry a stable cover color
  const coverGradients = [
    "from-violet-500 to-indigo-500",
    "from-sky-400 to-blue-600",
    "from-fuchsia-500 to-pink-500",
    "from-emerald-400 to-teal-600",
    "from-amber-400 to-orange-500"
  ]

  // Bottom sheet on mobile, centered dialog on desktop
  const modalClassNames = {
    backdrop: "bg-black/40 backdrop-blur-sm",
    base: "glass max-sm:!m-0 max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)]",
    header: "text-xl font-bold",
    closeButton: "top-3 right-3"
  }

  const inputClassNames = {
    inputWrapper:
      "bg-foreground/5 data-[hover=true]:bg-foreground/10 group-data-[focus=true]:bg-foreground/10"
  }

  const actionTile =
    "group h-auto min-h-0 p-4 md:p-5 rounded-3xl flex flex-col items-start justify-start gap-3 text-left whitespace-normal glass data-[hover=true]:!bg-[var(--glass-bg)] hover:-translate-y-0.5 transition-transform"

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6 md:mb-8">
        <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50 mb-1">
          Your library
        </p>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gradient pb-1">
          Welcome, {username}
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
        <Button className={actionTile} onPress={onOpen}>
          <span className="grid place-items-center size-11 rounded-2xl bg-brand text-white shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
            <DocumentTextIcon className="size-6" />
          </span>
          <span>
            <span className="block font-bold text-base md:text-lg">
              Upload Text
            </span>
            <span className="block text-xs md:text-sm text-foreground/60">
              Paste text and listen
            </span>
          </span>
        </Button>
        <Button
          className={actionTile}
          onPress={() => {
            setImportError("")
            onImportOpen()
          }}
        >
          <span className="grid place-items-center size-11 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform">
            <GlobeAltIcon className="size-6" />
          </span>
          <span>
            <span className="block font-bold text-base md:text-lg">
              Import Website
            </span>
            <span className="block text-xs md:text-sm text-foreground/60">
              Turn an article into audio
            </span>
          </span>
        </Button>
      </div>

      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="text-lg md:text-xl font-bold">Entries</h2>
        {!isLoading && entries.length > 0 && (
          <span className="text-sm text-foreground/50">
            {entries.length} {entries.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass rounded-3xl p-3 flex items-center gap-4">
              <Skeleton className="size-12 rounded-2xl" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-3/5 rounded-lg" />
                <Skeleton className="h-3 w-1/4 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-3xl py-14 px-6 flex flex-col items-center text-center gap-3">
          <span className="grid place-items-center size-16 rounded-3xl bg-brand text-white shadow-xl shadow-violet-500/30">
            <SpeakerWaveIcon className="size-8" />
          </span>
          <p className="font-bold text-lg">No entries found.</p>
          <p className="text-sm text-foreground/60 max-w-xs">
            Upload a text or import a website to start listening.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <motion.li
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.04 }}
              className="glass rounded-3xl flex items-center pr-2 hover:ring-2 hover:ring-primary/40 transition-shadow"
            >
              <button
                type="button"
                onClick={() => navigate("/player/" + entry.id)}
                className="flex-1 min-w-0 flex items-center gap-4 p-3 text-left cursor-pointer active:scale-[0.98] transition-transform"
              >
                <span
                  className={`shrink-0 grid place-items-center size-12 rounded-2xl bg-gradient-to-br text-white ${coverGradients[entry.id % coverGradients.length]}`}
                >
                  <SpeakerWaveIcon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{entry.title}</span>
                  {entry.date && (
                    <span className="block text-xs text-foreground/50 mt-0.5">
                      {entry.date}
                    </span>
                  )}
                </span>
                <ChevronRightIcon className="size-5 text-foreground/30 hidden sm:block" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${entry.title}`}
                className="shrink-0 grid place-items-center size-10 rounded-full text-foreground/40 hover:text-danger hover:bg-danger/10 active:opacity-50 transition-colors cursor-pointer"
                onClick={(ev: React.MouseEvent) => handleDelete(ev, entry.id)}
                data-testid={`delete-entry-${entry.id}`}
              >
                <TrashIcon className="size-5" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isOpen}
        size="2xl"
        placement="auto"
        backdrop="blur"
        classNames={modalClassNames}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Upload Text
                <span className="text-sm font-normal text-foreground/60">
                  Paste or write the text you want to listen to.
                </span>
              </ModalHeader>
              <ModalBody>
                <Form ref={formRef} onSubmit={handleUpload}>
                  <Input
                    label="Title"
                    type="text"
                    placeholder="Enter the text title"
                    name="textTitle"
                    value={textTitle}
                    minLength={4}
                    maxLength={20}
                    classNames={inputClassNames}
                    onChange={ev => setTextTitle(ev.target.value)}
                  />
                  <Textarea
                    label="Content"
                    name="textContent"
                    placeholder="Enter you text"
                    value={textContent}
                    minRows={6}
                    maxRows={14}
                    classNames={inputClassNames}
                    onChange={ev => setTextContent(ev.target.value)}
                    isRequired
                  />
                </Form>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  size="lg"
                  className="w-full sm:w-auto bg-brand font-semibold shadow-lg shadow-violet-500/30"
                  onPress={() => {
                    triggerSubmit()
                    onClose()
                  }}
                >
                  Upload
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isImportOpen}
        size="2xl"
        placement="auto"
        backdrop="blur"
        classNames={modalClassNames}
        onOpenChange={onImportOpenChange}
      >
        <ModalContent>
          {onClose => (
            <Form
              className="block"
              onSubmit={ev => handleImportWebsite(ev, onClose)}
            >
              <ModalHeader className="flex flex-col gap-1">
                Import Website
                <span className="text-sm font-normal text-foreground/60">
                  Paste the link of an article: its text will be saved as a
                  new entry.
                </span>
              </ModalHeader>
              <ModalBody>
                <Input
                  label="URL"
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/article"
                  name="websiteUrl"
                  value={websiteUrl}
                  onChange={ev => {
                    setWebsiteUrl(ev.target.value)
                    setImportError("")
                  }}
                  startContent={
                    <GlobeAltIcon className="size-4 text-foreground/40" />
                  }
                  classNames={inputClassNames}
                  isInvalid={importError !== ""}
                  errorMessage={importError}
                  isDisabled={isImporting}
                  isRequired
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  size="lg"
                  type="submit"
                  className="w-full sm:w-auto bg-brand font-semibold shadow-lg shadow-violet-500/30"
                  isLoading={isImporting}
                >
                  Import
                </Button>
              </ModalFooter>
            </Form>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

export default Home
