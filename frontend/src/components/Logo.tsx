import logoBlue from '../assets/brand/logo-blue.png'
import logoWhite from '../assets/brand/logo-white.png'

interface LogoProps {
  variant?: 'blue' | 'white'
  className?: string
}

/**
 * Isotipo oficial AIESEC Alumni Bolivia (Manual de Marca Polaris 26.27).
 * No deformar (se respeta el aspect-ratio vía h-* + w-auto) ni recolorear.
 */
export function Logo({ variant = 'blue', className = 'h-10 w-auto' }: LogoProps) {
  const src = variant === 'white' ? logoWhite : logoBlue
  return <img src={src} alt="AIESEC Alumni Bolivia" className={className} draggable={false} />
}
