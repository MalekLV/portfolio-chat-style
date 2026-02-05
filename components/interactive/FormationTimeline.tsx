// components/interactive/FormationTimeline.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Image from "next/image"

type FormationItem = {
  year: string
  title: string
  subtitle: string
  questionId: string
  relatedQuestions: string[]
}

type Props = {
  data?: any
  language: "fr" | "en"
  pageId?: string
}

export default function FormationTimeline({ language, pageId = "formation" }: Props) {
  const [formations, setFormations] = useState<FormationItem[]>([])
  const [introText, setIntroText] = useState("")
  const [visibleCount, setVisibleCount] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [formationHeights, setFormationHeights] = useState<number[]>([])
  
  const addMessage = useChatStore(s => s.addMessage)
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const setIsTyping = useChatStore(s => s.setIsTyping)
  const isTyping = useChatStore(s => s.isTyping)
  const shouldSkip = useChatStore(s => s.shouldSkip)
  const t = useLanguageStore(s => s.t)
  const timelineRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const formationRefs = useRef<Array<HTMLDivElement | null>>([])
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mesurer les hauteurs des formations pour l'espacement dynamique
  useEffect(() => {
    if (formations.length === 0 || visibleCount === 0) return
    
    const measureHeights = () => {
      const heights = formationRefs.current.map((ref, index) => {
        if (!ref) return 240
        const baseHeight = ref.offsetHeight
        // Ajouter de l'espace supplémentaire si cette formation est survolée ET qu'on est sur mobile
        const extraSpace = (hoveredIndex === index && isMobile) ? 200 : 0
        return baseHeight + 60 + extraSpace
      })
      setFormationHeights(heights)
    }
    
    // Mesurer à chaque changement de hover
    measureHeights()
    
    window.addEventListener('resize', measureHeights)
    return () => window.removeEventListener('resize', measureHeights)
  }, [formations, visibleCount, hoveredIndex, isMobile])

  // Charger et parser le contenu markdown
  useEffect(() => {
    async function loadFormations() {
      try {
        const res = await fetch(`/api/content?id=formation&lang=${language}`)
        const markdown = await res.text()
        
        // Récupérer la question formation pour obtenir les id_associe
        const formationQuestion = getQuestionById("formation")
        const associatedIds = formationQuestion?.id_associe || []
        
        // Séparer par % en gardant les chiffres
        const sections = markdown.split('%')
        
        // Le premier élément est l'introduction (avant le premier %)
        if (sections.length > 0) {
          setIntroText(sections[0].trim())
        }
        
        // Parser les formations
        const parsedFormations: FormationItem[] = []
        
        for (let i = 1; i < sections.length; i++) {
          const section = sections[i].trim()
          if (section.length === 0) continue
          
          // Extraire le chiffre au début de la section (si présent)
          const numberMatch = section.match(/^(\d+)\s*/)
          let questionIndex = -1
          let content = section
          
          if (numberMatch) {
            questionIndex = parseInt(numberMatch[1], 10)
            // Enlever le chiffre du contenu
            content = section.substring(numberMatch[0].length).trim()
          }
          
          const questionId = questionIndex >= 0 && questionIndex < associatedIds.length 
            ? associatedIds[questionIndex] 
            : ""
          
          // Parser le contenu de la formation
          const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0)
          
          let year = ""
          let title = ""
          let subtitle = ""
          
          for (const line of lines) {
            // Chercher l'année (texte entre __ __)
            const yearMatch = line.match(/__(.*?)__/)
            if (yearMatch) {
              year = yearMatch[1].trim()
              continue
            }
            
            // Chercher le titre (texte entre ** **)
            const titleMatch = line.match(/\*\*(.*?)\*\*/)
            if (titleMatch) {
              title = titleMatch[1].trim()
              continue
            }
            
            // Le reste est le sous-titre
            if (!yearMatch && !titleMatch && line.length > 0) {
              subtitle += (subtitle ? " " : "") + line
            }
          }
          
          // Récupérer les questions liées
          let relatedQuestions: string[] = []
          
          if (questionId) {
            // La première question liée est la question principale
            relatedQuestions.push(questionId)
            
            // Ajouter les questions associées à cette question
            const mainQuestion = getQuestionById(questionId)
            if (mainQuestion && mainQuestion.id_associe) {
              relatedQuestions.push(...mainQuestion.id_associe)
            }
          }
          
          if (year && title) {
            parsedFormations.push({
              year,
              title,
              subtitle,
              questionId,
              relatedQuestions
            })
          }
        }
        
        setFormations(parsedFormations)
      } catch (error) {
        console.error("Erreur lors du chargement des formations:", error)
      }
    }
    
    loadFormations()
  }, [language])

  // Animation progressive des formations
  useEffect(() => {
    if (formations.length === 0) return
    
    // Indiquer qu'une animation est en cours (pour le bouton d'accélération)
    setIsTyping(true)
    
    // Si les animations sont désactivées, afficher tout immédiatement
    if (!animationsEnabled) {
      setVisibleCount(formations.length)
      setIsTyping(false)
      return
    }
    
    // Sinon, animation progressive
    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= formations.length) {
          clearInterval(timer)
          setIsTyping(false)  // Animation terminée
          return prev
        }
        return prev + 1
      })
    }, 1000) // 1 seconde par formation
    
    animationTimerRef.current = timer
    
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      setIsTyping(false)
    }
  }, [formations.length, animationsEnabled, setIsTyping])

  // Gérer le bouton d'accélération (skipTyping)
  useEffect(() => {
    if (shouldSkip && visibleCount < formations.length) {
      // Afficher toutes les formations immédiatement
      setVisibleCount(formations.length)
      setIsTyping(false)
      
      // Arrêter le timer
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      
      // Reset du shouldSkip
      useChatStore.setState({ shouldSkip: false })
    }
  }, [shouldSkip, visibleCount, formations.length, setIsTyping])

  // Gérer le changement d'état des animations (bouton sidebar)
  useEffect(() => {
    if (!animationsEnabled && visibleCount < formations.length) {
      // Si animations désactivées et animation en cours, afficher tout
      setVisibleCount(formations.length)
      setIsTyping(false)
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
    }
  }, [animationsEnabled, visibleCount, formations.length, setIsTyping])

  // Scroller automatiquement pendant l'animation
  useEffect(() => {
    if (visibleCount === 0) return
    
    // Attendre un peu que le DOM soit mis à jour
    const scrollTimer = setTimeout(() => {
      const scrollableParent = document.querySelector('.flex-1.overflow-y-auto')
      if (scrollableParent) {
        const scrollTop = scrollableParent.scrollTop
        const scrollHeight = scrollableParent.scrollHeight
        const clientHeight = scrollableParent.clientHeight
        
        // Calculer la nouvelle position de scroll
        const targetScroll = scrollTop + 250
        
        // Scroller si on n'est pas déjà en bas
        if (scrollTop + clientHeight < scrollHeight) {
          scrollableParent.scrollTo({
            top: Math.min(targetScroll, scrollHeight - clientHeight),
            behavior: 'smooth'
          })
        }
      }
    }, 200)
    
    return () => clearTimeout(scrollTimer)
  }, [visibleCount])

  // Gérer le clic sur une formation
  const handleFormationClick = async (formation: FormationItem) => {
    if (!formation.questionId) return
    
    const question = getQuestionById(formation.questionId)
    if (!question) return
    
    const questionTitle = getQuestionTitle(question, language)
    
    // Utiliser le pageId correct depuis les props, pas "formation"
    const currentPageId = typeof window !== 'undefined' 
      ? window.location.pathname.split('/')[1] || 'home'
      : 'home'
    
    addMessage(currentPageId, { 
      role: "user", 
      content: questionTitle,
      questionId: formation.questionId
    })
    
    // Vérifier si c'est une question interactive
    if (question.type === "interactive" && question.component) {
      addMessage(currentPageId, {
        role: "bot",
        content: "",
        questionId: formation.questionId,
        type: "interactive",
        componentName: question.component,
        data: {}
      })
    } else {
      const res = await fetch(`/api/content?id=${formation.questionId}&lang=${language}`)
      const content = await res.text()
      
      addMessage(currentPageId, {
        role: "bot",
        content,
        questionId: formation.questionId,
        type: "text"
      })
    }
  }

  // Gérer le clic sur une question liée
  const handleRelatedQuestionClick = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const question = getQuestionById(questionId)
    if (!question) return
    
    const questionTitle = getQuestionTitle(question, language)
    
    // Utiliser le pageId correct depuis les props, pas "formation"
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
    
    setHoveredIndex(null)
  }

  // Calculer la position Y cumulative pour chaque formation
  const getFormationY = (index: number): number => {
    if (formationHeights.length === 0) return index * 240
    
    let y = 0
    for (let i = 0; i < index; i++) {
      y += formationHeights[i] || 240
    }
    return y
  }

  // Calculer la hauteur totale de la timeline
  const getTotalHeight = (): number => {
    if (formationHeights.length === 0) return formations.length * 240
    
    return formationHeights.reduce((acc, h) => acc + h, 0)
  }

  return (
    <div className="w-full py-6" ref={containerRef}>
      {/* Introduction - Style message bot classique avec photo de profil */}
      {introText && (
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
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                  }}
                >
                  {introText}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div 
        ref={timelineRef}
        className="relative w-full px-4"
      >
        {/* Ligne verticale - centrée sur les points */}
        <div 
          className="absolute w-1 bg-accent transition-all duration-1000 ease-out"
          style={{
            left: isMobile ? 'calc(1.5rem + 12px + 14px)' : 'calc(50% + 14px)',
            height: `${getTotalHeight() * Math.min(visibleCount, formations.length) / Math.max(formations.length, 1)}px`,
            top: '12px'
          }}
        />

        {/* Flèche en bas de la ligne - centrée sur la ligne */}
        {visibleCount > 0 && (
          <div 
            className="absolute transition-all duration-1000 ease-out"
            style={{
              left: isMobile ? 'calc(1.5rem + 12px + 14px + 2px)' : 'calc(50% + 14px + 2px)',
              top: `${12 + getTotalHeight() * Math.min(visibleCount, formations.length) / Math.max(formations.length, 1) - 15}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[15px] border-l-transparent border-r-transparent border-t-accent" />
          </div>
        )}

        {/* Formations */}
        <div className="pt-4">
          {formations.map((formation, index) => {
            const isVisible = index < visibleCount
            const isLeft = !isMobile && index % 2 === 0
            const isHovered = hoveredIndex === index
            const yPosition = getFormationY(index)
            
            return (
              <div
                key={index}
                className={`relative transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  position: 'absolute',
                  top: `${yPosition}px`,
                  width: '100%',
                  transitionDelay: animationsEnabled ? `${index * 100}ms` : '0ms'
                }}
              >
                {/* Point sur la timeline - centré sur la ligne */}
                <div 
                  className={`absolute w-6 h-6 rounded-full bg-accent border-4 border-main z-10 transition-all duration-300 ${
                    isHovered ? 'scale-125 shadow-custom-lg' : ''
                  }`}
                  style={{ 
                    left: isMobile ? 'calc(1.5rem + 12px)' : 'calc(50%)',
                    top: '12px',
                    transform: 'translate(-50%, -50%)'
                  }}
                />

                {/* Carte de formation */}
                <div
                  ref={el => {
                    formationRefs.current[index] = el
                  }}
                  className={`absolute ${
                    isMobile 
                      ? 'w-[calc(100%-5rem)]' 
                      : isLeft 
                        ? 'w-[calc(50%-3rem)]' 
                        : 'w-[calc(50%-3rem)]'
                  }`}
                  style={{ 
                    top: '-10px',
                    left: isMobile ? 'calc(1.5rem + 12px + 1.5rem)' : (isLeft ? 'auto' : 'calc(50% + 2rem)'),
                    right: isMobile ? 'auto' : (isLeft ? 'calc(50% + 2rem)' : 'auto')
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => {
                    // Ne fermer que si on ne survole pas le popup
                    setTimeout(() => {
                      const popup = document.getElementById(`popup-${index}`)
                      if (popup && !popup.matches(':hover')) {
                        setHoveredIndex(null)
                      }
                    }, 50)
                  }}
                >
                  {/* Année */}
                  <div 
                    className={`text-base md:text-lg font-bold text-accent mb-2 ${
                      isMobile ? 'text-left' : isLeft ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formation.year}
                  </div>

                  {/* Carte principale */}
                  <div
                    onClick={() => handleFormationClick(formation)}
                    className={`bg-bot-bubble rounded-xl p-5 shadow-custom-md cursor-pointer transition-all duration-300 ${
                      isHovered 
                        ? 'shadow-custom-xl scale-105 border-2 border-accent' 
                        : 'border-2 border-transparent hover:shadow-custom-lg'
                    }`}
                  >
                    <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">
                      {formation.title}
                    </h3>
                    
                    {formation.subtitle && (
                      <p className="text-base md:text-lg text-secondary">
                        {formation.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Questions liées (popup au hover) - Style suggestions bleues avec fond */}
                  {isHovered && formation.relatedQuestions.length > 0 && (
                    <div 
                      id={`popup-${index}`}
                      className="absolute z-50 mt-3 w-full bg-main rounded-xl p-4 shadow-custom-xl border border-accent border-opacity-30"
                      style={{
                        maxHeight: '250px',
                        overflowY: 'auto'
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <p className="text-sm font-bold text-primary mb-3 uppercase tracking-wide">
                        {language === "fr" ? "Questions liées" : "Related questions"}
                      </p>
                      
                      <div className="space-y-2">
                        {formation.relatedQuestions.map((qId, qIndex) => {
                          const question = getQuestionById(qId)
                          if (!question) return null
                          
                          const questionTitle = getQuestionTitle(question, language)
                          
                          return (
                            <button
                              key={qIndex}
                              onClick={(e) => handleRelatedQuestionClick(qId, e)}
                              className="w-full text-left text-sm md:text-base px-4 py-2.5 rounded-lg border-2 border-suggestion text-suggestion font-semibold hover-suggestion transition-all shadow-custom-sm hover:shadow-custom-md bg-transparent"
                            >
                              {questionTitle}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Note de bas de page - Espacée en fonction de la hauteur totale */}
      {visibleCount >= formations.length && formations.length > 0 && (
        <div 
          className="text-center animate-fade-in px-4"
          style={{
            marginTop: `${getTotalHeight() + 80}px`
          }}
        >
          <p className="text-base md:text-lg text-muted italic">
            {language === "fr" 
              ? "Cliquez sur une formation pour en savoir plus" 
              : "Click on a formation to learn more"}
          </p>
        </div>
      )}
    </div>
  )
}