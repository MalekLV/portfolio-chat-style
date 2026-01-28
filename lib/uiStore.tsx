// lib/uiStore.tsx
"use client"

import { create } from "zustand"

type UIState = {
  mobileOpen: boolean
  toggleMobile: () => void
  closeMobile: () => void
}

export const useUIStore = create<UIState>((set) => ({
  mobileOpen: false,
  toggleMobile: () =>
    set((state) => ({ mobileOpen: !state.mobileOpen })),
  closeMobile: () => set({ mobileOpen: false })
}))
