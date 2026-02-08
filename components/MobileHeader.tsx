// components/MobileHeader.tsx
"use client"

import { useState, useEffect } from "react"
import { useUIStore } from "../lib/uiStore"
import { useLanguageStore } from "../lib/languageStore"
import LanguageChangeModal from "./LanguageChangeModal"

export default function MobileHeader() {
  const open = useUIStore(s => s.mobileOpen)
  const toggle = useUIStore(s => s.toggleMobile)
  const language = useLanguageStore(s => s.language)
  const t = useLanguageStore(s => s.t)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [pendingLanguage, setPendingLanguage] = useState<"fr" | "en" | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Éviter les erreurs d'hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleLanguageClick = (newLanguage: "fr" | "en") => {
    if (newLanguage !== language) {
      setPendingLanguage(newLanguage)
      setShowLanguageModal(true)
    }
  }

  const confirmLanguageChange = () => {
    if (pendingLanguage) {
      useLanguageStore.getState().setLanguage(pendingLanguage)
      setPendingLanguage(null)
    }
  }

  // Placeholder pendant l'hydration
  if (!isClient) {
    return (
      <header className="md:hidden bg-sidebar px-4 py-3 flex items-center justify-between shadow-custom-sm">
        <h1 className="font-bold text-xl text-sidebar">Le Velly Malek</h1>
        <div className="flex items-center gap-3">
          {/* Placeholder vide pendant l'hydration */}
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="md:hidden bg-sidebar px-4 py-3 flex items-center justify-between shadow-custom-sm">
        <h1 className="font-bold text-xl text-sidebar">{t("app.title")}</h1>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center bg-toggle rounded-full p-0.5 cursor-pointer shadow-custom-sm"
          >
            <div
              onClick={() => handleLanguageClick("fr")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                language === "fr"
                  ? "bg-toggle-active text-on-dark"
                  : "text-brown-light opacity-70"
              }`}
              style={language !== "fr" ? { backgroundColor: 'transparent' } : {}}
            >
              fr
            </div>

            <div
              onClick={() => handleLanguageClick("en")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                language === "en"
                  ? "bg-toggle-active text-on-dark"
                  : "text-brown-light opacity-70"
              }`}
              style={language !== "en" ? { backgroundColor: 'transparent' } : {}}
            >
              en
            </div>
          </div>

          <button
            onClick={toggle}
            className="p-2 hover:bg-sidebar-selected hover:bg-opacity-50 rounded transition-colors relative w-10 h-10 flex items-center justify-center"
            aria-label={open ? t("mobile.closeMenu") : t("mobile.openMenu")}
          >
            <span
              className={`absolute h-0.5 w-6 transition-all duration-300 ease-in-out ${
                open ? "rotate-45 top-1/2 -translate-y-1/2" : "top-2.5"
              }`}
              style={{ backgroundColor: '#E8E3DC' }}
            />
            
            <span
              className={`absolute h-0.5 w-6 transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 ${
                open ? "opacity-0 scale-0" : "opacity-100 scale-100"
              }`}
              style={{ backgroundColor: '#E8E3DC' }}
            />
            
            <span
              className={`absolute h-0.5 w-6 transition-all duration-300 ease-in-out ${
                open ? "-rotate-45 top-1/2 -translate-y-1/2" : "bottom-2.5"
              }`}
              style={{ backgroundColor: '#E8E3DC' }}
            />
          </button>
        </div>
      </header>

      <LanguageChangeModal
        isOpen={showLanguageModal}
        onClose={() => {
          setShowLanguageModal(false)
          setPendingLanguage(null)
        }}
        onConfirm={confirmLanguageChange}
        targetLanguage={pendingLanguage || "fr"}
      />
    </>
  )
}