// components/OnboardingOverlay.tsx
"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useOnboardingStore } from "../lib/onboardingStore"
import { useLanguageStore } from "../lib/languageStore"

type OnboardingStep = {
  target: string // Sélecteur CSS de l'élément à highlight
  title: string
  description: string
  position: "top" | "bottom" | "left" | "right"
}

export default function OnboardingOverlay() {
  const { currentStep, isOnboardingActive, nextStep, skipOnboarding } = useOnboardingStore()
  const t = useLanguageStore(s => s.t)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const steps: Record<string, OnboardingStep> = {
    plusButton: {
      target: ".plus-button-onboarding",
      title: t("onboarding.plusButton.title"),
      description: t("onboarding.plusButton.description"),
      position: "top"
    },
    sidebar: {
      target: ".sidebar-nav-onboarding",
      title: t("onboarding.sidebar.title"),
      description: t("onboarding.sidebar.description"),
      position: "right"
    },
    animations: {
      target: ".animations-button-onboarding",
      title: t("onboarding.animations.title"),
      description: t("onboarding.animations.description"),
      position: "right"
    }
  }

  const currentStepConfig = currentStep !== "intro" && currentStep !== "completed" 
    ? steps[currentStep] 
    : null

  useEffect(() => {
    if (!isOnboardingActive || !currentStepConfig) {
      setTargetRect(null)
      return
    }

    // Trouver l'élément cible
    const updateTargetPosition = () => {
      const element = document.querySelector(currentStepConfig.target)
      if (element) {
        setTargetRect(element.getBoundingClientRect())
      }
    }

    updateTargetPosition()

    // Mettre à jour en cas de resize
    window.addEventListener("resize", updateTargetPosition)
    return () => window.removeEventListener("resize", updateTargetPosition)
  }, [currentStep, isOnboardingActive, currentStepConfig])

  if (!isOnboardingActive || currentStep === "completed" || currentStep === "intro") {
    return null
  }

  if (!currentStepConfig || !targetRect) {
    return null
  }

  // Calculer la position du tooltip
  const getTooltipPosition = () => {
    const padding = 16
    const tooltipWidth = 300

    switch (currentStepConfig.position) {
      case "top":
        return {
          top: targetRect.top - padding - 120,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        }
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        }
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          left: targetRect.left - tooltipWidth - padding
        }
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          left: targetRect.right + padding
        }
    }
  }

  const tooltipPosition = getTooltipPosition()

  return (
    <>
      {/* Overlay sombre avec découpe */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background: `radial-gradient(
            circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px,
            transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 10}px,
            rgba(0, 0, 0, 0.7) ${Math.max(targetRect.width, targetRect.height) / 2 + 30}px
          )`
        }}
      />

      {/* Highlight autour de l'élément */}
      <div
        className="fixed z-50 border-4 border-blue-500 rounded-xl pointer-events-none animate-pulse"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)"
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-50 bg-blue-dark text-white rounded-xl shadow-2xl p-4 animate-fade-in"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: 300
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg">{currentStepConfig.title}</h3>
          <button
            onClick={skipOnboarding}
            className="text-white/70 hover:text-white transition-colors"
            aria-label={t("onboarding.skip")}
          >
            <X size={18} />
          </button>
        </div>
        
        <p className="text-sm text-white/90 mb-4">
          {currentStepConfig.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={skipOnboarding}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            {t("onboarding.skip")}
          </button>
          
          <button
            onClick={nextStep}
            className="px-4 py-2 bg-white text-blue-dark rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-md"
          >
            {t("onboarding.next")}
          </button>
        </div>
      </div>
    </>
  )
}