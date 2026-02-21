// components/Sidebar.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Zap, ZapOff, FileText, Linkedin, Github } from "lucide-react"
import { useLanguageStore } from "../lib/languageStore"
import { useSettingsStore } from "../lib/settingsStore"
import ContactModal from "./ContactModal"

export default function Sidebar() {
  const pathname = usePathname()
  const t = useLanguageStore(s => s.t)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showLinkedInTooltip, setShowLinkedInTooltip] = useState(false)
  const [showAnimationTooltip, setShowAnimationTooltip] = useState(false)
  const [showCVTooltip, setShowCVTooltip] = useState(false)
  const [showGitHubTooltip, setShowGitHubTooltip] = useState(false)
  const [isClient, setIsClient] = useState(false)

  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const toggleAnimations = useSettingsStore(s => s.toggleAnimations)

  const language = useLanguageStore(s => s.language)
  
  // Éviter les erreurs d'hydration en attendant le montage côté client
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const links = [
    { href: "/", label: t("sidebar.home") },
    { href: "/formation", label: t("sidebar.formation") },
    { href: "/experiences", label: t("sidebar.experiences") },
    { href: "/competences", label: t("sidebar.competences") },
    { href: "/projets", label: t("sidebar.projets") },
    { href: "/personnel", label: t("sidebar.personnel") }
  ]

  function handleLinkedInClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (language === "en") {
      window.open("https://www.linkedin.com/in/malek-le-velly/", "_blank")
    } else {
      window.open("https://www.linkedin.com/in/malek-le-velly/?locale=en-US", "_blank")
    }
  }

  function handleCVClick() {
    if (language === "en") {
      window.open("/CV/LE-VELLY_Malek_CV_EN.pdf", "_blank")
    } else {
      window.open("/CV/LE-VELLY_Malek_CV_FR.pdf", "_blank")
    }
  }

  function handleGitHubClick() {
    window.open("https://github.com/MalekLV", "_blank")
  }

  // Afficher un placeholder pendant l'hydration
  if (!isClient) {
    return (
      <aside className="w-80 bg-sidebar p-4 hidden md:flex md:flex-col shadow-custom-md">
        <h1 className="mb-6 font-bold text-2xl text-sidebar">Portfolio</h1>
        <nav className="space-y-1 flex-1">
          {/* Placeholder vide pendant l'hydration */}
        </nav>
      </aside>
    )
  }

  return (
    <>
      <aside className="w-80 bg-sidebar p-4 hidden md:flex md:flex-col shadow-custom-md">
        <h1 className="mb-6 font-bold text-2xl text-sidebar">{t("sidebar.title")}</h1>

        <nav className="space-y-1 flex-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-4 rounded-lg text-xl transition-all ${
                pathname === link.href
                  ? "bg-sidebar-selected text-sidebar font-semibold shadow-custom-sm"
                  : "text-sidebar hover:bg-sidebar-selected hover:bg-opacity-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          {/* Bouton Animation */}
          <div className="relative">
            <button
              onClick={toggleAnimations}
              onMouseEnter={() => setShowAnimationTooltip(true)}
              onMouseLeave={() => setShowAnimationTooltip(false)}
              className="w-full px-4 py-3 rounded-lg text-xl hover:bg-sidebar-selected hover:bg-opacity-50 transition-colors flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-brown-ring hover:bg-opacity-70 transition-all flex items-center justify-center flex-shrink-0 shadow-custom-sm">
                <div className="w-10 h-10 rounded-full bg-button-plus flex items-center justify-center">
                  {animationsEnabled ? (
                    <Zap size={20} className="text-on-dark" />
                  ) : (
                    <ZapOff size={20} className="text-on-dark" />
                  )}
                </div>
              </div>
              
              <span className="flex-1 text-left font-bold text-sidebar">
                {t("sidebar.animations")}
              </span>
            </button>

            {showAnimationTooltip && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg z-20 pointer-events-none">
                {animationsEnabled ? t("sidebar.animationsOn") : t("sidebar.animationsOff")}
              </div>
            )}
          </div>

          {/* Ligne de démarcation */}
          <div className="border-t-2 border-sidebar"></div>

          {/* Section Liens - CV, LinkedIn, GitHub */}
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            {/* Bouton CV avec texte */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative">
                <button
                  onClick={handleCVClick}
                  onMouseEnter={() => setShowCVTooltip(true)}
                  onMouseLeave={() => setShowCVTooltip(false)}
                  className="w-12 h-12 rounded-full bg-brown-ring hover:bg-opacity-70 transition-all flex items-center justify-center shadow-custom-sm group"
                >
                  <div className="w-10 h-10 rounded-full bg-brown-link group-hover:bg-[#4A3A28] transition-colors flex items-center justify-center">
                    <FileText size={20} className="text-on-dark" />
                  </div>
                </button>

                {showCVTooltip && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg z-20 pointer-events-none">
                    {t("sidebar.cvTooltip")}
                  </div>
                )}
              </div>
              <span className="text-sidebar font-bold text-lg whitespace-nowrap">CV</span>
            </div>

            {/* Bouton LinkedIn */}
            <div className="relative">
              <button
                onClick={handleLinkedInClick}
                onMouseEnter={() => setShowLinkedInTooltip(true)}
                onMouseLeave={() => setShowLinkedInTooltip(false)}
                className="w-12 h-12 rounded-full bg-brown-ring hover:bg-opacity-70 transition-all flex items-center justify-center shadow-custom-sm group"
              >
                <div className="w-10 h-10 rounded-full bg-brown-link group-hover:bg-[#4A3A28] transition-colors flex items-center justify-center">
                  <Linkedin size={20} className="text-on-dark" />
                </div>
              </button>

              {showLinkedInTooltip && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg z-20 pointer-events-none">
                  {t("sidebar.linkedinTooltip")}
                </div>
              )}
            </div>

            {/* Bouton GitHub */}
            <div className="relative">
              <button
                onClick={handleGitHubClick}
                onMouseEnter={() => setShowGitHubTooltip(true)}
                onMouseLeave={() => setShowGitHubTooltip(false)}
                className="w-12 h-12 rounded-full bg-brown-ring hover:bg-opacity-70 transition-all flex items-center justify-center shadow-custom-sm group"
              >
                <div className="w-10 h-10 rounded-full bg-brown-link group-hover:bg-[#4A3A28] transition-colors flex items-center justify-center">
                  <Github size={20} className="text-on-dark" />
                </div>
              </button>

              {showGitHubTooltip && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg z-20 pointer-events-none">
                  {t("sidebar.githubTooltip")}
                </div>
              )}
            </div>
          </div>

          {/* Bouton Contact */}
          <div className="relative">
            <div
              onClick={() => setShowContactModal(true)}
              className="w-full px-4 py-3 rounded-lg text-xl hover:bg-sidebar-selected hover:bg-opacity-50 transition-colors flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-sidebar shadow-custom-sm">
                <Image
                  src="/photoprofile.jpg"
                  alt="Photo de profil"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              
              <span className="flex-1 font-bold text-sidebar">{t("sidebar.contact")}</span>
            </div>
          </div>
        </div>
      </aside>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </>
  )
}