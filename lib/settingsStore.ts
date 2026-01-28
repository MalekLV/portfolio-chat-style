// lib/settingsStore.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

type SettingsStore = {
  animationsEnabled: boolean
  toggleAnimations: () => void
  setAnimations: (value: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      animationsEnabled: true,
      toggleAnimations: () =>
        set((state) => ({ animationsEnabled: !state.animationsEnabled })),
      setAnimations: (value) => set({ animationsEnabled: value })
    }),
    {
      name: "portfolio-settings"
    }
  )
)