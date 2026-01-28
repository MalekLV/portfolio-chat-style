// lib/useLanguageSync.ts
import { useEffect, useRef } from "react"
import { useLanguageStore } from "./languageStore"
import { useChatStore } from "./chatStore"
import { getQuestionById, getQuestionTitle } from "./questionHelper"

/**
 * Hook qui synchronise les conversations avec la langue actuelle
 * Quand la langue change, recharge toutes les questions/réponses
 */
export function useLanguageSync() {
  const language = useLanguageStore(s => s.language)
  const previousLanguage = useRef(language)
  const isReloading = useRef(false)

  useEffect(() => {
    // Si la langue n'a pas changé, ne rien faire
    if (previousLanguage.current === language) {
      return
    }

    // Éviter les recharges multiples simultanées
    if (isReloading.current) {
      return
    }

    isReloading.current = true

    // La langue a changé, on doit recharger toutes les conversations
    const reloadConversations = async () => {
      // Récupérer l'état actuel des conversations
      const currentConversations = useChatStore.getState().conversations
      const newConversations: Record<string, any[]> = {}

      for (const [pageId, messages] of Object.entries(currentConversations)) {
        const newMessages: any[] = []

        for (const message of messages) {
          if (message.role === "user") {
            // Pour les messages utilisateur, traduire le titre si c'est une question connue
            if (message.questionId) {
              const question = getQuestionById(message.questionId)
              if (question) {
                newMessages.push({
                  ...message,
                  content: getQuestionTitle(question, language)
                })
                continue
              }
            }
            
            // Message texte libre, chercher la question correspondante
            const allQuestions = await import("../data/questions.json")
            const question = allQuestions.default.find((q: any) => {
              const titleFr = q.title_fr?.toLowerCase()
              const titleEn = q.title_en?.toLowerCase()
              const msgContent = message.content.toLowerCase()
              return titleFr === msgContent || titleEn === msgContent
            })

            if (question) {
              newMessages.push({
                ...message,
                content: getQuestionTitle(question, language),
                questionId: question.id // Ajouter l'ID si manquant
              })
            } else {
              newMessages.push(message)
            }
          } else {
            // Pour les messages bot, recharger le contenu dans la nouvelle langue
            if (message.questionId && message.questionId !== "fallback") {
              try {
                const res = await fetch(`/api/content?id=${message.questionId}&lang=${language}`)
                const content = await res.text()
                newMessages.push({
                  ...message,
                  content
                })
              } catch (error) {
                console.error(`Erreur lors du rechargement de ${message.questionId}:`, error)
                newMessages.push(message)
              }
            } else if (message.questionId === "introduction") {
              // Message d'introduction
              const t = useLanguageStore.getState().t
              newMessages.push({
                ...message,
                content: t("home.greeting")
              })
            } else if (message.questionId === "fallback") {
              // Message d'erreur
              const t = useLanguageStore.getState().t
              newMessages.push({
                ...message,
                content: t("chat.fallback")
              })
            } else {
              // Autres messages sans questionId
              newMessages.push(message)
            }
          }
        }

        newConversations[pageId] = newMessages
      }

      // Mettre à jour toutes les conversations d'un coup
      useChatStore.setState({ conversations: newConversations })
      
      // Forcer l'arrêt de l'animation en cours pour recharger avec la nouvelle langue
      useChatStore.setState({ 
        isTyping: false,
        shouldSkip: false
      })
      
      isReloading.current = false
    }

    reloadConversations()
    previousLanguage.current = language
  }, [language])
}