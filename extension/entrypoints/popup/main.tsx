import { HeroUIProvider } from "@heroui/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createPopupClient } from "../../utils/popupClient"
import { Popup } from "./Popup"
import "./style.css"

// HeroUI themes by the dark class, like the app
const dark = window.matchMedia("(prefers-color-scheme: dark)")
const applyTheme = () => document.documentElement.classList.toggle("dark", dark.matches)
applyTheme()
dark.addEventListener("change", applyTheme)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HeroUIProvider>
      <Popup client={createPopupClient()} />
    </HeroUIProvider>
  </StrictMode>
)
