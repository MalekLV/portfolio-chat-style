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
        <title>Portfolio</title>
        <meta name="description" content="Portfolio interactif" />
      </head>
      <body className="h-screen overflow-hidden bg-main text-primary">
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}