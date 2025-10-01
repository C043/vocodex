import { FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch, useSelector } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"
import {
  Button,
  Form,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  useDisclosure
} from "@heroui/react"

const Home = () => {
  const env = import.meta.env

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const username = useSelector(state => state.user.username)
  const [textTitle, setTextTitle] = useState("")
  const [textContent, setTextContent] = useState("")

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

      const data = await resp.json()

      console.log(data)
    } catch (err) {
      console.log(err)
    } finally {
      setTextTitle("")
      setTextContent("")
    }
  }

  // TODO - Get user entries
  const getUserEntries = () => {
    try {
    } catch (err) {
      console.log(err)
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
    }
  }, [])

  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  return (
    <>
      <h1 className="text-2xl font-bold mb-5">Welcome, {username}</h1>
      <Button className="max-w-fit" color="primary" onPress={onOpen}>
        Upload Text
      </Button>

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
