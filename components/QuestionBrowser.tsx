// components/QuestionBrowser.tsx
"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useLanguageStore } from "../lib/languageStore"
import { getQuestions, getQuestionTitle, getQuestionTags } from "../lib/questionHelper"
import type { Question } from "../lib/questionHelper"

type Props = {
  isOpen: boolean
  onClose: () => void
  onSelectQuestion: (questionTitle: string) => void
}

const VALID_SHORT_WORDS = ["et", "à", "and", "to"]

export default function QuestionBrowser({ isOpen, onClose, onSelectQuestion }: Props) {
  const [searchText, setSearchText] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const language = useLanguageStore(s => s.language)
  const t = useLanguageStore(s => s.t)

  const questions = getQuestions()

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

  function getFilteredQuestions() {
    if (!searchText.trim()) {
      return [...questions].sort((a, b) => 
        getQuestionTitle(a, language).localeCompare(getQuestionTitle(b, language))
      )
    }

    const inputWords = splitWordsWithEndInfo(searchText)

    return questions
      .map(q => ({
        question: q,
        score: scoreQuestion(inputWords, q)
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.question)
  }

  const filteredQuestions = getFilteredQuestions()

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filteredQuestions.length - 1))
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, -1))
    }

    if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault()
      handleSelectQuestion(filteredQuestions[selectedIndex])
    }

    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  function handleSelectQuestion(question: Question) {
    const questionTitle = getQuestionTitle(question, language)
    onSelectQuestion(questionTitle)
    setSearchText("")
    setSelectedIndex(-1)
    onClose()
  }

  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchText])

  useEffect(() => {
    if (!isOpen) {
      setSearchText("")
      setSelectedIndex(-1)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-green-forest rounded-lg shadow-custom-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-green-forest-dark">
            <h2 className="text-lg font-semibold text-green-light">{t("browser.title")}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-green-hover rounded transition-colors text-green-light"
              aria-label={t("browser.close")}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("browser.search")}
                className="question-browser-input w-full rounded-lg bg-green-moss px-4 py-2.5 outline-none transition-all text-green-input font-medium"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 question-browser-scroll">
              {filteredQuestions.length === 0 ? (
                <div className="text-center text-green-light opacity-70 py-8 font-medium">
                  {t("browser.noResults")}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredQuestions.map((q, i) => {
                    const questionTitle = getQuestionTitle(q, language)
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleSelectQuestion(q)}
                        className={`px-4 py-3 rounded-lg cursor-pointer transition-all ${
                          i === selectedIndex
                            ? "bg-green-selected text-green-light shadow-custom-sm font-semibold"
                            : "hover:bg-green-hover text-green-light font-medium"
                        }`}
                      >
                        <div className="text-sm">
                          {questionTitle}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}