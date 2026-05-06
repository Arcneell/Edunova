import { createPortal } from 'react-dom'

/**
 * Overlay plein écran rendu sur document.body afin de passer au-dessus de la navbar.
 * Les pages dashboard utilisent `.dash-scope { isolation: isolate }`, ce qui confine
 * les z-index des descendants : une modale `fixed` à l’intérieur ne peut plus rivaliser
 * avec la barre de navigation.
 */
export function ModalOverlayPortal({ children, className = 'course-map-modal__overlay', ...props }) {
  return createPortal(
    <div className={className} {...props}>
      {children}
    </div>,
    document.body,
  )
}
