// lib/types.ts
// Types centralisés pour l'application

export type MessageType = "text" | "interactive"

export type Message = {
  id: string
  role: "user" | "bot"
  content: string
  questionId?: string
  type?: MessageType
  componentName?: string
  data?: any
}

export type Question = {
  id: string
  type?: MessageType // "text" par défaut ou "interactive"
  component?: string // Nom du composant React à rendre
  title_fr: string
  title_en: string
  tags_fr: string[]
  tags_en: string[]
  id_associe: string[]
}