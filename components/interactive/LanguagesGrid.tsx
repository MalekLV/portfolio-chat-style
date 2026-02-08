// components/interactive/LanguagesGrid.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import Image from "next/image"
import { BookOpen } from "lucide-react"

type LanguageItem = {
  langage: string
  commentaire_fr: string
  commentaire_en: string
  images: string
  groupe: string
  id_associe: string[]
}

type LanguageGroup = {
  name: string
  titleFr: string
  titleEn: string
  descriptionFr: string
  descriptionEn: string
  color: string
  bgColor: string
  languages: LanguageItem[]
}

type Props = {
  data?: any
  language: "fr" | "en"
  pageId?: string
}

// Configuration des groupes avec traductions et couleurs
const GROUP_CONFIG: Record<string, Omit<LanguageGroup, "languages">> = {
  maitre: {
    name: "maitre",
    titleFr: "Maîtrise avancée",
    titleEn: "Advanced Mastery",
    descriptionFr: "Langages que j'utilise quotidiennement et de manière approfondie",
    descriptionEn: "Languages I use daily with deep expertise",
    color: "#2D5F3F",
    bgColor: "rgba(45, 95, 63, 0.1)"
  },
  connaissance: {
    name: "connaissance",
    titleFr: "Connaissances solides",
    titleEn: "Solid Knowledge",
    descriptionFr: "Langages que je maîtrise et utilise régulièrement",
    descriptionEn: "Languages I master and use regularly",
    color: "#4A7C59",
    bgColor: "rgba(74, 124, 89, 0.1)"
  },
  web: {
    name: "web",
    titleFr: "Développement Web",
    titleEn: "Web Development",
    descriptionFr: "Technologies web modernes pour créer des interfaces",
    descriptionEn: "Modern web technologies for building interfaces",
    color: "#3B5F7C",
    bgColor: "rgba(59, 95, 124, 0.1)"
  },
  notion: {
    name: "notion",
    titleFr: "Notions",
    titleEn: "Basic Knowledge",
    descriptionFr: "Langages que j'ai découverts et pratiqués",
    descriptionEn: "Languages I've discovered and practiced",
    color: "#7D6B5C",
    bgColor: "rgba(125, 107, 92, 0.1)"
  },
  fichier: {
    name: "fichier",
    titleFr: "Formats de données",
    titleEn: "Data Formats",
    descriptionFr: "Formats de fichiers pour le traitement de données",
    descriptionEn: "File formats for data processing",
    color: "#8A7968",
    bgColor: "rgba(138, 121, 104, 0.1)"
  }
}

export default function LanguagesGrid({ language, pageId = "competences" }: Props) {
  const [languageGroups, setLanguageGroups] = useState<LanguageGroup[]>([])
  const [visibleGroupCount, setVisibleGroupCount] = useState(0)
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null)
  const [isPopupHovered, setIsPopupHovered] = useState(false)
  const [hoveredGroupIndex, setHoveredGroupIndex] = useState<number | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const addMessage = useChatStore(s => s.addMessage)
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const setIsTyping = useChatStore(s => s.setIsTyping)
  const shouldSkip = useChatStore(s => s.shouldSkip)
  const t = useLanguageStore(s => s.t)
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Charger et parser le CSV
  useEffect(() => {
    async function loadLanguages() {
      try {
        console.log('🔍 Début du chargement du CSV des langages...')
        const res = await fetch('/interactive/languages.csv')
        console.log('📡 Réponse fetch:', res.status, res.statusText)
        
        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`)
        }
        
        const csvText = await res.text()
        console.log('📄 Contenu CSV chargé, longueur:', csvText.length)
        
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
        console.log('📋 Nombre de lignes:', lines.length)
        
        const dataLines = lines.slice(1) // Ignorer l'en-tête
        console.log('📊 Nombre de lignes de données:', dataLines.length)
        
        const parsedLanguages: LanguageItem[] = []
        
        for (const line of dataLines) {
          const columns = line.split('\t').map(col => col.trim())
          console.log('🔢 Colonnes trouvées:', columns.length, 'pour la ligne:', line.substring(0, 50))
          
          if (columns.length < 6) {
            console.warn('⚠️ Ligne ignorée (pas assez de colonnes):', columns.length, line)
            continue
          }
          
          const [langage, commentaire_fr, commentaire_en, images, groupe, id_associe_raw] = columns
          
          let id_associe: string[] = []
          if (id_associe_raw && id_associe_raw.length > 0) {
            id_associe = id_associe_raw.split(',').map(id => id.trim()).filter(id => id.length > 0)
          }
          
          if (langage && images && groupe) {
            const languageItem = {
              langage,
              commentaire_fr: commentaire_fr || "",
              commentaire_en: commentaire_en || "",
              images,
              groupe,
              id_associe
            }
            console.log('✅ Langage ajouté:', languageItem)
            parsedLanguages.push(languageItem)
          } else {
            console.warn('⚠️ Langage ignoré (manque langage, images ou groupe):', { langage, images, groupe })
          }
        }
        
        console.log('🎯 Total langages chargés:', parsedLanguages.length)
        
        // Organiser par groupes
        const groups: LanguageGroup[] = []
        const groupOrder = ['maitre', 'connaissance', 'web', 'notion', 'fichier']
        
        groupOrder.forEach(groupKey => {
          const groupConfig = GROUP_CONFIG[groupKey]
          if (!groupConfig) return
          
          const languagesInGroup = parsedLanguages.filter(lang => lang.groupe === groupKey)
          
          if (languagesInGroup.length > 0) {
            groups.push({
              ...groupConfig,
              languages: languagesInGroup
            })
          }
        })
        
        console.log('📦 Groupes créés:', groups.length)
        setLanguageGroups(groups)
      } catch (error) {
        console.error("❌ Erreur lors du chargement des langages:", error)
      }
    }
    
    loadLanguages()
  }, [])

  // Animation progressive des groupes
  useEffect(() => {
    console.log('🎬 Animation: languageGroups.length =', languageGroups.length)
    if (languageGroups.length === 0) return
    
    setIsTyping(true)
    
    if (!animationsEnabled) {
      setVisibleGroupCount(languageGroups.length)
      setIsTyping(false)
      return
    }
    
    const timer = setInterval(() => {
      setVisibleGroupCount(prev => {
        if (prev >= languageGroups.length) {
          clearInterval(timer)
          setIsTyping(false)
          return prev
        }
        return prev + 1
      })
    }, 800) // 800ms entre chaque groupe
    
    animationTimerRef.current = timer
    
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      setIsTyping(false)
    }
  }, [languageGroups.length, animationsEnabled, setIsTyping])

  // Gérer le bouton d'accélération
  useEffect(() => {
    if (shouldSkip && visibleGroupCount < languageGroups.length) {
      setVisibleGroupCount(languageGroups.length)
      setIsTyping(false)
      
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      
      useChatStore.setState({ shouldSkip: false })
    }
  }, [shouldSkip, visibleGroupCount, languageGroups.length, setIsTyping])

  // Gérer le changement d'état des animations
  useEffect(() => {
    if (!animationsEnabled && visibleGroupCount < languageGroups.length) {
      setVisibleGroupCount(languageGroups.length)
      setIsTyping(false)
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
    }
  }, [animationsEnabled, visibleGroupCount, languageGroups.length, setIsTyping])

  // Scroller automatiquement pendant l'animation
  useEffect(() => {
    if (visibleGroupCount === 0) return
    
    const scrollTimer = setTimeout(() => {
      const scrollableParent = document.querySelector('.flex-1.overflow-y-auto')
      if (scrollableParent) {
        const scrollTop = scrollableParent.scrollTop
        const scrollHeight = scrollableParent.scrollHeight
        const clientHeight = scrollableParent.clientHeight
        
        const targetScroll = scrollTop + 200
        
        if (scrollTop + clientHeight < scrollHeight) {
          scrollableParent.scrollTo({
            top: Math.min(targetScroll, scrollHeight - clientHeight),
            behavior: 'smooth'
          })
        }
      }
    }, 200)
    
    return () => clearTimeout(scrollTimer)
  }, [visibleGroupCount])

  // Gérer le clic sur une question liée
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
    
    setHoveredLanguage(null)
    setIsPopupHovered(false)
  }

  // Gérer l'entrée du hover sur un langage
  const handleLanguageMouseEnter = (languageKey: string, groupIndex: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredLanguage(languageKey)
    setHoveredGroupIndex(groupIndex)
  }

  // Gérer la sortie du hover sur un langage
  const handleLanguageMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPopupHovered) {
        setHoveredLanguage(null)
        setHoveredGroupIndex(null)
      }
    }, 100)
  }

  // Gérer l'entrée du hover sur la popup
  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsPopupHovered(true)
  }

  // Gérer la sortie du hover sur la popup
  const handlePopupMouseLeave = () => {
    setIsPopupHovered(false)
    setHoveredLanguage(null)
    setHoveredGroupIndex(null)
  }

  return (
    <div className="w-full py-6">
      {/* Introduction */}
      <div className="mb-8 px-4">
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
          
          <div className="rounded-xl px-4 py-3 bg-bot-bubble text-primary shadow-custom-md max-w-3xl">
            <div className="prose prose-bot-bubble max-w-none text-base md:text-xl">
              <p>
                {language === "fr" 
                  ? "Voici les langages et technologies que je maîtrise, organisés par niveau de compétence :" 
                  : "Here are the languages and technologies I master, organized by skill level:"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groupes de langages */}
      <div className="space-y-8 px-4">
        {languageGroups.map((group, groupIndex) => {
          const isVisible = groupIndex < visibleGroupCount
          
          return (
            <div
              key={group.name}
              className={`${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transition: `opacity 0.7s ease ${isVisible ? `${groupIndex * 100}ms` : '0ms'}, transform 0.7s ease ${isVisible ? `${groupIndex * 100}ms` : '0ms'}`,
                position: 'relative',
                zIndex: hoveredGroupIndex === groupIndex ? 1000 : 1
              }}
            >
              {/* En-tête du groupe */}
              <div className="mb-4">
                <div 
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 shadow-custom-md"
                  style={{ 
                    borderColor: group.color,
                    backgroundColor: group.bgColor
                  }}
                >
                  <h3 
                    className="text-xl md:text-2xl font-bold"
                    style={{ color: group.color }}
                  >
                    {language === "fr" ? group.titleFr : group.titleEn}
                  </h3>
                  <span 
                    className="text-sm font-semibold px-3 py-1 rounded-full text-on-dark"
                    style={{ backgroundColor: group.color }}
                  >
                    {group.languages.length}
                  </span>
                </div>
                
                <p 
                  className="mt-2 text-base md:text-lg italic"
                  style={{ color: group.color }}
                >
                  {language === "fr" ? group.descriptionFr : group.descriptionEn}
                </p>
              </div>

              {/* Grille des langages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {group.languages.map((lang, langIndex) => {
                  const isHovered = hoveredLanguage === `${group.name}-${lang.langage}`
                  const commentaire = language === "fr" ? lang.commentaire_fr : lang.commentaire_en
                  const hasDescription = commentaire.length > 0
                  const hasRelatedQuestions = lang.id_associe.length > 0
                  
                  return (
                    <div
                      key={langIndex}
                      className="relative"
                      style={{ 
                        overflow: 'visible'
                      }}
                    >
                      <div
                        onMouseEnter={() => handleLanguageMouseEnter(`${group.name}-${lang.langage}`, groupIndex)}
                        onMouseLeave={handleLanguageMouseLeave}
                        className={`relative bg-bot-bubble rounded-xl p-4 shadow-custom-md cursor-pointer transition-all duration-300 border-2 ${
                          isHovered 
                            ? 'shadow-custom-xl scale-105' 
                            : 'border-transparent hover:shadow-custom-lg'
                        }`}
                        style={{
                          borderColor: isHovered ? group.color : 'transparent'
                        }}
                      >
                        {/* Image du langage */}
                        <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                          <Image
                            src={`/icones/${lang.images}`}
                            alt={lang.langage}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                            unoptimized
                          />
                        </div>
                        
                        {/* Nom du langage */}
                        <h4 className="text-center text-sm md:text-base font-semibold text-primary line-clamp-2">
                          {lang.langage}
                        </h4>

                        {/* Indicateur si hover disponible */}
                        {(hasDescription || hasRelatedQuestions) && (
                          <div 
                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-on-dark text-xs font-bold"
                            style={{ backgroundColor: group.color }}
                          >
                            <BookOpen size={14} />
                          </div>
                        )}
                      </div>

                      {/* Popup au hover */}
                      {isHovered && (hasDescription || hasRelatedQuestions) && (
                        <div 
                          onMouseEnter={handlePopupMouseEnter}
                          onMouseLeave={handlePopupMouseLeave}
                          className="absolute mt-2 w-80 bg-main rounded-xl p-4 shadow-custom-xl border-2"
                          style={{ 
                            borderColor: group.color,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 9999
                          }}
                        >
                          {/* Description */}
                          {hasDescription && (
                            <div className="mb-3">
                              <p className="text-sm md:text-base text-primary">
                                {commentaire}
                              </p>
                            </div>
                          )}

                          {/* Questions liées */}
                          {hasRelatedQuestions && (
                            <div>
                              <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">
                                {language === "fr" ? "Questions liées" : "Related questions"}
                              </p>
                              
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {lang.id_associe.map((qId, qIndex) => {
                                  const question = getQuestionById(qId)
                                  if (!question) return null
                                  
                                  const questionTitle = getQuestionTitle(question, language)
                                  
                                  return (
                                    <button
                                      key={qIndex}
                                      onClick={(e) => handleRelatedQuestionClick(qId, e)}
                                      className="w-full text-left text-xs md:text-sm px-3 py-2 rounded-lg border-2 font-semibold transition-all shadow-custom-sm hover:shadow-custom-md bg-transparent"
                                      style={{
                                        borderColor: group.color,
                                        color: group.color
                                      }}
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
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Note de bas de page */}
      {visibleGroupCount >= languageGroups.length && languageGroups.length > 0 && (
        <div className="mt-8 px-4 space-y-6 animate-fade-in">
          <p className="text-center text-base md:text-lg text-muted italic">
            {language === "fr" 
              ? "Survolez un langage pour voir sa description et les questions liées" 
              : "Hover over a language to see its description and related questions"}
          </p>

          {/* Questions associées finales */}
          <div className="flex flex-col items-center gap-4 mt-6">
            <p className="text-sm md:text-base font-bold text-primary uppercase tracking-wide">
              {language === "fr" ? "Pour aller plus loin" : "To go further"}
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              {["applications", "competences"].map(questionId => {
                const question = getQuestionById(questionId)
                if (!question) return null
                
                const questionTitle = getQuestionTitle(question, language)
                
                return (
                  <button
                    key={questionId}
                    onClick={async () => {
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