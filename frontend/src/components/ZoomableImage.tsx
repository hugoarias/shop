import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ZoomableImageProps {
  src: string
  alt: string
  className?: string
}

/** Imagen clicable que abre una vista ampliada en un overlay (portal a <body> para no quedar recortada por contenedores con overflow-hidden). */
export function ZoomableImage({ src, alt, className }: ZoomableImageProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block h-full w-full cursor-zoom-in"
        aria-label={`Ver imagen de ${alt} en grande`}
      >
        <img src={src} alt={alt} className={className} />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-3xl leading-none text-white hover:text-gray-300"
              aria-label="Cerrar"
            >
              &times;
            </button>
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
