// components/PageHeader.tsx
"use client"

import { useState } from "react"
import { useLanguageStore } from "../lib/languageStore"
import LanguageChangeModal from "./LanguageChangeModal"

export default function PageHeader() {
  const language = useLanguageStore(s => s.language)
  const t = useLanguageStore(s => s.t)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [pendingLanguage, setPendingLanguage] = useState<"fr" | "en" | null>(null)

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

  return (
    <>
      <header className="hidden md:flex flex-col items-center pt-4 pb-3 bg-main relative fade-to-bottom">
        <h1 className="font-bold text-3xl mb-3 text-header-title">
          {t("app.title")}
        </h1>

        <div className="relative">
          <div
            className="flex items-center bg-toggle rounded-full p-1 cursor-pointer shadow-custom-md"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div
              onClick={() => handleLanguageClick("fr")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                language === "fr"
                  ? "bg-toggle-active text-on-dark shadow-custom-sm"
                  : "text-brown-light opacity-70"
              }`}
              style={language !== "fr" ? { backgroundColor: 'transparent' } : {}}
            >
              français
            </div>

            <div
              onClick={() => handleLanguageClick("en")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                language === "en"
                  ? "bg-toggle-active text-on-dark shadow-custom-sm"
                  : "text-brown-light opacity-70"
              }`}
              style={language !== "en" ? { backgroundColor: 'transparent' } : {}}
            >
              english
            </div>
          </div>

          {showTooltip && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg z-20">
              {t("header.changeLanguage")}
            </div>
          )}
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