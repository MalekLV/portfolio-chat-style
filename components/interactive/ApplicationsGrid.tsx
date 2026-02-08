// components/interactive/ApplicationsGrid.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import Image from "next/image"
import { BookOpen } from "lucide-react"

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

export default function ApplicationsGrid({ language, pageId = "competences" }: Props) {
  console.log('🎨 ApplicationsGrid - Composant monté avec language:', language, 'pageId:', pageId)
  
  const [applicationGroups, setApplicationGroups] = useState<ApplicationGroup[]>([])
  const [visibleGroupCount, setVisibleGroupCount] = useState(0)
  const [hoveredApplication, setHoveredApplication] = useState<string | null>(null)
  const [isPopupHovered, setIsPopupHovered] = useState(false)
  const [hoveredGroupIndex, setHoveredGroupIndex] = useState<number | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ left?: string, right?: string, transform?: string }>({})
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  
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
    console.log('🎬 ApplicationsGrid - Animation: applicationGroups.length =', applicationGroups.length)
    if (applicationGroups.length === 0) return
    
    setIsTyping(true)
    
    if (!animationsEnabled) {
      console.log('⚡ ApplicationsGrid - Animations désactivées, affichage immédiat')
      setVisibleGroupCount(applicationGroups.length)
      setIsTyping(false)
      return
    }
    
    console.log('🎬 ApplicationsGrid - Démarrage de l\'animation progressive')
    const timer = setInterval(() => {
      setVisibleGroupCount(prev => {
        const next = prev + 1
        console.log(`🎬 ApplicationsGrid - Affichage groupe ${next}/${applicationGroups.length}`)
        if (next >= applicationGroups.length) {
          console.log('✅ ApplicationsGrid - Animation terminée')
          clearInterval(timer)
          setIsTyping(false)
          return applicationGroups.length
        }
        return next
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
  }, [applicationGroups.length, animationsEnabled, setIsTyping])

  // Gérer le bouton d'accélération
  useEffect(() => {
    if (shouldSkip && visibleGroupCount < applicationGroups.length) {
      console.log('⚡ ApplicationsGrid - Accélération demandée')
      setVisibleGroupCount(applicationGroups.length)
      setIsTyping(false)
      
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      
      useChatStore.setState({ shouldSkip: false })
    }
  }, [shouldSkip, visibleGroupCount, applicationGroups.length, setIsTyping])

  // Gérer le changement d'état des animations
  useEffect(() => {
    if (!animationsEnabled && visibleGroupCount < applicationGroups.length) {
      console.log('⚡ ApplicationsGrid - Animations désactivées en cours, affichage complet')
      setVisibleGroupCount(applicationGroups.length)
      setIsTyping(false)
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
    }
  }, [animationsEnabled, visibleGroupCount, applicationGroups.length, setIsTyping])

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

  // Calculer la position du popup en fonction de la position de la carte
  const calculatePopupPosition = (cardElement: HTMLElement) => {
    const rect = cardElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const popupWidth = 320 // 80 * 4 = 320px (w-80)
    
    const spaceOnLeft = rect.left
    const spaceOnRight = viewportWidth - rect.right
    
    // Si la popup centrée dépasserait à droite
    if (rect.left + rect.width / 2 + popupWidth / 2 > viewportWidth) {
      return { right: '0', left: 'auto', transform: 'none' }
    }
    // Si la popup centrée dépasserait à gauche
    else if (rect.left + rect.width / 2 - popupWidth / 2 < 0) {
      return { left: '0', right: 'auto', transform: 'none' }
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
                    {group.applications.length}
                  </span>
                </div>
                
                <p 
                  className="mt-2 text-base md:text-lg italic"
                  style={{ color: group.color }}
                >
                  {language === "fr" ? group.descriptionFr : group.descriptionEn}
                </p>
              </div>

              {/* Grille des applications */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                        className={`relative bg-bot-bubble rounded-xl p-4 shadow-custom-md cursor-pointer transition-all duration-300 border-2 ${
                          isHovered 
                            ? 'shadow-custom-xl scale-105' 
                            : 'border-transparent hover:shadow-custom-lg'
                        }`}
                        style={{
                          borderColor: isHovered ? group.color : 'transparent'
                        }}
                      >
                        {/* Image de l'application */}
                        <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
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
                        <h4 className="text-center text-sm md:text-base font-semibold text-primary line-clamp-2">
                          {app.application}
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