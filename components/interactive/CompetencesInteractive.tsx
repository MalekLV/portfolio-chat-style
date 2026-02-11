// components/interactive/CompetencesInteractive.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import Image from "next/image"
import { BookOpen, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

type CompetenceItem = {
  recto: string
  verso: string
  icone: string
  groupe: string
  id_associe: string[]
}

type CompetenceGroup = {
  name: string
  titleFr: string
  titleEn: string
  descriptionFr: string
  descriptionEn: string
  color: string
  bgColor: string
  textColor: string
  competences: CompetenceItem[]
}

type Props = {
  data?: any
  language: "fr" | "en"
  pageId?: string
}

const GROUP_CONFIG: Record<string, Omit<CompetenceGroup, "competences">> = {
  data: {
    name: "data",
    titleFr: "Data & Bases de données",
    titleEn: "Data & Databases",
    descriptionFr: "Compétences techniques en gestion et analyse de données",
    descriptionEn: "Technical skills in data management and analysis",
    color: "#4A5A6A",
    bgColor: "rgba(74, 90, 106, 0.15)",
    textColor: "#2C3A45"
  },
  dev: {
    name: "dev",
    titleFr: "Développement & Systèmes",
    titleEn: "Development & Systems",
    descriptionFr: "Compétences en développement logiciel et architecture",
    descriptionEn: "Software development and architecture skills",
    color: "#5A4A3D",
    bgColor: "rgba(90, 74, 61, 0.15)",
    textColor: "#3A2A1D"
  },
  soft: {
    name: "soft",
    titleFr: "Méthodes & Soft Skills",
    titleEn: "Methods & Soft Skills",
    descriptionFr: "Méthodes de travail et compétences interpersonnelles",
    descriptionEn: "Working methods and interpersonal skills",
    color: "#2D5F3F",
    bgColor: "rgba(45, 95, 63, 0.15)",
    textColor: "#1D3F2F"
  },
  langues: {
    name: "langues",
    titleFr: "Compétences Linguistiques",
    titleEn: "Language Skills",
    descriptionFr: "Maîtrise des langues étrangères",
    descriptionEn: "Foreign language proficiency",
    color: "#7D6B5C",
    bgColor: "rgba(125, 107, 92, 0.15)",
    textColor: "#5D4B3C"
  }
}

const SIDEBAR_WIDTH = 320
const MIN_CARD_WIDTH = 200 // Largeur minimum d'une carte pour que le texte reste lisible

// Fonction pour calculer le nombre de colonnes selon la largeur RÉELLE du container
// RÈGLE : Chaque carte doit faire AU MOINS 200px de large pour que le texte reste lisible
const getColumnsCount = (containerWidth: number): number => {
  // Calculer le nombre maximum de colonnes possibles avec 200px minimum par carte
  // On enlève un peu d'espace pour les gaps entre les cartes
  const effectiveWidth = containerWidth - 32 // Padding horizontal du container
  const maxColumns = Math.floor(effectiveWidth / MIN_CARD_WIDTH)
  
  // Garantir au moins 2 colonnes, maximum 5
  return Math.max(2, Math.min(5, maxColumns))
}

export default function CompetencesInteractive({ language, pageId = "competences" }: Props) {
  const [competenceGroups, setCompetenceGroups] = useState<CompetenceGroup[]>([])
  const [visibleGroupCount, setVisibleGroupCount] = useState(0)
  const [hoveredCompetence, setHoveredCompetence] = useState<string | null>(null)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['data', 'dev', 'soft', 'langues']))
  const [isPopupHovered, setIsPopupHovered] = useState(false)
  const [hoveredGroupIndex, setHoveredGroupIndex] = useState<number | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ left?: string, right?: string, transform?: string }>({})
  const [containerWidth, setContainerWidth] = useState(0)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  const addMessage = useChatStore(s => s.addMessage)
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const setIsTyping = useChatStore(s => s.setIsTyping)
  const shouldSkip = useChatStore(s => s.shouldSkip)
  const setIsInteractiveToggling = useChatStore(s => s.setIsInteractiveToggling)
  const isInteractiveToggling = useChatStore(s => s.isInteractiveToggling)
  const t = useLanguageStore(s => s.t)
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Mesurer la largeur du conteneur (pas de l'écran)
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setContainerWidth(width)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    async function loadCompetences() {
      try {
        const csvUrl = '/interactive/competences.csv'
        const res = await fetch(csvUrl)
        
        if (!res.ok) {
          const errorMsg = `Erreur HTTP: ${res.status}`
          setLoadingError(errorMsg)
          throw new Error(errorMsg)
        }
        
        const csvText = await res.text()
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
        const dataLines = lines.slice(1)
        
        const parsedCompetences: CompetenceItem[] = []
        
        for (const line of dataLines) {
          const columns = line.split('\t').map(col => col.trim())
          
          if (columns.length < 7) continue
          
          const [fr_recto, fr_verso, en_recto, en_verso, groupe, icone, id_associe_raw] = columns
          
          const recto = language === "fr" ? fr_recto : en_recto
          const verso = language === "fr" ? fr_verso : en_verso
          
          let id_associe: string[] = []
          if (id_associe_raw && id_associe_raw.length > 0) {
            id_associe = id_associe_raw.split(',').map(id => id.trim()).filter(id => id.length > 0)
          }
          
          if (recto && verso && groupe && icone) {
            parsedCompetences.push({ recto, verso, icone, groupe, id_associe })
          }
        }
        
        const groups: CompetenceGroup[] = []
        const groupOrder = ['data', 'dev', 'soft', 'langues']
        
        groupOrder.forEach(groupKey => {
          const groupConfig = GROUP_CONFIG[groupKey]
          if (!groupConfig) return
          
          const competencesInGroup = parsedCompetences.filter(comp => comp.groupe === groupKey)
          
          if (competencesInGroup.length > 0) {
            groups.push({
              ...groupConfig,
              competences: competencesInGroup
            })
          }
        })
        
        setCompetenceGroups(groups)
        setLoadingError(null)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
        setLoadingError(errorMsg)
      }
    }
    
    loadCompetences()
  }, [language])

  useEffect(() => {
    if (competenceGroups.length === 0) return
    
    if (!animationsEnabled) {
      setVisibleGroupCount(competenceGroups.length)
      setTimeout(() => setIsTyping(false), 0)
      return
    }
    
    setTimeout(() => setIsTyping(true), 0)
    
    const timer = setInterval(() => {
      setVisibleGroupCount(prev => {
        if (prev >= competenceGroups.length) {
          clearInterval(timer)
          setTimeout(() => setIsTyping(false), 0)
          return prev
        }
        const next = prev + 1
        
        // Scroll uniquement pendant l'animation initiale
        setTimeout(() => {
          const scrollableParent = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement
          if (!scrollableParent || !containerRef.current) return
          const containerW = containerRef.current.offsetWidth
          const currentGroup = competenceGroups[next - 1]
          if (!currentGroup) return
          const columnsCount = getColumnsCount(containerW)
          const rowsCount = Math.ceil(currentGroup.competences.length / columnsCount)
          const scrollAmount = Math.min(rowsCount * 160 + 100, 500)
          const scrollTop = scrollableParent.scrollTop
          const scrollHeight = scrollableParent.scrollHeight
          const clientHeight = scrollableParent.clientHeight
          if (scrollTop + clientHeight < scrollHeight) {
            scrollableParent.scrollTo({
              top: Math.min(scrollTop + scrollAmount, scrollHeight - clientHeight),
              behavior: 'smooth'
            })
          }
        }, 50)
        
        return next
      })
    }, 800)
    
    animationTimerRef.current = timer
    
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      setTimeout(() => setIsTyping(false), 0)
    }
  }, [competenceGroups.length, animationsEnabled, setIsTyping])

  useEffect(() => {
    if (shouldSkip && visibleGroupCount < competenceGroups.length) {
      setVisibleGroupCount(competenceGroups.length)
      // Utiliser setTimeout pour éviter d'appeler setIsTyping pendant le rendu
      setTimeout(() => setIsTyping(false), 0)
      
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      
      useChatStore.setState({ shouldSkip: false })
    }
  }, [shouldSkip, visibleGroupCount, competenceGroups.length, setIsTyping])

  useEffect(() => {
    if (!animationsEnabled && visibleGroupCount < competenceGroups.length) {
      setVisibleGroupCount(competenceGroups.length)
      // Utiliser setTimeout pour éviter d'appeler setIsTyping pendant le rendu
      setTimeout(() => setIsTyping(false), 0)
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
    }
  }, [animationsEnabled, visibleGroupCount, competenceGroups.length, setIsTyping])

  const toggleGroupExpansion = (groupName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Activer le flag GLOBAL pour bloquer le scroll de ChatWindow
    setIsInteractiveToggling(true)
    
    // Sauvegarder la position actuelle AVANT le toggle
    const scrollableParent = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement
    if (!scrollableParent) return
    
    const currentScrollTop = scrollableParent.scrollTop
    
    // Bloquer temporairement le scroll en ajoutant une classe CSS
    scrollableParent.style.overflow = 'hidden'
    
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
    
    // Double requestAnimationFrame pour être VRAIMENT sûr que le DOM est stable
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Forcer la position exacte
        scrollableParent.scrollTop = currentScrollTop
        
        // Débloquer le scroll après stabilisation
        setTimeout(() => {
          scrollableParent.style.overflow = ''
          setIsInteractiveToggling(false)
        }, 100)
      })
    })
  }

  const handleCardClick = (cardKey: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardKey)) {
        newSet.delete(cardKey)
      } else {
        newSet.add(cardKey)
      }
      return newSet
    })
  }

  const handleFlipAllGroup = (groupName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const group = competenceGroups.find(g => g.name === groupName)
    if (!group) return
    
    const allGroupKeys = group.competences.map(comp => `${groupName}-${comp.recto}`)
    const allFlipped = allGroupKeys.every(key => flippedCards.has(key))
    
    setFlippedCards(prev => {
      const newSet = new Set(prev)
      if (allFlipped) {
        allGroupKeys.forEach(key => newSet.delete(key))
      } else {
        allGroupKeys.forEach(key => newSet.add(key))
      }
      return newSet
    })
  }

  // Calculer la position du popup en tenant compte de la Sidebar
  const calculatePopupPosition = (cardElement: HTMLElement) => {
    const rect = cardElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const popupWidth = 320
    
    const isMobile = window.innerWidth < 768
    const spaceOnLeft = isMobile ? rect.left : rect.left - SIDEBAR_WIDTH
    const spaceOnRight = viewportWidth - rect.right
    
    // Si pas assez d'espace à gauche (en tenant compte de la sidebar)
    if (spaceOnLeft < popupWidth / 2) {
      return { left: '0', right: 'auto', transform: 'none' }
    }
    // Si pas assez d'espace à droite
    else if (spaceOnRight < popupWidth / 2) {
      return { right: '0', left: 'auto', transform: 'none' }
    }
    // Sinon, centrer normalement
    else {
      return { left: '50%', transform: 'translateX(-50%)' }
    }
  }

  const handleRelatedQuestionClick = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const question = getQuestionById(questionId)
    if (!question) return
    
    const questionTitle = getQuestionTitle(question, language)
    
    const currentPageId = typeof window !== 'undefined' 
      ? window.location.pathname.split('/')[1] || 'home'
      : 'home'
    
    addMessage(currentPageId, { 
      role: "user", 
      content: questionTitle,
      questionId: questionId
    })
    
    if (question.type === "interactive" && question.component) {
      addMessage(currentPageId, {
        role: "bot",
        content: "",
        questionId: questionId,
        type: "interactive",
        componentName: question.component,
        data: {}
      })
    } else {
      const res = await fetch(`/api/content?id=${questionId}&lang=${language}`)
      const content = await res.text()
      
      addMessage(currentPageId, {
        role: "bot",
        content,
        questionId: questionId,
        type: "text"
      })
    }
    
    setHoveredCompetence(null)
    setIsPopupHovered(false)
  }

  const handleCompetenceMouseEnter = (competenceKey: string, groupIndex: number, cardElement: HTMLDivElement) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredCompetence(competenceKey)
    setHoveredGroupIndex(groupIndex)
    cardRef.current = cardElement
    setPopupPosition(calculatePopupPosition(cardElement))
  }

  const handleCompetenceMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPopupHovered) {
        setHoveredCompetence(null)
        setHoveredGroupIndex(null)
      }
    }, 100)
  }

  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsPopupHovered(true)
  }

  const handlePopupMouseLeave = () => {
    setIsPopupHovered(false)
    setHoveredCompetence(null)
    setHoveredGroupIndex(null)
  }

  if (loadingError) {
    return (
      <div className="w-full py-6">
        <div className="mb-8 px-4">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-sidebar">
              <Image src="/photoprofile.jpg" alt="Bot" width={32} height={32} className="w-full h-full object-cover" unoptimized />
            </div>
            <div className="rounded-xl px-4 py-3 bg-bot-bubble text-primary shadow-custom-md max-w-3xl">
              <div className="prose prose-bot-bubble max-w-none text-base md:text-xl">
                <p className="text-red-600 font-bold">❌ Erreur de chargement</p>
                <p className="text-sm">{loadingError}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-6" ref={containerRef}>
      <div className="mb-8 px-4">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-sidebar">
            <Image src="/photoprofile.jpg" alt="Bot" width={32} height={32} className="w-full h-full object-cover" unoptimized />
          </div>
          <div className="rounded-xl px-4 py-3 bg-bot-bubble text-primary shadow-custom-md max-w-3xl">
            <div className="prose prose-bot-bubble max-w-none text-base md:text-xl">
              <p>
                {language === "fr" 
                  ? "Voici mes compétences organisées par catégorie. Survolez une carte pour la retourner et découvrir les détails :" 
                  : "Here are my skills organized by category. Hover over a card to flip it and discover the details:"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-4">
        {competenceGroups.map((group, groupIndex) => {
          const isVisible = groupIndex < visibleGroupCount
          const isExpanded = expandedGroups.has(group.name)
          const allGroupKeys = group.competences.map(comp => `${group.name}-${comp.recto}`)
          const allFlipped = allGroupKeys.every(key => flippedCards.has(key))
          
          return (
            <div
              key={group.name}
              className={`${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{
                transition: `opacity 0.7s ease ${isVisible ? `${groupIndex * 100}ms` : '0ms'}, transform 0.7s ease ${isVisible ? `${groupIndex * 100}ms` : '0ms'}`,
                position: 'relative',
                zIndex: hoveredGroupIndex === groupIndex ? 1000 : 1
              }}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <button
                    onClick={(e) => toggleGroupExpansion(group.name, e)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div 
                      className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 shadow-custom-md"
                      style={{ borderColor: group.color, backgroundColor: group.bgColor }}
                    >
                      <h3 className="text-lg md:text-xl lg:text-2xl font-bold whitespace-nowrap" style={{ color: group.color }}>
                        {language === "fr" ? group.titleFr : group.titleEn}
                      </h3>
                      <span className="text-sm font-semibold px-3 py-1 rounded-full text-on-dark" style={{ backgroundColor: group.color }}>
                        {group.competences.length}
                      </span>
                    </div>
                    <div className="p-2 rounded-full transition-all" style={{ backgroundColor: group.bgColor, color: group.color }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <button
                      onClick={(e) => handleFlipAllGroup(group.name, e)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all shadow-custom-sm hover:shadow-custom-md text-sm md:text-base"
                      style={{ backgroundColor: group.color, color: 'white' }}
                    >
                      <RefreshCw size={16} className={allFlipped ? 'rotate-180 transition-transform duration-500' : 'transition-transform duration-500'} />
                      <span className="hidden sm:inline">
                        {language === "fr" ? (allFlipped ? "Remettre" : "Retourner") : (allFlipped ? "Flip back" : "Flip all")}
                      </span>
                    </button>
                  )}
                </div>
                
                {isExpanded && (
                  <p className="mt-2 text-sm md:text-base lg:text-lg italic" style={{ color: group.color }}>
                    {language === "fr" ? group.descriptionFr : group.descriptionEn}
                  </p>
                )}
              </div>

              {isExpanded && (
                <div 
                  className="grid gap-3 md:gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${getColumnsCount(containerWidth)}, minmax(0, 1fr))`
                  }}
                >
                  {group.competences.map((comp, compIndex) => {
                    const competenceKey = `${group.name}-${comp.recto}`
                    const isHovered = hoveredCompetence === competenceKey
                    const isFlipped = flippedCards.has(competenceKey)
                    const hasRelatedQuestions = comp.id_associe.length > 0
                    
                    return (
                      <div key={compIndex} className="relative" style={{ overflow: 'visible', zIndex: isHovered ? 10000 : 1 }}>
                        <div
                          ref={(el) => { if (el && isHovered) cardRef.current = el }}
                          onMouseEnter={(e) => handleCompetenceMouseEnter(competenceKey, groupIndex, e.currentTarget)}
                          onMouseLeave={handleCompetenceMouseLeave}
                          onClick={() => handleCardClick(competenceKey)}
                          className="relative cursor-pointer transition-all duration-300"
                          style={{ perspective: '1000px', minHeight: '130px' }}
                        >
                          <div
                            className="relative w-full h-full"
                            style={{
                              transformStyle: 'preserve-3d',
                              transform: (isHovered || isFlipped) ? 'rotateY(180deg)' : 'rotateY(0deg)',
                              transition: 'transform 0.6s',
                              minHeight: '130px'
                            }}
                          >
                            <div
                              className="absolute w-full h-full rounded-xl p-3 shadow-custom-md border-2 flex flex-col items-center justify-center gap-2"
                              style={{
                                backfaceVisibility: 'hidden',
                                backgroundColor: group.bgColor,
                                borderColor: 'transparent',
                                minHeight: '130px'
                              }}
                            >
                              <div className="text-2xl md:text-3xl">{comp.icone}</div>
                              <h4 className="text-center text-xs md:text-sm font-semibold text-primary line-clamp-2">
                                {comp.recto}
                              </h4>
                              {hasRelatedQuestions && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-on-dark" style={{ backgroundColor: group.color }}>
                                  <BookOpen size={12} />
                                </div>
                              )}
                            </div>

                            <div
                              className="absolute w-full h-full rounded-xl p-3 shadow-custom-md flex items-center justify-center"
                              style={{
                                backfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                backgroundColor: group.bgColor,
                                minHeight: '130px'
                              }}
                            >
                              <p className="text-center text-sm md:text-base font-medium leading-tight line-clamp-6" style={{ color: group.textColor }}>
                                {comp.verso}
                              </p>
                            </div>
                          </div>
                        </div>

                        {isHovered && hasRelatedQuestions && (
                          <div 
                            onMouseEnter={handlePopupMouseEnter}
                            onMouseLeave={handlePopupMouseLeave}
                            className="absolute mt-2 w-80 bg-main rounded-xl p-4 shadow-custom-xl border-2"
                            style={{ borderColor: group.color, ...popupPosition, zIndex: 9999 }}
                          >
                            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">
                              {language === "fr" ? "Questions liées" : "Related questions"}
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {comp.id_associe.map((qId, qIndex) => {
                                const question = getQuestionById(qId)
                                if (!question) return null
                                const questionTitle = getQuestionTitle(question, language)
                                return (
                                  <button
                                    key={qIndex}
                                    onClick={(e) => handleRelatedQuestionClick(qId, e)}
                                    className="w-full text-left text-xs md:text-sm px-3 py-2 rounded-lg border-2 font-semibold transition-all shadow-custom-sm hover:shadow-custom-md bg-transparent"
                                    style={{ borderColor: group.color, color: group.color }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = group.color
                                      e.currentTarget.style.color = 'white'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent'
                                      e.currentTarget.style.color = group.color
                                    }}
                                  >
                                    {questionTitle}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {visibleGroupCount >= competenceGroups.length && competenceGroups.length > 0 && (
        <div className="mt-8 px-4 space-y-6 animate-fade-in">
          <p className="text-center text-base md:text-lg text-muted italic">
            {language === "fr" 
              ? "💡 Survolez une carte pour la retourner et voir les questions liées" 
              : "💡 Hover over a card to flip it and see related questions"}
          </p>
          <div className="flex flex-col items-center gap-4 mt-6">
            <p className="text-sm md:text-base font-bold text-primary uppercase tracking-wide">
              {language === "fr" ? "Pour aller plus loin" : "To go further"}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["languages", "applications"].map(questionId => {
                const question = getQuestionById(questionId)
                if (!question) return null
                const questionTitle = getQuestionTitle(question, language)
                return (
                  <button
                    key={questionId}
                    onClick={async () => {
                      const currentPageId = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'home' : 'home'
                      addMessage(currentPageId, { role: "user", content: questionTitle, questionId: questionId })
                      if (question.type === "interactive" && question.component) {
                        addMessage(currentPageId, { role: "bot", content: "", questionId: questionId, type: "interactive", componentName: question.component, data: {} })
                      } else {
                        const res = await fetch(`/api/content?id=${questionId}&lang=${language}`)
                        const content = await res.text()
                        addMessage(currentPageId, { role: "bot", content, questionId: questionId, type: "text" })
                      }
                    }}
                    className="text-sm md:text-base px-4 py-2.5 rounded-lg border-2 border-suggestion text-suggestion font-semibold hover-suggestion transition-all shadow-custom-sm hover:shadow-custom-md bg-transparent"
                  >
                    {questionTitle}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}