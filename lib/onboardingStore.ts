// lib/onboardingStore.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

type OnboardingStep = "intro" | "plusButton" | "sidebar" | "animations" | "completed"

type OnboardingStore = {
  hasSeenOnboarding: boolean
  currentStep: OnboardingStep
  isOnboardingActive: boolean
  startOnboarding: () => void
  nextStep: () => void
  skipOnboarding: () => void
  setStep: (step: OnboardingStep) => void
}

const stepOrder: OnboardingStep[] = ["intro", "plusButton", "sidebar", "animations", "completed"]

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      hasSeenOnboarding: false,
      currentStep: "intro",
      isOnboardingActive: false,

      startOnboarding: () => {
        set({ 
          isOnboardingActive: true,
          currentStep: "intro"
        })
      },

      nextStep: () => {
        const current = get().currentStep
        const currentIndex = stepOrder.indexOf(current)
        
        if (currentIndex < stepOrder.length - 1) {
          set({ currentStep: stepOrder[currentIndex + 1] })
        } else {
          set({ 
            currentStep: "completed",
            isOnboardingActive: false,
            hasSeenOnboarding: true
          })
        }
      },

      skipOnboarding: () => {
        set({ 
          currentStep: "completed",
          isOnboardingActive: false,
          hasSeenOnboarding: true
        })
      },

      setStep: (step) => {
        set({ currentStep: step })
      }
    }),
    {
      name: "portfolio-onboarding"
    }
  )
)