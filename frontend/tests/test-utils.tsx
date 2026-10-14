import { ReactElement } from "react"
import { render, RenderOptions } from "@testing-library/react"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import { HeroUIProvider } from "@heroui/react"
import { configureStore } from "@reduxjs/toolkit"
import authReducer, { UserPreferences } from "../src/redux/reducer/authSlice"
import themeModeSlice from "../src/redux/reducer/themeModeSlice"
import focusModeReducer from "../src/redux/reducer/focusModeSlice"

type UserState = ReturnType<typeof authReducer>

// Fields not given keep the slice's initial values
type PreloadedUser = Partial<Omit<UserState, "preferences">> & {
  preferences?: Partial<UserPreferences>
}

export function createTestStore(user?: PreloadedUser) {
  const initialUser = authReducer(undefined, { type: "@@INIT" })

  return configureStore({
    reducer: {
      user: authReducer,
      darkMode: themeModeSlice,
      focusMode: focusModeReducer
    },
    preloadedState: user && {
      user: {
        ...initialUser,
        ...user,
        preferences: { ...initialUser.preferences, ...user.preferences }
      }
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
