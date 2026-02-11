// components/ChatWindow.tsx
"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useChatStore } from "../lib/chatStore"
import { useLanguageStore } from "../lib/languageStore"
import { useSettingsStore } from "../lib/settingsStore"
import { getQuestions, getQuestionTitle, getQuestionById } from "../lib/questionHelper"
import { Question } from "../lib/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Image from "next/image"
import { InteractiveComponent } from "./interactive"

type Props = {
  pageId: string
}

// Type pour une bulle de message avec ses propositions optionnelles
type MessageBubble = {
  content: string
  suggestionsAfter?: string[] // IDs des questions à proposer après cette bulle
}

// Fonction pour diviser le contenu en bulles multiples avec propositions
function splitIntoBubblesWithSuggestions(content: string): MessageBubble[] {
  const bubbles: MessageBubble[] = []
  const parts = content.split('%')
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    if (part.length === 0) continue
    
    // Vérifier si le texte commence par un chiffre
    const match = part.match(/^(\d+)(.*)$/s)
    
    if (match && i > 0) {
      // Il y a un chiffre au début (et ce n'est pas la première partie)
      const suggestionIndex = parseInt(match[1], 10)
      const textContent = match[2].trim()
      
      // Ajouter les suggestions à la bulle précédente
      if (bubbles.length > 0) {
        if (!bubbles[bubbles.length - 1].suggestionsAfter) {
          bubbles[bubbles.length - 1].suggestionsAfter = []
        }
        bubbles[bubbles.length - 1].suggestionsAfter!.push(String(suggestionIndex))
      }
      
      // Ajouter la bulle actuelle si elle a du contenu
      if (textContent) {
        bubbles.push({ content: textContent })
      }
    } else {
      // Pas de chiffre, bulle normale
      bubbles.push({ content: part })
    }
  }
  
  return bubbles
}

export default function ChatWindow({ pageId }: Props) {
  const messages = useChatStore(s => s.conversations[pageId] || [])
  const addMessage = useChatStore(s => s.addMessage)
  const deletePairAt = useChatStore(s => s.deletePairAt)
  const setIsTyping = useChatStore(s => s.setIsTyping)
  const isTyping = useChatStore(s => s.isTyping)
  const shouldSkip = useChatStore(s => s.shouldSkip)
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const isInteractiveToggling = useChatStore(s => s.isInteractiveToggling)
  const isInteractiveTogglingRef = useRef(isInteractiveToggling)
  useEffect(() => {
    isInteractiveTogglingRef.current = isInteractiveToggling
  }, [isInteractiveToggling])

  const skipDeleteConfirm = useChatStore(s => s.skipDeleteConfirm)
  const setSkipDeleteConfirm = useChatStore(s => s.setSkipDeleteConfirm)

  const language = useLanguageStore(s => s.language)
  const t = useLanguageStore(s => s.t)

  const [confirmIndex, setConfirmIndex] = useState<number | null>(null)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const [bubbles, setBubbles] = useState<Array<{
    initialX: number, 
    initialY: number, 
    x: number, 
    y: number, 
    size: number, 
    color: string
  }>>([])
  const [typingMessage, setTypingMessage] = useState<string>("")
  const [currentAnimatingIndex, setCurrentAnimatingIndex] = useState<number>(-1)
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [showDeleteTooltip, setShowDeleteTooltip] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  const isHomePage = pageId === "home"

  const questions = getQuestions()

  const lastBotIndex = useMemo(() => {
    return messages.map((m, i) => m.role === "bot" ? i : -1)
      .filter(i => i !== -1)
      .pop() ?? -1
  }, [messages])

  const lastBotMessage = lastBotIndex >= 0 ? messages[lastBotIndex] : null

  // Détecter les changements de contenu du dernier message (ex: traduction)
  const lastBotContent = lastBotMessage?.content || ""

  useEffect(() => {
    if (scrollRef.current) {
      // NE PAS scroller si un composant interactif est en train de toggler
      // On utilise la ref pour lire la valeur sans en faire une dépendance
      if (isInteractiveTogglingRef.current) {
        return
      }
      
      // Sur mobile, laisser un espace pour que l'input reste visible
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const offset = isMobile ? 150 : 0
      
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight
          const targetScroll = maxScroll - offset
          
          scrollRef.current.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          })
        }
      })
    }
  }, [messages, typingMessage])

  useEffect(() => {
    if (lastBotIndex < 0) {
      return
    }

    // Si le contenu du dernier message change (traduction), réinitialiser l'animation
    if (lastBotIndex === currentAnimatingIndex) {
      const botMessage = messages[lastBotIndex]
      if (botMessage && typingMessage && botMessage.content.trim() !== typingMessage) {
        // Le contenu a changé pendant l'animation, redémarrer
        setCurrentAnimatingIndex(-1)
        setTypingMessage("")
        return
      }
    }

    if (lastBotIndex === currentAnimatingIndex) {
      return
    }

    const botMessage = messages[lastBotIndex]
    if (!botMessage) return

    // Si c'est un message interactif, pas d'animation de typing
    if (botMessage.type === "interactive") {
      setCurrentAnimatingIndex(lastBotIndex)
      setIsTyping(false)
      return
    }

    const fullText = botMessage.content.trim()

    setCurrentAnimatingIndex(lastBotIndex)

    // Si les animations sont désactivées, afficher directement le texte
    if (!animationsEnabled) {
      setTypingMessage(fullText)
      setIsTyping(false)
      return
    }

    setIsTyping(true)

    const messageCount = messages.length
    const baseDelay = 10
    const minDelay = 2
    
    const adaptiveDelay = Math.max(minDelay, baseDelay - Math.floor(messageCount / 5) * 2)

    let currentIndex = 0

    const animate = () => {
      currentIndex = Math.min(currentIndex + 2, fullText.length)
      setTypingMessage(fullText.slice(0, currentIndex))
      
      if (currentIndex < fullText.length) {
        animationRef.current = setTimeout(animate, adaptiveDelay)
      } else {
        setIsTyping(false)
        animationRef.current = null
      }
    }

    animate()

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
        animationRef.current = null
      }
    }
  }, [lastBotIndex, messages.length, lastBotContent, setIsTyping, animationsEnabled])

  useEffect(() => {
    if (shouldSkip && lastBotIndex >= 0) {
      const botMessage = messages[lastBotIndex]
      if (botMessage && botMessage.type !== "interactive") {
        setTypingMessage(botMessage.content.trim())
        setIsTyping(false)
        
        if (animationRef.current) {
          clearTimeout(animationRef.current)
          animationRef.current = null
        }

        useChatStore.setState({ shouldSkip: false })
      }
    }
  }, [shouldSkip, lastBotIndex, messages, setIsTyping])

  const isFirstAutoMessage = useCallback((index: number): boolean => {
    if (index !== 0) return false
    const firstMsg = messages[0]
    if (!firstMsg || firstMsg.role !== "user") return false
    
    const autoQuestions = ["formation", "experiences","competences", "projets", "contact", "personnel"]
    return autoQuestions.some(id => {
      const q = questions.find(q => q.id === id)
      if (!q) return false
      const titleFr = q.title_fr?.toLowerCase()
      const titleEn = q.title_en?.toLowerCase()
      const msgContent = firstMsg.content.toLowerCase()
      return titleFr === msgContent || titleEn === msgContent
    })
  }, [messages, questions])

  // Calcul des suggestions finales (en excluant celles déjà affichées)
  const finalSuggestedQuestions = useMemo(() => {
    let suggestions: any[] = []
    let usedSuggestionIndices: number[] = []

    if (lastBotMessage?.questionId === "introduction") {
      suggestions = ["presentation","explication"]
        .map(id => questions.find(q => q.id === id))
        .filter((q): q is Question => q !== null && q !== undefined)
    } 
    else if (lastBotMessage?.questionId === "fallback") {
      // Pour fallback, uniquement les 2 suggestions par défaut
      const fallbackQuestion = questions.find(q => q.id === "fallback question")
      const englishQuestion = questions.find(q => q.id === "changement langue")

      suggestions = [
        fallbackQuestion,
        englishQuestion
      ].filter((q): q is Question => q !== null && q !== undefined)
    } 
    else if (lastBotMessage?.questionId) {
      const currentQuestion = questions.find(
        q => q.id === lastBotMessage.questionId
      )

      if (currentQuestion?.id_associe) {
        // Récupérer les indices utilisés dans les bulles
        const messageBubbles = splitIntoBubblesWithSuggestions(lastBotMessage.content || "")
        messageBubbles.forEach(bubble => {
          if (bubble.suggestionsAfter) {
            bubble.suggestionsAfter.forEach(indexStr => {
              const index = parseInt(indexStr, 10)
              if (!isNaN(index)) {
                usedSuggestionIndices.push(index)
              }
            })
          }
        })

        // Filtrer les suggestions pour exclure celles déjà utilisées
        suggestions = currentQuestion.id_associe
          .map((id, index) => {
            if (usedSuggestionIndices.includes(index)) {
              return null
            }
            return questions.find(q => q.id === id)
          })
          .filter((q): q is Question => q !== null && q !== undefined)
      } else {
        suggestions = []
      }
    }

    return suggestions
  }, [lastBotMessage, messages, questions])

  const handleSuggestionClick = useCallback(async (questionId: string) => {
    const question = questions.find(q => q.id === questionId)
    if (!question) return

    const questionTitle = getQuestionTitle(question, language)

    addMessage(pageId, { 
      role: "user", 
      content: questionTitle,
      questionId: questionId
    })

    // Vérifier si c'est une question interactive
    if (question.type === "interactive" && question.component) {
      // Pour les questions interactives, on crée directement le message avec le composant
      addMessage(pageId, {
        role: "bot",
        content: "", // Pas de contenu textuel pour les composants interactifs
        questionId: questionId,
        type: "interactive",
        componentName: question.component,
        data: {} // Les données seront gérées par le composant
      })
    } else {
      // Question textuelle classique
      const res = await fetch(`/api/content?id=${questionId}&lang=${language}`)
      const markdown = await res.text()

      addMessage(pageId, {
        role: "bot",
        content: markdown,
        questionId,
        type: "text"
      })
    }
  }, [pageId, addMessage, questions, language])

  const requestDelete = useCallback((index: number) => {
    if (skipDeleteConfirm) {
      executeDelete(index)
    } else {
      setConfirmIndex(index)
    }
  }, [skipDeleteConfirm])

  const executeDelete = useCallback((index: number) => {
    setDeletingIndex(index)
    
    // Récupérer tous les messages et trouver les éléments correspondants
    const allMessageContainers = document.querySelectorAll('.message-container')
    const botContainer = allMessageContainers[index] as HTMLElement
    const userContainer = allMessageContainers[index + 1] as HTMLElement
    
    if (!botContainer || !userContainer) {
      deletePairAt(pageId, index)
      setDeletingIndex(null)
      return
    }
    
    // Sélectionner TOUTES les bulles du message bot (chercher dans tout le container, pas juste les enfants directs)
    const botBubbles = botContainer.querySelectorAll('.bot-bubble-part, .interactive-component')
    
    const newBubbles: Array<{
      initialX: number, 
      initialY: number, 
      x: number, 
      y: number, 
      size: number, 
      color: string
    }> = []
    
    const generateBubblesFromElement = (element: HTMLElement, color: string, count: number) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      for (let i = 0; i < count; i++) {
        const startX = rect.left + Math.random() * rect.width
        const startY = rect.top + Math.random() * rect.height
        
        const dx = startX - centerX
        const dy = startY - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        const explosionDistance = Math.random() * 200 + 100
        const normalizedDx = distance > 0 ? dx / distance : Math.random() - 0.5
        const normalizedDy = distance > 0 ? dy / distance : Math.random() - 0.5
        
        const endX = startX + normalizedDx * explosionDistance
        const endY = startY + normalizedDy * explosionDistance
        
        const size = Math.random() * 16 + 4
        
        newBubbles.push({
          initialX: startX,
          initialY: startY,
          x: endX - startX,
          y: endY - startY,
          size,
          color
        })
      }
    }
    
    // L'animation d'explosion fonctionne toujours, même si les animations de typing sont désactivées
    // Générer des bulles pour chaque bulle bot (au cas où il y a plusieurs bulles avec %)
    botBubbles.forEach(bubble => {
      generateBubblesFromElement(bubble as HTMLElement, "#4A5A3D", 100)
    })
    
    // Générer des bulles pour le message utilisateur
    const userBubble = userContainer.querySelector('.message-bubble') as HTMLElement
    if (userBubble) {
      generateBubblesFromElement(userBubble, "#A89888", 100)
    }
    
    setBubbles(newBubbles)
    
    setTimeout(() => {
      deletePairAt(pageId, index)
      setDeletingIndex(null)
      setBubbles([])
      
      if (index === lastBotIndex - 1) {
        setCurrentAnimatingIndex(-1)
        setTypingMessage("")
        setIsTyping(false)
      }
    }, 700)
  }, [pageId, deletePairAt, lastBotIndex, setIsTyping])

  const confirmDelete = useCallback(() => {
    if (confirmIndex !== null) {
      executeDelete(confirmIndex)
      setConfirmIndex(null)
    }
  }, [confirmIndex, executeDelete])

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent, index: number) => {
    if (touchStart === null) return
    
    const currentTouch = e.touches[0].clientX
    const diff = touchStart - currentTouch
    
    if (diff > 10) {
      setSwipedIndex(index)
    } else if (diff < -10) {
      setSwipedIndex(null)
    }
  }, [touchStart])

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null)
  }, [])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 relative">
      {deletingIndex !== null && bubbles.map((bubble, i) => (
        <div
          key={i}
          className="bubble-particle"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            backgroundColor: bubble.color,
            // @ts-ignore
            "--tx": `${bubble.x}px`,
            "--ty": `${bubble.y}px`,
            left: `${bubble.initialX}px`,
            top: `${bubble.initialY}px`,
            animationDelay: `${i * 0.002}s`
          }}
        />
      ))}

      {isHomePage && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 py-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-sidebar shadow-custom-lg">
            <Image
              src="/photoprofile.jpg"
              alt="Photo de profil"
              width={128}
              height={128}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>

          <p className="text-xl md:text-2xl text-center text-primary max-w-2xl px-4 font-medium">
            {t("home.welcome")}
          </p>
        </div>
      )}

      {messages.map((message, index) => {
        const isDeleting = deletingIndex === index || deletingIndex === index - 1
        const canDelete = message.role === "user" && !isFirstAutoMessage(index)
        
        const isLastBotMessage = message.role === "bot" && index === lastBotIndex
        const displayContent = isLastBotMessage && index === currentAnimatingIndex && message.type !== "interactive"
          ? typingMessage
          : message.content.trim()

        return (
          <div
            key={message.id}
            className={`message-container ${
              message.role === "user"
                ? "w-full"
                : message.type === "interactive"
                  ? "w-full"
                  : "max-w-3xl"
            }`}
            style={{
              opacity: isDeleting ? 0 : 1,
              transition: "opacity 0.3s ease-out"
            }}
          >
            {message.role === "user" ? (
              <div className="w-full flex justify-end">
                <div 
                  className={`user-message-wrapper ${canDelete ? "can-delete" : ""} ${swipedIndex === index ? "swiped" : ""}`}
                  onTouchStart={(e) => canDelete && handleTouchStart(e, index)}
                  onTouchMove={(e) => canDelete && handleTouchMove(e, index)}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="user-message-container">
                    <div className="rounded-xl px-4 py-3 bg-user-bubble text-on-dark message-bubble shadow-custom-md text-base md:text-lg">
                      <p>{message.content}</p>
                    </div>
                  </div>
                  
                  {canDelete && (
                    <div className="delete-button-wrapper">
                      <div className="relative">
                        <button
                          onClick={() => {
                            requestDelete(index)
                            setSwipedIndex(null)
                          }}
                          onMouseEnter={() => setShowDeleteTooltip(index)}
                          onMouseLeave={() => setShowDeleteTooltip(null)}
                          className="text-delete-cross hover-delete-cross transition-colors w-10 h-10 flex items-center justify-center text-xl font-bold"
                          aria-label={t("chat.delete")}
                        >
                          ✕
                        </button>

                        {showDeleteTooltip === index && (
                          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg z-20 pointer-events-none">
                            {t("chat.delete")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : message.type === "interactive" ? (
              <div className="w-full">
                <InteractiveComponent 
                  name={message.componentName!}
                  data={message.data}
                />
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-sidebar">
                  <Image
                    src="/photoprofile.jpg"
                    alt="Bot"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>

                <div className="bot-message-bubbles flex-1">
                  {splitIntoBubblesWithSuggestions(displayContent).map((bubble, bubbleIndex) => {
                    const currentQuestion = message.questionId 
                      ? questions.find(q => q.id === message.questionId)
                      : null
                    
                    const intermediateSuggestions = isLastBotMessage && bubble.suggestionsAfter
                      ? bubble.suggestionsAfter
                          .map(indexStr => {
                            const index = parseInt(indexStr, 10)
                            if (isNaN(index) || !currentQuestion?.id_associe) return null
                            const questionId = currentQuestion.id_associe[index]
                            return questions.find(q => q.id === questionId)
                          })
                          .filter((q): q is Question => q !== null && q !== undefined)
                      : []

                    return (
                      <div key={bubbleIndex} className="mb-2 last:mb-0">
                        <div className="rounded-xl px-4 py-3 bg-bot-bubble text-primary message-bubble shadow-custom-md bot-bubble-part">
                          <div className="prose prose-bot-bubble max-w-none text-base md:text-xl">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                              }}
                            >
                              {bubble.content.trim()}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {intermediateSuggestions.length > 0 && (
                          <div className="flex flex-col gap-2 items-start mt-3 mb-2">
                            {intermediateSuggestions.map(q => {
                              const questionTitle = getQuestionTitle(q, language)
                              return (
                                <button
                                  key={q.id}
                                  onClick={() => handleSuggestionClick(q.id)}
                                  className="text-sm md:text-base px-4 py-2.5 rounded-lg border-2 border-suggestion text-suggestion font-semibold hover-suggestion transition-all shadow-custom-sm hover:shadow-custom-md bg-transparent"
                                >
                                  {questionTitle}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {message === lastBotMessage && message.type !== "interactive" && finalSuggestedQuestions.length > 0 && !isTyping && (
              <div className="mt-3 ml-10 flex flex-col gap-2 items-start">
                {finalSuggestedQuestions.map(q => {
                  const questionTitle = getQuestionTitle(q, language)
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleSuggestionClick(q.id)}
                      className="text-sm md:text-base px-4 py-2.5 rounded-lg border-2 border-suggestion text-suggestion font-semibold hover-suggestion transition-all shadow-custom-sm hover:shadow-custom-md bg-transparent"
                    >
                      {questionTitle}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {confirmIndex !== null && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
            style={{ top: 0, bottom: 0 }}
            onClick={() => setConfirmIndex(null)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-green-forest rounded-lg shadow-custom-xl w-full max-w-md overflow-hidden">
              <div className="p-6 bg-green-forest-dark">
                <h2 className="text-lg md:text-xl font-semibold text-green-light">{t("chat.confirmDelete")}</h2>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-green-light opacity-90 font-medium text-base md:text-lg">
                  {t("chat.deleteMessage")}
                </p>

                <label className="flex items-center gap-2 text-sm md:text-base text-green-light opacity-80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDeleteConfirm}
                    onChange={e => setSkipDeleteConfirm(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#5F7050' }}
                  />
                  <span className="font-medium">{t("chat.noAskAgain")}</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 p-6">
                <button
                  onClick={() => setConfirmIndex(null)}
                  className="px-4 py-2 text-sm md:text-base text-green-light opacity-80 hover:opacity-100 transition-opacity font-medium"
                >
                  {t("chat.cancel")}
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm md:text-base bg-delete-button text-white rounded-lg bg-delete-button-hover transition-colors shadow-custom-md font-semibold"
                >
                  {t("chat.delete.action")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}