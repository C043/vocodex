import "./App.css"
import { HeroUIProvider } from "@heroui/react"
import { ToastProvider } from "@heroui/toast"
import { Navigate, Route, Routes } from "react-router-dom"
import Layout from "./components/Layout"
import Home from "./pages/Home"
import AuthPage from "./pages/AuthPage"
import NotFound from "./pages/NotFound"
import Player from "./pages/Player"

function App() {
  return (
    <HeroUIProvider>
      <ToastProvider />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode={"login"} />} />
          <Route path="/player/:id" element={<Player />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </HeroUIProvider>
  )
}

export default App
