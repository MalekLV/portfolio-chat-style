// app/competences/page.tsx
"use client"

import { useEffect, useRef } from "react"
import ChatWindow from "../../components/ChatWindow"
import ChatInput from "../../components/ChatInput"
import { useChatStore } from "../../lib/chatStore"
import { useLanguageStore } from "../../lib/languageStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"

export default function CompetencesPage() {
  const pageId = "competences"

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
        content: questionTitle
      })

      // Vérifier si la question est de type interactive
      if (question.type === "interactive" && question.component) {
        // Charger le composant interactif directement
        addMessage(pageId, {
          role: "bot",
          content: "",
          questionId: pageId,
          type: "interactive",
          componentName: question.component,
          data: {}
        })
      } else {
        // Fallback sur le contenu Markdown
        const res = await fetch(`/api/content?id=${pageId}&lang=${language}`)
        const markdown = await res.text()

        addMessage(pageId, {
          role: "bot",
          content: markdown,
          questionId: pageId
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