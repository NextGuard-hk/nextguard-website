'use client'

export default function QtLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Hide global header and footer on QT pages */
        body > div > header,
        body > div > footer,
        header.fixed,
        footer {
          display: none !important;
        }
        /* Remove top padding from main content since header is hidden */
        main.min-h-screen {
          padding-top: 0 !important;
        }
      `}</style>
      {children}
    </>
  )
}
