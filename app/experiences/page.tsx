// app/experiences/page.tsx
"use client"

import { useEffect, useRef } from "react"
import ChatWindow from "../../components/ChatWindow"
import ChatInput from "../../components/ChatInput"
import { useChatStore } from "../../lib/chatStore"
import { useLanguageStore } from "../../lib/languageStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"

export default function ExperiencesPage() {
  const pageId = "experiences"

  const messages = useChatStore(s => s.conversations[pageId])
  const addMessage = useChatStore(s => s.addMessage)
  const language = useLanguageStore(s => s.language)

  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initConversation = async () => {
      if (messages && messages.length > 0) return

      const question = getQuestionById(pageId)

      if (!question) {
        console.error(`Question '${pageId}' introuvable`)
        return
      }

      const questionTitle = getQuestionTitle(question, language)

      addMessage(pageId, {
        role: "user",
        content: questionTitle,
        questionId: pageId
      })

      // Vérifier si c'est une question interactive
      if (question.type === "interactive" && question.component) {
        // Pour les questions interactives, créer directement le message avec le composant
        addMessage(pageId, {
          role: "bot",
          content: "",
          questionId: pageId,
          type: "interactive",
          componentName: question.component,
          data: {}
        })
      } else {
        // Question textuelle classique
        const res = await fetch(`/api/content?id=${pageId}&lang=${language}`)
        const markdown = await res.text()

        addMessage(pageId, {
          role: "bot",
          content: markdown,
          questionId: pageId,
          type: "text"
        })
      }
    }

    initConversation()
  }, [messages, addMessage, pageId, language])

  return (
    <>
      <ChatWindow pageId={pageId} />
      <ChatInput pageId={pageId} />
    </>
  )
}