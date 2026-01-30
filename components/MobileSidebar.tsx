// components/MobileSidebar.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import Image from "next/image"
import { Zap, ZapOff } from "lucide-react"
import { useUIStore } from "../lib/uiStore"
import { useLanguageStore } from "../lib/languageStore"
import { useSettingsStore } from "../lib/settingsStore"
import ContactModal from "./ContactModal"

export default function MobileSidebar() {
  const open = useUIStore(s => s.mobileOpen)
  const toggle = useUIStore(s => s.toggleMobile)
  const pathname = usePathname()
  const t = useLanguageStore(s => s.t)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showLinkedInTooltip, setShowLinkedInTooltip] = useState(false)
  const [showCVTooltip, setShowCVTooltip] = useState(false)
  const [showGitHubTooltip, setShowGitHubTooltip] = useState(false)

  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const toggleAnimations = useSettingsStore(s => s.toggleAnimations)

  const language = useLanguageStore(s => s.language)
  
  const links = [
    { href: "/", label: t("sidebar.home") },
    { href: "/formation", label: t("sidebar.formation") },
    { href: "/experiences", label: t("sidebar.experiences") },
    { href: "/competences", label: t("sidebar.competences") },
    { href: "/projets", label: t("sidebar.projets") },
    { href: "/personnel", label: t("sidebar.personnel") }
  ]

  function handleContactClick() {
    toggle()
    setShowContactModal(true)
  }

  function handleLinkedInClick(e: React.MouseEvent) {
    e.stopPropagation()
    window.open("https://www.linkedin.com/in/malek-le-velly/", "_blank")
  }

  function handleCVClick() {
    window.open("/LE-VELLY_Malek_CV.pdf", "_blank")
  }

  function handleGitHubClick() {
    window.open("https://github.com/MalekLV", "_blank")
  }

  return (
    <>
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: open ? 0 : "-100%" }}
        transition={{ duration: 0.25 }}
        className="fixed top-0 left-0 h-full w-72 bg-sidebar p-4 z-50 md:hidden flex flex-col shadow-custom-lg"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-sidebar">{t("sidebar.title")}</h2>
        </div>

        <nav className="space-y-1 flex-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={toggle}
              className={`block px-4 py-4 rounded-lg text-lg transition-all ${
                pathname === link.href
                  ? "bg-sidebar-selected text-sidebar font-semibold shadow-custom-sm"
                  : "text-sidebar hover:bg-sidebar-selected hover:bg-opacity-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t-2 border-sidebar space-y-2">
          {/* Bouton Animation */}
          <button
            onClick={toggleAnimations}
            className="w-full px-4 py-3 rounded-lg text-lg hover:bg-sidebar-selected hover:bg-opacity-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-button-plus flex items-center justify-center flex-shrink-0 shadow-custom-sm">
              {animationsEnabled ? (
                <Zap size={20} className="text-on-dark" />
              ) : (
                <ZapOff size={20} className="text-on-dark" />
              )}
            </div>
            
            <span className="flex-1 text-left font-bold text-sidebar">
              {t("sidebar.animations")}
            </span>
          </button>

          {/* Section Liens - CV, LinkedIn, GitHub (3 cercles horizontaux) */}
          <div className="flex items-center gap-3 px-4 py-2">
            {/* Bouton CV avec texte */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCVClick}
                className="w-12 h-12 rounded-full bg-brown-ring hover:bg-opacity-70 transition-all flex items-center justify-center shadow-custom-sm"
              >
                <div className="w-10 h-10 rounded-full bg-brown-ring flex items-center justify-center">
                  <Image
                    src="/upload.png"
                    alt="CV"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                    unoptimized
                  />
                </div>
              </button>
              <span className="text-sidebar font-bold text-base">CV</span>
            </div>

            {/* Bouton LinkedIn */}
            <button
              onClick={handleLinkedInClick}
              className="w-12 h-12 rounded-full bg-brown-ring hover:bg-opacity-70 transition-all flex items-center justify-center shadow-custom-sm"
            >
              <div className="w-10 h-10 rounded-full bg-brown-ring flex items-center justify-center">
                <Image
                  src="/linkedin.jpg"
                  alt="LinkedIn"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                  unoptimized
                />
              </div>
            </button>

            {/* Bouton GitHub */}
            <button
              onClick={handleGitHubClick}
              className="w-12 h-12 rounded-full bg-brown-ring hover:bg-opacity-70 transition-all flex items-center justify-center shadow-custom-sm"
            >
              <div className="w-10 h-10 rounded-full bg-brown-ring flex items-center justify-center">
                <Image
                  src="/github.png"
                  alt="GitHub"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                  unoptimized
                />
              </div>
            </button>
          </div>

          {/* Bouton Contact */}
          <div className="relative">
            <div
              onClick={handleContactClick}
              className="w-full px-4 py-3 rounded-lg text-lg hover:bg-sidebar-selected hover:bg-opacity-50 transition-colors flex items-center gap-3 cursor-pointer"
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
      </motion.aside>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </>
  )
}