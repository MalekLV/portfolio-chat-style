// components/interactive/ApplicationsGrid.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import Image from "next/image"
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react"

type ApplicationItem = {
  application: string
  commentaire_fr: string
  commentaire_en: string
  images: string
  groupe: string
  id_associe: string[]
}

type ApplicationGroup = {
  name: string
  titleFr: string
  titleEn: string
  descriptionFr: string
  descriptionEn: string
  color: string
  bgColor: string
  applications: ApplicationItem[]
}

type Props = {
  data?: any
  language: "fr" | "en"
  pageId?: string
}

// Configuration des groupes avec traductions et couleurs (palette harmonieuse)
const GROUP_CONFIG: Record<string, Omit<ApplicationGroup, "applications">> = {
  office: {
    name: "office",
    titleFr: "Suite Microsoft Office",
    titleEn: "Microsoft Office Suite",
    descriptionFr: "Outils de productivité et de collaboration Microsoft",
    descriptionEn: "Microsoft productivity and collaboration tools",
    color: "#8B5A2B",
    bgColor: "rgba(139, 90, 43, 0.1)"
  },
  data: {
    name: "data",
    titleFr: "Gestion de données",
    titleEn: "Data Management",
    descriptionFr: "Outils de bases de données et d'analyse de données",
    descriptionEn: "Database and data analysis tools",
    color: "#4A5A6A",
    bgColor: "rgba(74, 90, 106, 0.1)"
  },
  dev: {
    name: "dev",
    titleFr: "Développement",
    titleEn: "Development",
    descriptionFr: "Environnements de développement et outils de gestion de projet",
    descriptionEn: "Development environments and project management tools",
    color: "#5A4A3D",
    bgColor: "rgba(90, 74, 61, 0.1)"
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

export default function ApplicationsGrid({ language, pageId = "competences" }: Props) {
  console.log('🎨 ApplicationsGrid - Composant monté avec language:', language, 'pageId:', pageId)
  
  const [applicationGroups, setApplicationGroups] = useState<ApplicationGroup[]>([])
  const [visibleGroupCount, setVisibleGroupCount] = useState(0)
  const [hoveredApplication, setHoveredApplication] = useState<string | null>(null)
  const [isPopupHovered, setIsPopupHovered] = useState(false)
  const [hoveredGroupIndex, setHoveredGroupIndex] = useState<number | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ left?: string, right?: string, transform?: string }>({})
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['office', 'data', 'dev']))
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
    async function loadApplications() {
      try {
        console.log('🔍 ApplicationsGrid - Début du chargement du CSV des applications...')
        const csvUrl = '/interactive/applications.csv'
        console.log('🔍 ApplicationsGrid - URL du CSV:', csvUrl)
        
        const res = await fetch(csvUrl)
        console.log('📡 ApplicationsGrid - Réponse fetch:', res.status, res.statusText, res.ok)
        
        if (!res.ok) {
          const errorMsg = `Erreur HTTP: ${res.status} - Assurez-vous que le fichier est dans /public/interactive/applications.csv`
          console.error('❌ ApplicationsGrid -', errorMsg)
          setLoadingError(errorMsg)
          throw new Error(errorMsg)
        }
        
        const csvText = await res.text()
        console.log('📄 ApplicationsGrid - Contenu CSV chargé, longueur:', csvText.length)
        console.log('📄 ApplicationsGrid - Premières 300 caractères:', csvText.substring(0, 300))
        
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
        console.log('📋 ApplicationsGrid - Nombre de lignes:', lines.length)
        console.log('📋 ApplicationsGrid - Première ligne (header):', lines[0])
        
        const dataLines = lines.slice(1) // Ignorer l'en-tête
        console.log('📊 ApplicationsGrid - Nombre de lignes de données:', dataLines.length)
        
        const parsedApplications: ApplicationItem[] = []
        
        for (const line of dataLines) {
          const columns = line.split('\t').map(col => col.trim())
          console.log(`🔢 ApplicationsGrid - Ligne ${parsedApplications.length + 1}: ${columns.length} colonnes -`, columns[0])
          
          if (columns.length < 6) {
            console.warn('⚠️ ApplicationsGrid - Ligne ignorée (pas assez de colonnes):', columns.length, line.substring(0, 50))
            continue
          }
          
          const [application, commentaire_fr, commentaire_en, images, groupe, id_associe_raw] = columns
          
          let id_associe: string[] = []
          if (id_associe_raw && id_associe_raw.length > 0) {
            id_associe = id_associe_raw.split(',').map(id => id.trim()).filter(id => id.length > 0)
          }
          
          if (application && images && groupe) {
            const applicationItem = {
              application,
              commentaire_fr: commentaire_fr || "",
              commentaire_en: commentaire_en || "",
              images,
              groupe,
              id_associe
            }
            console.log('✅ ApplicationsGrid - Application ajoutée:', applicationItem.application, 'groupe:', applicationItem.groupe, 'questions:', applicationItem.id_associe.length)
            parsedApplications.push(applicationItem)
          } else {
            console.warn('⚠️ ApplicationsGrid - Application ignorée (données manquantes):', { application, images, groupe })
          }
        }
        
        console.log('🎯 ApplicationsGrid - Total applications chargées:', parsedApplications.length)
        
        // Organiser par groupes
        const groups: ApplicationGroup[] = []
        const groupOrder = ['office', 'data', 'dev']
        
        groupOrder.forEach(groupKey => {
          const groupConfig = GROUP_CONFIG[groupKey]
          if (!groupConfig) {
            console.warn('⚠️ ApplicationsGrid - Config de groupe manquante pour:', groupKey)
            return
          }
          
          const applicationsInGroup = parsedApplications.filter(app => app.groupe === groupKey)
          console.log(`📦 ApplicationsGrid - Groupe ${groupKey}: ${applicationsInGroup.length} applications`)
          
          if (applicationsInGroup.length > 0) {
            groups.push({
              ...groupConfig,
              applications: applicationsInGroup
            })
          }
        })
        
        console.log('📦 ApplicationsGrid - Groupes créés:', groups.length)
        console.log('📦 ApplicationsGrid - Détail des groupes:', groups.map(g => ({ name: g.name, count: g.applications.length })))
        setApplicationGroups(groups)
        setLoadingError(null)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
        console.error("❌ ApplicationsGrid - Erreur lors du chargement des applications:", errorMsg)
        setLoadingError(errorMsg)
      }
    }
    
    loadApplications()
  }, [])

  // Animation progressive des groupes
  useEffect(() => {
    if (applicationGroups.length === 0) return
    
    if (!animationsEnabled) {
      setVisibleGroupCount(applicationGroups.length)
      setTimeout(() => setIsTyping(false), 0)
      return
    }
    
    setTimeout(() => setIsTyping(true), 0)
    
    const timer = setInterval(() => {
      setVisibleGroupCount(prev => {
        if (prev >= applicationGroups.length) {
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
          const currentGroup = applicationGroups[next - 1]
          if (!currentGroup) return
          const columnsCount = getColumnsCount(containerW)
          const rowsCount = Math.ceil(currentGroup.applications.length / columnsCount)
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
  }, [applicationGroups.length, animationsEnabled, setIsTyping])

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
    
    setHoveredApplication(null)
    setIsPopupHovered(false)
  }

  // Gérer l'entrée du hover sur une application
  const handleApplicationMouseEnter = (applicationKey: string, groupIndex: number, cardElement: HTMLDivElement) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredApplication(applicationKey)
    setHoveredGroupIndex(groupIndex)
    cardRef.current = cardElement
    setPopupPosition(calculatePopupPosition(cardElement))
  }

  // Gérer la sortie du hover sur une application
  const handleApplicationMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPopupHovered) {
        setHoveredApplication(null)
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
    setHoveredApplication(null)
    setHoveredGroupIndex(null)
  }

  console.log('🎨 ApplicationsGrid - Rendu avec:', {
    groupsCount: applicationGroups.length,
    visibleCount: visibleGroupCount,
    hasError: !!loadingError
  })

  // Afficher une erreur si le chargement a échoué
  if (loadingError) {
    return (
      <div className="w-full py-6">
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
                <p className="text-red-600 font-bold">
                  ❌ Erreur de chargement
                </p>
                <p className="text-sm">
                  {loadingError}
                </p>
                <p className="text-sm mt-2">
                  Vérifiez la console du navigateur (F12) pour plus de détails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-6" ref={containerRef}>
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
                  ? "Voici les applications et outils que j'ai utilisés, organisés par catégorie :" 
                  : "Here are the applications and tools I've used, organized by category:"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groupes d'applications */}
      <div className="space-y-8 px-4">
        {applicationGroups.map((group, groupIndex) => {
          const isVisible = groupIndex < visibleGroupCount
          const isExpanded = expandedGroups.has(group.name)
          
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
                <button
                  onClick={(e) => toggleGroupExpansion(group.name, e)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div 
                    className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 shadow-custom-md"
                    style={{ 
                      borderColor: group.color,
                      backgroundColor: group.bgColor
                    }}
                  >
                    <h3 
                      className="text-lg md:text-xl lg:text-2xl font-bold whitespace-nowrap"
                      style={{ color: group.color }}
                    >
                      {language === "fr" ? group.titleFr : group.titleEn}
                    </h3>
                    <span 
                      className="text-sm font-semibold px-3 py-1 rounded-full text-on-dark"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.applications.length}
                    </span>
                  </div>
                  
                  <div 
                    className="p-2 rounded-full transition-all"
                    style={{ 
                      backgroundColor: group.bgColor,
                      color: group.color
                    }}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>
                
                {isExpanded && (
                  <p 
                    className="mt-2 text-sm md:text-base lg:text-lg italic"
                    style={{ color: group.color }}
                  >
                    {language === "fr" ? group.descriptionFr : group.descriptionEn}
                  </p>
                )}
              </div>

              {/* Grille des applications */}
              {isExpanded && (
                <div 
                  className="grid gap-3 md:gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${getColumnsCount(containerWidth)}, minmax(0, 1fr))`
                  }}
                >
                  {group.applications.map((app, appIndex) => {
                    const isHovered = hoveredApplication === `${group.name}-${app.application}`
                    const commentaire = language === "fr" ? app.commentaire_fr : app.commentaire_en
                    const hasDescription = commentaire.length > 0
                    const hasRelatedQuestions = app.id_associe.length > 0
                    
                    return (
                      <div
                        key={appIndex}
                        className="relative"
                        style={{ 
                          overflow: 'visible'
                        }}
                      >
                        <div
                          ref={(el) => {
                            if (el && isHovered) {
                              cardRef.current = el
                            }
                          }}
                          onMouseEnter={(e) => handleApplicationMouseEnter(`${group.name}-${app.application}`, groupIndex, e.currentTarget)}
                          onMouseLeave={handleApplicationMouseLeave}
                          className={`relative bg-bot-bubble rounded-xl p-3 md:p-4 shadow-custom-md cursor-pointer transition-all duration-300 border-2 ${
                            isHovered 
                              ? 'shadow-custom-xl scale-105' 
                              : 'border-transparent hover:shadow-custom-lg'
                          }`}
                          style={{
                            borderColor: isHovered ? group.color : 'transparent'
                          }}
                        >
                          {/* Image de l'application */}
                          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-3 flex items-center justify-center">
                            <Image
                              src={`/icones/${app.images}`}
                              alt={app.application}
                              width={64}
                              height={64}
                              className="w-full h-full object-contain"
                              unoptimized
                            />
                          </div>
                          
                          {/* Nom de l'application */}
                          <h4 className="text-center text-xs md:text-sm lg:text-base font-semibold text-primary line-clamp-2">
                            {app.application}
                          </h4>

                          {/* Indicateur si hover disponible */}
                          {(hasDescription || hasRelatedQuestions) && (
                            <div 
                              className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-on-dark text-xs font-bold"
                              style={{ backgroundColor: group.color }}
                            >
                              <BookOpen size={12} className="md:w-3.5 md:h-3.5" />
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
                              ...popupPosition,
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
                                  {app.id_associe.map((qId, qIndex) => {
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
              )}
            </div>
          )
        })}
      </div>

      {/* Note de bas de page */}
      {visibleGroupCount >= applicationGroups.length && applicationGroups.length > 0 && (
        <div className="mt-8 px-4 space-y-6 animate-fade-in">
          <p className="text-center text-base md:text-lg text-muted italic">
            {language === "fr" 
              ? "Survolez une application pour voir sa description et les questions liées" 
              : "Hover over an application to see its description and related questions"}
          </p>

          {/* Questions associées finales */}
          <div className="flex flex-col items-center gap-4 mt-6">
            <p className="text-sm md:text-base font-bold text-primary uppercase tracking-wide">
              {language === "fr" ? "Pour aller plus loin" : "To go further"}
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              {["languages", "competences"].map(questionId => {
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