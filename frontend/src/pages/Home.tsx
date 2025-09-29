import { FormEvent, useEffect, useState } from "react"
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
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const username = useSelector(state => state.user.username)
  const [textTitle, setTextTitle] = useState("")
  const [textContent, setTextContent] = useState("")

  const handleUpload = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
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
                <Form onSubmit={handleUpload}>
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
                <Button color="primary" onPress={onClose}>
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
