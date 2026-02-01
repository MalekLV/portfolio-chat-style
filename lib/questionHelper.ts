// lib/questionHelper.ts
import { Language } from "./languageStore"
import { Question } from "./types"
import questionsData from "../data/questions.json"

// Re-export Question pour la compatibilité avec les anciens imports
export type { Question } from "./types"

// Helper pour obtenir le titre d'une question dans la langue actuelle
export function getQuestionTitle(question: Question, lang: Language): string {
  return lang === "fr" ? question.title_fr : question.title_en
}

// Helper pour obtenir les tags d'une question dans la langue actuelle
export function getQuestionTags(question: Question, lang: Language): string[] {
  return lang === "fr" ? question.tags_fr : question.tags_en
}

// Helper pour obtenir toutes les questions
export function getQuestions(): Question[] {
  return questionsData as Question[]
}

// Helper pour trouver une question par ID
export function getQuestionById(id: string): Question | undefined {
  return questionsData.find(q => q.id === id) as Question | undefined
}

// Helper pour vérifier si une question utilise un composant interactif
export function isInteractiveQuestion(question: Question): boolean {
  return question.type === "interactive" && !!question.component
}

// Helper pour obtenir le nom du composant d'une question interactive
export function getComponentName(question: Question): string | undefined {
  return isInteractiveQuestion(question) ? question.component : undefined
}