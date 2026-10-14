// Registers the offline-capable service worker so the app can be installed.
// Skipped in development, where it would serve stale Vite modules.
export function registerServiceWorker(
  nav: Navigator = navigator,
  isProduction: boolean = import.meta.env.PROD
) {
  if (!isProduction || !("serviceWorker" in nav)) return

  window.addEventListener("load", () => {
    nav.serviceWorker.register("/sw.js").catch(() => {})
  })
}
