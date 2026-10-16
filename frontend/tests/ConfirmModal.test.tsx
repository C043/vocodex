import { describe, it, expect, vi } from "vitest"
import { render, screen } from "./test-utils"
import "@testing-library/jest-dom"
import userEvent from "@testing-library/user-event"
import ConfirmModal from "../src/components/ConfirmModal"

const renderModal = (props: Partial<Parameters<typeof ConfirmModal>[0]> = {}) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()

  render(
    <ConfirmModal
      isOpen
      title="Delete entry?"
      message="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  )

  return { onConfirm, onCancel }
}

describe("ConfirmModal", () => {
  it("shows the title and the message in a dialog", () => {
    renderModal()

    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent("Delete entry?")
    expect(dialog).toHaveTextContent("This cannot be undone.")
  })

  it("renders nothing when closed", () => {
    renderModal({ isOpen: false })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("calls onConfirm when the confirm button is pressed", async () => {
    const { onConfirm, onCancel } = renderModal()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("calls onCancel when the cancel button is pressed", async () => {
    const { onConfirm, onCancel } = renderModal()

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("calls onCancel when dismissed with Escape", async () => {
    const { onCancel } = renderModal()

    await userEvent.keyboard("{Escape}")

    expect(onCancel).toHaveBeenCalled()
  })
})
