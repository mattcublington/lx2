// Extends the global WindowEventMap with LX2-specific custom events
// so window.addEventListener('lx2:sync-start', ...) is fully typed.
declare global {
  interface WindowEventMap {
    'lx2:sync-start': CustomEvent
    'lx2:sync-complete': CustomEvent
  }
}

export {}
