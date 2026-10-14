// True when a keyboard event comes from a text field, so global shortcuts
// (space, arrows, enter) don't hijack typing
export const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable)
