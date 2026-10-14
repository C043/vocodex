// Tailwind classes for the reader font sizes, 1 to 4
const SIZE_CLASSES: Record<number, string> = {
  1: "text-lg md:text-xl",
  2: "text-xl md:text-2xl",
  3: "text-2xl md:text-3xl",
  4: "text-3xl md:text-4xl"
}

export const fontSizeClasses = (size: number) =>
  SIZE_CLASSES[size] ?? SIZE_CLASSES[1]
