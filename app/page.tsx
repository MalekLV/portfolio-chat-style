// app/page.tsx
"use client"

import { useEffect, useRef } from "react"
import ChatWindow from "../components/ChatWindow"
import ChatInput from "../components/ChatInput"
import { useChatStore } from "../lib/chatStore"
import { useLanguageStore } from "../lib/languageStore"

export default function HomePage() {
  const pageId = "home"

  const messages = useChatStore(s => s.conversations[pageId])
  const addMessage = useChatStore(s => s.addMessage)
  const t = useLanguageStore(s => s.t)

  const language = useLanguageStore(s => s.language)
  const hasInitialized = useRef(false)

  useEffect(() => {
    const initConversation = () => {
      // Vérifier si déjà des messages
      if (messages && messages.length > 0) {
        hasInitialized.current = true
        return
      }

      // Éviter la double initialisation
      if (hasInitialized.current) return
      hasInitialized.current = true

      addMessage(pageId, {
        role: "bot",
        content: t("home.greeting"),
        questionId: "introduction"
      })
    }

    initConversation()
  }, [messages, addMessage, pageId, t])

  // Reset lors du changement de langue pour permettre la retraduction
  useEffect(() => {
    if (hasInitialized.current && messages && messages.length > 0) {
      // Ne pas réinitialiser, la traduction est gérée par useLanguageSync
    }
  }, [language, messages])

  return (
    <>
      <ChatWindow pageId={pageId} />
      <ChatInput pageId={pageId} />
    </>
  )
}