// components/ChatInput.tsx
"use client"

import { useState, useEffect } from "react"
import { Plus, Send, ChevronsRight } from "lucide-react"
import { useChatStore } from "../lib/chatStore"
import { useLanguageStore } from "../lib/languageStore"
import { useSettingsStore } from "../lib/settingsStore"
import { getQuestions, getQuestionTitle, getQuestionTags } from "../lib/questionHelper"
import { Question } from "../lib/types"
import QuestionBrowser from "./QuestionBrowser"

type Props = {
  pageId: string
}

const VALID_SHORT_WORDS = ["et", "à", "and", "to"]

export default function ChatInput({ pageId }: Props) {
  const [text, setText] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showBrowser, setShowBrowser] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showSkipTooltip, setShowSkipTooltip] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  const addMessage = useChatStore(s => s.addMessage)
  const isTyping = useChatStore(s => s.isTyping)
  const skipTyping = useChatStore(s => s.skipTyping)
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const language = useLanguageStore(s => s.language)
  const t = useLanguageStore(s => s.t)

  const questions = getQuestions()

  const placeholders = [
    t("chat.placeholder.example1"),
    t("chat.placeholder.example2"),
    t("chat.placeholder.example3"),
    t("chat.placeholder.example4"),
    t("chat.placeholder.default")
  ]

  // Rotation des placeholders toutes les 3 secondes quand vide et non focus
  useEffect(() => {
    if (text || isFocused) return

    const interval = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % placeholders.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [text, isFocused, placeholders.length])

  function normalize(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  }

  function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[b.length][a.length]
  }

  function fuzzyMatch(searchWord: string, targetWord: string): number {
    if (targetWord.includes(searchWord)) {
      return 1.0
    }

    if (searchWord.length < 3) {
      return 0
    }

    const distance = levenshteinDistance(searchWord, targetWord)
    const maxLength = Math.max(searchWord.length, targetWord.length)
    const similarity = 1 - distance / maxLength

    return similarity > 0.75 ? similarity : 0
  }

  function splitWordsWithEndInfo(value: string) {
    const endsWithSpace = value.endsWith(" ")
    const words = normalize(value).trim().split(/\s+/).filter(w => w.length > 0)

    return words.map((w, i) => ({
      word: w,
      isComplete: i < words.length - 1 || endsWithSpace
    }))
  }

  const STOP_WORDS = [
    "de", "du", "des", "le", "la", "les", "un", "une", "ce", "cette", "et", "à", "au", "aux", "est", "en", "dans", "pour", "sur", "avec",
    "of", "the", "a", "an", "this", "that", "and", "to", "at", "is", "in", "for", "on", "with"
  ]

  function isWordActive(word: string, index: number, isComplete: boolean) {
    if (STOP_WORDS.includes(word)) return false
    if (index === 0 && word.length >= 2) return true
    if (VALID_SHORT_WORDS.includes(word)) return isComplete
    if (word.length === 1) return isComplete && index > 0
    if (word.length === 2) return isComplete
    return word.length >= 3
  }

  function scoreQuestion(
    inputWords: ReturnType<typeof splitWordsWithEndInfo>,
    q: Question
  ) {
    let score = 0
    const title = normalize(getQuestionTitle(q, language))
    const titleWords = title.split(/\s+/)

    const activeWords = inputWords.filter(({ word, isComplete }, index) => 
      isWordActive(word, index, isComplete)
    )

    if (activeWords.length === 0) return 0

    activeWords.forEach(({ word, isComplete }) => {
      const exactMatchInTitle = title.includes(word)
      
      if (exactMatchInTitle) {
        score += word.length * (isComplete ? 10 : 5)
      } else {
        titleWords.forEach(titleWord => {
          const similarity = fuzzyMatch(word, titleWord)
          if (similarity > 0) {
            score += word.length * similarity * (isComplete ? 4 : 2)
          }
        })
      }

      const tags = getQuestionTags(q, language)
      tags.forEach((tag: string) => {
        const normalizedTag = normalize(tag)
        if (normalizedTag.includes(word)) {
          score += word.length * 3
        } else {
          const similarity = fuzzyMatch(word, normalizedTag)
          if (similarity > 0) {
            score += word.length * similarity * 1.5
          }
        }
      })
    })

    const fullInput = normalize(activeWords.map(w => w.word).join(" "))
    if (fullInput.length >= 3 && title.includes(fullInput)) {
      score += fullInput.length * 15
    }

    return score
  }

  function getSuggestions(value: string) {
    if (!value.trim()) return []

    const inputWords = splitWordsWithEndInfo(value)

    return questions
      .map(q => ({
        question: q,
        score: scoreQuestion(inputWords, q)
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  const suggestions = getSuggestions(text)

  async function send(value: string) {
    if (!value.trim()) return

    const matches = getSuggestions(value)
    
    if (matches.length === 0) {
      addMessage(pageId, { role: "user", content: value })
      addMessage(pageId, {
        role: "bot",
        content: t("chat.fallback"),
        questionId: "fallback",
        type: "text"
      })
      reset()
      return
    }

    const match = matches[0].question
    const questionTitle = getQuestionTitle(match, language)

    addMessage(pageId, { 
      role: "user", 
      content: questionTitle,
      questionId: match.id
    })

    // Vérifier si c'est une question interactive
    if (match.type === "interactive" && match.component) {
      // Pour les questions interactives, on crée directement le message avec le composant
      addMessage(pageId, {
        role: "bot",
        content: "", // Pas de contenu textuel pour les composants interactifs
        questionId: match.id,
        type: "interactive",
        componentName: match.component,
        data: {} // Les données seront gérées par le composant
      })
    } else {
      // Question textuelle classique
      const res = await fetch(`/api/content?id=${match.id}&lang=${language}`)
      const content = await res.text()

      addMessage(pageId, {
        role: "bot",
        content,
        questionId: match.id,
        type: "text"
      })
    }

    reset()
  }

  function reset() {
    setText("")
    setSelectedIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (selectedIndex === -1) {
        setSelectedIndex(suggestions.length - 1)
      } else {
        setSelectedIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1))
      }
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (selectedIndex === -1) {
        setSelectedIndex(0)
      } else {
        setSelectedIndex(i => (i + 1) % suggestions.length)
      }
    }

    if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0) {
        send(getQuestionTitle(suggestions[selectedIndex].question, language))
      } else {
        send(text)
      }
    }
  }

  return (
    <>
      <div 
        className="p-4 md:p-6 bg-main relative fade-to-top chat-input-wrapper" 
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-3xl mx-auto relative" style={{ zIndex: 2 }}>
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-suggestions rounded-2xl shadow-custom-xl overflow-hidden">
              {suggestions.slice().reverse().map((s, i) => {
                const originalIndex = suggestions.length - 1 - i
                const questionTitle = getQuestionTitle(s.question, language)
                return (
                  <div
                    key={s.question.id}
                    onClick={() => send(questionTitle)}
                    style={originalIndex === selectedIndex ? { backgroundColor: '#3D342A' } : {}}
                    className="px-4 py-3 cursor-pointer text-sm text-chatinput transition-all border-b border-accent border-opacity-20 last:border-b-0 font-medium hover:bg-[#3D342A]"
                  >
                    {questionTitle}
                  </div>
                )
              })}
            </div>
          )}

          <div 
            className="flex items-center gap-2 rounded-3xl px-2 py-2 shadow-custom-lg transition-colors"
            style={{
              backgroundColor: isFocused ? '#3D342A' : '#4D443A'
            }}
          >
            <div className="relative">
              <button
                onClick={() => setShowBrowser(true)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-button-plus bg-button-plus-hover transition-colors text-on-dark shadow-custom-sm"
                aria-label={t("chat.allQuestions")}
              >
                <Plus size={20} />
              </button>

              {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-button-plus text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg">
                  {t("chat.allQuestions")}
                </div>
              )}
            </div>

            <input
              value={text}
              onChange={e => {
                setText(e.target.value)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholders[placeholderIndex]}
              className="flex-1 bg-transparent px-3 py-2 outline-none text-chatinput placeholder-chatinput placeholder-opacity-30 font-medium transition-all rounded-2xl text-base"
              style={{
                transition: "all 0.3s ease-in-out"
              }}
            />

            {isTyping && animationsEnabled ? (
              <div className="relative">
                <button
                  onClick={skipTyping}
                  onMouseEnter={() => setShowSkipTooltip(true)}
                  onMouseLeave={() => setShowSkipTooltip(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-dark hover:bg-blue-600 transition-colors text-white shadow-custom-md"
                  aria-label={t("chat.accelerate")}
                >
                  <ChevronsRight size={18} />
                </button>

                {showSkipTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-blue-dark text-white text-xs rounded whitespace-nowrap shadow-custom-lg">
                    {t("chat.accelerate")}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => send(text)}
                disabled={!text.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-dark bg-blue-dark-hover transition-colors bg-send-disabled text-white shadow-custom-md disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t("chat.send")}
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <QuestionBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        onSelectQuestion={send}
      />
    </>
  )
}