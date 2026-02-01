// components/interactive/LanguagesGrid.tsx
"use client"

type Props = {
  data?: any
  language: "fr" | "en"
}

export default function LanguagesGrid({ language }: Props) {
  // Données des langages de programmation
  const languages = [
    { 
      name: "SQL / PL/SQL", 
      icon: "🗄️", 
      level: 90,
      category: "data"
    },
    { 
      name: "Excel / VBA", 
      icon: "📊", 
      level: 85,
      category: "data"
    },
    { 
      name: "Python", 
      icon: "🐍", 
      level: 80,
      category: "backend"
    },
    { 
      name: "Java", 
      icon: "☕", 
      level: 75,
      category: "backend"
    },
    { 
      name: "PHP", 
      icon: "🐘", 
      level: 70,
      category: "backend"
    },
    { 
      name: "JavaScript", 
      icon: "🟨", 
      level: 75,
      category: "frontend"
    },
    { 
      name: "React", 
      icon: "⚛️", 
      level: 70,
      category: "frontend"
    },
    { 
      name: "HTML/CSS", 
      icon: "🎨", 
      level: 80,
      category: "frontend"
    }
  ]

  // Textes traduits
  const translations = {
    fr: {
      title: "Langages de programmation",
      subtitle: "Niveau de maîtrise",
      categories: {
        data: "Données & Analyse",
        backend: "Backend",
        frontend: "Frontend"
      }
    },
    en: {
      title: "Programming Languages",
      subtitle: "Proficiency Level",
      categories: {
        data: "Data & Analysis",
        backend: "Backend",
        frontend: "Frontend"
      }
    }
  }

  const t = translations[language]

  // Grouper par catégorie
  const categories = ['data', 'backend', 'frontend']

  return (
    <div className="bg-bot-bubble rounded-xl p-6 shadow-custom-md">
      {/* Header */}
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-primary mb-1">{t.title}</h3>
        <p className="text-sm text-secondary">{t.subtitle}</p>
      </div>

      {/* Langages par catégorie */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryLangs = languages.filter(l => l.category === category)
          
          return (
            <div key={category}>
              {/* Titre de catégorie */}
              <h4 className="text-lg font-semibold text-accent mb-3 pl-2 border-l-4 border-accent">
                {t.categories[category as keyof typeof t.categories]}
              </h4>

              {/* Grille de langages */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categoryLangs.map(lang => (
                  <div 
                    key={lang.name}
                    className="flex flex-col items-center p-4 bg-main rounded-xl 
                               hover:scale-105 transition-all duration-300 cursor-pointer
                               border-2 border-transparent hover:border-accent shadow-md
                               hover:shadow-lg group"
                  >
                    {/* Icône */}
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                      {lang.icon}
                    </span>
                    
                    {/* Nom */}
                    <span className="font-semibold text-sm text-center text-primary mb-2 min-h-[2.5rem] flex items-center">
                      {lang.name}
                    </span>
                    
                    {/* Barre de progression */}
                    <div className="w-full bg-panel rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-accent h-full rounded-full transition-all duration-700 ease-out" 
                        style={{ 
                          width: `${lang.level}%`,
                          transitionDelay: '100ms'
                        }} 
                      />
                    </div>
                    
                    {/* Pourcentage */}
                    <span className="text-xs text-muted mt-1 font-medium">
                      {lang.level}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Note de bas de page */}
      <div className="mt-6 pt-4 border-t border-accent border-opacity-20">
        <p className="text-xs text-secondary text-center italic">
          {language === "fr" 
            ? "Les niveaux sont basés sur mon expérience pratique et mes projets réalisés."
            : "Levels are based on my practical experience and completed projects."}
        </p>
      </div>
    </div>
  )
}