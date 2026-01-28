// lib/questionHelper.ts
import { Language } from "./languageStore"
import questionsData from "../data/questions.json"

export type Question = {
  id: string
  title_fr: string
  title_en: string
  tags_fr: string[]
  tags_en: string[]
  id_associe: string[]
}

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