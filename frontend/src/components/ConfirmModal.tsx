import { ReactNode } from "react"
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from "@heroui/react"

type Props = {
  isOpen: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  // Red confirm button for destructive actions
  isDanger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// In-app replacement for window.confirm, styled like the other modals
const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = false,
  onConfirm,
  onCancel
}: Props) => (
  <Modal
    isOpen={isOpen}
    size="sm"
    placement="auto"
    backdrop="blur"
    classNames={{
      backdrop: "bg-black/40 backdrop-blur-sm",
      base: "glass max-sm:!m-0 max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)]",
      header: "text-xl font-bold",
      closeButton: "top-3 right-3"
    }}
    onOpenChange={open => {
      if (!open) onCancel()
    }}
  >
    <ModalContent>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <p className="text-foreground/70">{message}</p>
      </ModalBody>
      <ModalFooter className="flex-col-reverse sm:flex-row">
        <Button
          variant="flat"
          size="lg"
          className="w-full sm:w-auto font-semibold"
          onPress={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          color={isDanger ? "danger" : "primary"}
          size="lg"
          className={`w-full sm:w-auto font-semibold ${isDanger ? "shadow-lg shadow-danger/30" : "bg-brand shadow-lg shadow-violet-500/30"}`}
          onPress={onConfirm}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
)

export default ConfirmModal
