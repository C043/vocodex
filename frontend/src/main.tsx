import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import App from "./App.tsx"
import { Provider } from "react-redux"
import store from "./redux/store/store"
import { registerServiceWorker } from "./registerServiceWorker"

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
)

registerServiceWorker()
