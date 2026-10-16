import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createPopupClient } from "../../utils/popupClient"
import { Popup } from "./Popup"
import "./style.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Popup client={createPopupClient()} />
  </StrictMode>
)
