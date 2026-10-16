import { heroui } from "@heroui/react"

// The colors of the app (frontend/hero.ts)
export default heroui({
  themes: {
    light: {
      colors: {
        background: "#F6F5FB",
        primary: { DEFAULT: "#6D4AFF", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#0EA5E9", foreground: "#FFFFFF" },
        focus: "#6D4AFF"
      }
    },
    dark: {
      colors: {
        background: "#07060D",
        primary: { DEFAULT: "#8B6CFF", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#38BDF8", foreground: "#07060D" },
        focus: "#8B6CFF"
      }
    }
  }
})
