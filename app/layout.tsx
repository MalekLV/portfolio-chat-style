// app/layout.tsx
"use client"

import "./globals.css"
import { useLanguageSync } from "../lib/useLanguageSync"
import Sidebar from "../components/Sidebar"
import MobileSidebar from "../components/MobileSidebar"
import MobileHeader from "../components/MobileHeader"
import PageHeader from "../components/PageHeader"

function LayoutContent({ children }: { children: React.ReactNode }) {
  // Ce hook synchronise automatiquement les conversations avec la langue
  useLanguageSync()

  return (
    <div className="flex h-full">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Sidebar mobile */}
      <MobileSidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header mobile */}
        <MobileHeader />

        {/* Header desktop */}
        <PageHeader />

        {/* Pages */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <title>Le Velly Malek Portfolio</title>
        <meta name="description" content="Portfolio interactif" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* Favicon - Ton logo personnalisé */}
        <link rel="icon" type="image/png" href="/logo_portfolio.png" />
        
        {/* Différentes tailles pour une meilleure compatibilité */}
        <link rel="icon" type="image/png" sizes="16x16" href="/logo_portfolio.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo_portfolio.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo_portfolio.png" />
        
        {/* Apple Touch Icon pour iOS */}
        <link rel="apple-touch-icon" href="/logo_portfolio.png" />
        
        {/* Pour Android Chrome */}
        <meta name="theme-color" content="#4A5A3D" />
      </head>
      <body className="h-dvh overflow-hidden bg-main text-primary" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}