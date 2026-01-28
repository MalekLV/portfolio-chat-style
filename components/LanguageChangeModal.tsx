// components/LanguageChangeModal.tsx
"use client"

import { X } from "lucide-react"
import { useLanguageStore } from "../lib/languageStore"

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  targetLanguage: "fr" | "en"
}

export default function LanguageChangeModal({ isOpen, onClose, onConfirm, targetLanguage }: Props) {
  const t = useLanguageStore(s => s.t)
  
  if (!isOpen) return null

  const isFrenchToEnglish = targetLanguage === "en"

  const content = {
    title: isFrenchToEnglish ? "Change Language" : "Changer de langue",
    message: isFrenchToEnglish 
      ? "Are you sure you want to change the site language to English? All content will be translated."
      : "Êtes-vous sûr de vouloir changer la langue du site en français ? Tout le contenu sera traduit.",
    confirm: isFrenchToEnglish ? "Continue" : "Continuer",
    cancel: isFrenchToEnglish ? "Cancel" : "Annuler"
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
        style={{ top: 0, bottom: 0 }}
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-brown-dark rounded-lg shadow-custom-xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-brown-darkest">
            <h2 className="text-lg md:text-xl font-semibold text-brown-light">
              {content.title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-brown-dark rounded transition-colors text-brown-light opacity-80 hover:opacity-100"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Message */}
          <div className="p-6">
            <p className="text-brown-light opacity-90 font-medium text-base md:text-lg">
              {content.message}
            </p>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 p-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm md:text-base bg-delete-button text-white rounded-lg bg-delete-button-hover transition-colors shadow-custom-md font-semibold"
            >
              {content.cancel}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="px-4 py-2 text-sm md:text-base bg-blue-dark text-white rounded-lg bg-blue-dark-hover transition-colors shadow-custom-md font-semibold"
            >
              {content.confirm}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}