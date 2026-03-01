'use client'

import { useEffect } from 'react'

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Hide the main website header and footer when in console
    const header = document.querySelector('header')
    const footer = document.querySelector('footer')
    const main = document.querySelector('main')
    
    if (header) header.style.display = 'none'
    if (footer) footer.style.display = 'none'
    if (main) {
      main.style.minHeight = '100vh'
      main.style.padding = '0'
    }

    return () => {
      // Restore when leaving console
      if (header) header.style.display = ''
      if (footer) footer.style.display = ''
      if (main) {
        main.style.minHeight = ''
        main.style.padding = ''
      }
    }
  }, [])

  return <>{children}</>
}
