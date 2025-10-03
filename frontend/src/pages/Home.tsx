import React, { FormEvent, Key, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch, useSelector } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"
import {
  Button,
  Form,
  getKeyValue,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  useDisclosure
} from "@heroui/react"
import { TrashIcon } from "@heroicons/react/24/solid"

type Entry = {
  id: number
  title: String
}

type State = {
  user: {
    username: String
  }
}

type Column = {
  key: Key
  label: String
}

const Home = () => {
  const env = import.meta.env

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const username = useSelector((state: State) => state.user.username)
  const token = window.localStorage.getItem("vocodex-jwt")

  const [textTitle, setTextTitle] = useState("")
  const [textContent, setTextContent] = useState("")

  const [entries, setEntries] = useState<Entry[]>([])

  const formRef = useRef<HTMLFormElement>(null)
  const triggerSubmit = () => {
    formRef.current?.requestSubmit()
  }

  const handleUpload = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()

    try {
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
    } finally {
      setTextTitle("")
      setTextContent("")
    }
  }

  const handleDelete = async (entryId: number) => {
    try {
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
    } catch (err) {
      console.error(err)
    }
  }

  const getUserEntries = async () => {
    try {
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
      setEntries(data.entries)
    } catch (err) {
      console.error(err)
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

  const columns: Column[] = [
    {
      key: "title",
      label: "Title"
    },
    { key: "actions", label: "Actions" }
  ]

  const renderCell = React.useCallback((entry: Entry, columnKey: React.Key) => {
    const cellValue = entry[columnKey as keyof Entry]

    switch (columnKey) {
      case "title":
        return <p>{entry.title}</p>
      case "actions":
        return (
          <div className="relative flex justify-end items-center gap-2">
            <Tooltip color="danger" content="Delete">
              <span
                className="text-danger cursor-pointer active:opacity-50"
                onClick={ev => handleDelete(entry.id)}
              >
                <TrashIcon className="size-6 text-danger" />
              </span>
            </Tooltip>
          </div>
        )
      default:
        return cellValue
    }
  }, [])

  return (
    <>
      <h1 className="text-2xl font-bold mb-5">Welcome, {username}</h1>
      <Button className="max-w-fit mb-5" color="primary" onPress={onOpen}>
        Upload Text
      </Button>

      {entries.length > 0 ? (
        <Table
          aria-label="entries table"
          className="w-full"
          color="default"
          selectionMode="single"
        >
          <TableHeader columns={columns}>
            {column => (
              <TableColumn
                key={column.key}
                align={column.key === "actions" ? "end" : "start"}
              >
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={entries}>
            {item => (
              <TableRow key={item.id} className="cursor-pointer">
                {columnKey => (
                  <TableCell>{renderCell(item, columnKey)}</TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <></>
      )}

      <Modal
        isOpen={isOpen}
        size="3xl"
        placement="center"
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Upload Text
              </ModalHeader>
              <ModalBody>
                <p>Text</p>
                <Form ref={formRef} onSubmit={handleUpload}>
                  <Input
                    label="Title"
                    type="text"
                    placeholder="Enter the text title"
                    name="textTitle"
                    value={textTitle}
                    minLength={4}
                    maxLength={20}
                    onChange={ev => setTextTitle(ev.target.value)}
                  />
                  <Textarea
                    label="Content"
                    name="textContent"
                    placeholder="Enter you text"
                    value={textContent}
                    onChange={ev => setTextContent(ev.target.value)}
                    isRequired
                  />
                </Form>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
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
    </>
  )
}

export default Home
