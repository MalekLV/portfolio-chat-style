// lib/chatStore.ts
import { create } from "zustand"
import { Message } from "./types"

type ChatStore = {
  conversations: Record<string, Message[]>
  
  // suppression
  deletePairAt: (pageId: string, index: number) => void
  
  // confirmation
  skipDeleteConfirm: boolean
  setSkipDeleteConfirm: (value: boolean) => void
  
  addMessage: (pageId: string, message: Omit<Message, "id">) => void
  
  // Animation
  isTyping: boolean
  setIsTyping: (value: boolean) => void
  skipTyping: () => void
  shouldSkip: boolean
  
  // Flag pour bloquer le scroll pendant le toggle des composants interactifs
  isInteractiveToggling: boolean
  setIsInteractiveToggling: (value: boolean) => void
}

// Fonction helper pour générer des IDs uniques
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: {},
  
  skipDeleteConfirm: false,
  setSkipDeleteConfirm: (value) =>
    set({ skipDeleteConfirm: value }),
  
  addMessage: (pageId, message) =>
    set((state) => {
      const messageWithId: Message = {
        id: generateMessageId(),
        ...message
      }
      
      return {
        conversations: {
          ...state.conversations,
          [pageId]: [
            ...(state.conversations[pageId] || []),
            messageWithId
          ]
        }
      }
    }),
  
  deletePairAt: (pageId, index) =>
    set((state) => {
      const msgs = [...(state.conversations[pageId] || [])]
      
      // supprime message utilisateur + réponse bot
      msgs.splice(index, 2)
      
      return {
        conversations: {
          ...state.conversations,
          [pageId]: msgs
        }
      }
    }),
  
  // Animation
  isTyping: false,
  shouldSkip: false,
  setIsTyping: (value) => set({ isTyping: value }),
  skipTyping: () => set({ shouldSkip: true }),
  
  // Toggle interactif
  isInteractiveToggling: false,
  setIsInteractiveToggling: (value) => set({ isInteractiveToggling: value })
}))