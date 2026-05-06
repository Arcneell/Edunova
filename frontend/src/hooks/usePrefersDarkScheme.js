/**
 * Préférence système clair / sombre (pour palettes SVG hors variables CSS fragiles).
 *
 * Thème sombre désactivé temporairement (UI cassée) : on force toujours le mode
 * clair. Pour réactiver, restaurer l'implémentation basée sur `useSyncExternalStore`
 * + `matchMedia('(prefers-color-scheme: dark)')`.
 */
export function usePrefersDarkScheme() {
  return false
}
