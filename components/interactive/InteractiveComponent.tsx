// components/interactive/InteractiveComponent.tsx
"use client"

import dynamic from "next/dynamic"
import { useLanguageStore } from "../../lib/languageStore"

// Import dynamique des composants interactifs
// Cela permet de charger uniquement les composants nécessaires
const componentMap: Record<string, any> = {
  "FormationTimeline": dynamic(() => import("./FormationTimeline")),
  "ExperiencesTimeline": dynamic(() => import("./ExperiencesTimeline")),
  "ProjectsGrid": dynamic(() => import("./ProjectsGrid")),
  "LanguagesGrid": dynamic(() => import("./LanguagesGrid")),
  "ApplicationsGrid": dynamic(() => import("./ApplicationsGrid")),
  "CompetencesInteractive": dynamic(() => import("./CompetencesInteractive")),
  // Ajoutez vos autres composants ici
}

type Props = {
  name: string
  data?: any
}

export default function InteractiveComponent({ name, data }: Props) {
  const language = useLanguageStore(s => s.language)
  const t = useLanguageStore(s => s.t)
  
  const Component = componentMap[name]
  
  if (!Component) {
    return (
      <div className="p-6 bg-bot-bubble rounded-xl border-2 border-accent border-opacity-30 shadow-custom-md">
        <div className="text-center">
          <p className="text-primary font-semibold mb-2">
            {language === "fr" 
              ? `Composant "${name}" non trouvé` 
              : `Component "${name}" not found`}
          </p>
          <p className="text-sm text-muted">
            {language === "fr"
              ? "Ce composant interactif n'existe pas encore."
              : "This interactive component doesn't exist yet."}
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full">
      <Component data={data} language={language} />
    </div>
  )
}