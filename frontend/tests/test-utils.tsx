import { ReactElement } from "react"
import { render, RenderOptions } from "@testing-library/react"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import { HeroUIProvider } from "@heroui/react"
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../src/redux/reducer/authSlice"
import themeModeSlice from "../src/redux/reducer/themeModeSlice"

function createTestStore() {
  return configureStore({
    reducer: {
      user: authReducer,
      darkMode: themeModeSlice
    }
  })
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  store?: ReturnType<typeof createTestStore>
}

function customRender(
  ui: ReactElement,
  { store = createTestStore(), ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <HeroUIProvider>{children}</HeroUIProvider>
        </BrowserRouter>
      </Provider>
    )
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}

export * from "@testing-library/react"
export { customRender as render }
