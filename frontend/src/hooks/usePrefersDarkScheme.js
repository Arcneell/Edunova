import { useSyncExternalStore } from 'react'

function subscribe(callback) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getServerSnapshot() {
  return false
}

/** Préférence système clair / sombre (pour palettes SVG hors variables CSS fragiles). */
export function usePrefersDarkScheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
