// lib/chatStore.ts
import { create } from "zustand"

export type Message = {
  role: "user" | "bot"
  content: string
  questionId?: string
}

type ChatStore = {
  conversations: Record<string, Message[]>
  
  // suppression
  deletePairAt: (pageId: string, index: number) => void
  
  // confirmation
  skipDeleteConfirm: boolean
  setSkipDeleteConfirm: (value: boolean) => void
  
  addMessage: (pageId: string, message: Message) => void
  
  // Animation
  isTyping: boolean
  setIsTyping: (value: boolean) => void
  skipTyping: () => void
  shouldSkip: boolean
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: {},
  
  skipDeleteConfirm: false,
  setSkipDeleteConfirm: (value) =>
    set({ skipDeleteConfirm: value }),
  
  addMessage: (pageId, message) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [pageId]: [
          ...(state.conversations[pageId] || []),
          message
        ]
      }
    })),
  
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
  skipTyping: () => set({ shouldSkip: true })
}))