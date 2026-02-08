// components/interactive/FormationTimeline.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import Image from "next/image"

type FormationItem = {
  year: string
  title: string
  subtitle: string
  questionId: string
  logoImage: string // Logo de l'établissement
  relatedQuestions: string[]
}

type Props = {
  data?: any
  language: "fr" | "en"
  pageId?: string
}

export default function FormationTimeline({ language, pageId = "formation" }: Props) {
  const [formations, setFormations] = useState<FormationItem[]>([])
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
        return baseHeight + 60
      })
      setFormationHeights(heights)
    }
    
    measureHeights()
    
    window.addEventListener('resize', measureHeights)
    return () => window.removeEventListener('resize', measureHeights)
  }, [formations, visibleCount])

  // Charger et parser le CSV
  useEffect(() => {
    async function loadFormations() {
      try {
        console.log('🔍 Début du chargement du CSV...')
        const res = await fetch('/interactive/formation.csv')
        console.log('📡 Réponse fetch:', res.status, res.statusText)
        
        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`)
        }
        
        const csvText = await res.text()
        console.log('📄 Contenu CSV chargé, longueur:', csvText.length)
        console.log('📄 Premières lignes:', csvText.substring(0, 200))
        
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
        console.log('📋 Nombre de lignes:', lines.length)
        
        const dataLines = lines.slice(1)
        console.log('📊 Nombre de lignes de données:', dataLines.length)
        
        const parsedFormations: FormationItem[] = []
        
        for (const line of dataLines) {
          const columns = line.split('\t').map(col => col.trim())
          console.log('🔢 Colonnes trouvées:', columns.length, 'pour la ligne:', line.substring(0, 50))
          
          if (columns.length < 9) {
            console.warn('⚠️ Ligne ignorée (pas assez de colonnes):', columns.length, line)
            continue
          }
          
          const [
            id_formation,
            id_associe_raw,
            fr_annee,
            fr_titre,
            fr_sous_titre,
            en_annee,
            en_titre,
            en_sous_titre,
            images
          ] = columns
          
          const year = language === "fr" ? fr_annee : en_annee
          const title = language === "fr" ? fr_titre : en_titre
          const subtitle = language === "fr" ? fr_sous_titre : en_sous_titre
          
          let relatedQuestions: string[] = []
          
          if (id_formation && id_formation.length > 0) {
            relatedQuestions.push(id_formation)
            
            if (id_associe_raw && id_associe_raw.length > 0) {
              const associatedIds = id_associe_raw.split(',').map(id => id.trim()).filter(id => id.length > 0)
              relatedQuestions.push(...associatedIds)
            }
          }
          
          if (year && title) {
            const formation = {
              year,
              title,
              subtitle: subtitle || "",
              questionId: id_formation,
              logoImage: images || "",
              relatedQuestions
            }
            console.log('✅ Formation ajoutée:', formation)
            parsedFormations.push(formation)
          } else {
            console.warn('⚠️ Formation ignorée (manque year ou title):', { year, title })
          }
        }
        
        console.log('🎯 Total formations chargées:', parsedFormations.length)
        console.log('📦 Formations complètes:', parsedFormations)
        setFormations(parsedFormations)
      } catch (error) {
        console.error("❌ Erreur lors du chargement des formations:", error)
      }
    }
    
    loadFormations()
  }, [language])

  // Animation progressive des formations
  useEffect(() => {
    console.log('🎬 Animation: formations.length =', formations.length)
    if (formations.length === 0) return
    
    setIsTyping(true)
    
    if (!animationsEnabled) {
      setVisibleCount(formations.length)
      setIsTyping(false)
      return
    }
    
    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= formations.length) {
          clearInterval(timer)
          setIsTyping(false)
          return prev
        }
        return prev + 1
      })
    }, 1000)
    
    animationTimerRef.current = timer
    
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      setIsTyping(false)
    }
  }, [formations.length, animationsEnabled, setIsTyping])

  // Gérer le bouton d'accélération
  useEffect(() => {
    if (shouldSkip && visibleCount < formations.length) {
      setVisibleCount(formations.length)
      setIsTyping(false)
      
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      
      useChatStore.setState({ shouldSkip: false })
    }
  }, [shouldSkip, visibleCount, formations.length, setIsTyping])

  // Gérer le changement d'état des animations
  useEffect(() => {
    if (!animationsEnabled && visibleCount < formations.length) {
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
    
    const scrollTimer = setTimeout(() => {
      const scrollableParent = document.querySelector('.flex-1.overflow-y-auto')
      if (scrollableParent) {
        const scrollTop = scrollableParent.scrollTop
        const scrollHeight = scrollableParent.scrollHeight
        const clientHeight = scrollableParent.clientHeight
        
        const targetScroll = scrollTop + 250
        
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
    
    const currentPageId = typeof window !== 'undefined' 
      ? window.location.pathname.split('/')[1] || 'home'
      : 'home'
    
    addMessage(currentPageId, { 
      role: "user", 
      content: questionTitle,
      questionId: formation.questionId
    })
    
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
                  ? "Pour retracer mon parcours académique :" 
                  : "To trace my academic journey:"}
              </p>
            </div>
          </div>
        </div>
      </div>

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
                className={`relative ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  position: 'absolute',
                  top: `${yPosition}px`,
                  width: '100%',
                  transition: isVisible ? `opacity 0.5s ease ${animationsEnabled ? `${index * 100}ms` : '0ms'}, transform 0.5s ease ${animationsEnabled ? `${index * 100}ms` : '0ms'}` : 'none',
                  zIndex: isHovered ? 100 : 1
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
                >
                  {/* Zone de hover englobante */}
                  <div
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
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
                      <h3 className="text-xl md:text-2xl font-bold text-primary mb-3">
                        {formation.title}
                      </h3>
                      
                      {/* Logo de l'établissement + Sous-titre */}
                      {(formation.logoImage || formation.subtitle) && (
                        <div className="flex items-center gap-3">
                          {/* Logo de l'établissement */}
                          {formation.logoImage && (
                            <div className="w-12 h-12 flex-shrink-0">
                              <Image
                                src={`/${formation.logoImage}`}
                                alt={formation.subtitle}
                                width={48}
                                height={48}
                                className="w-full h-full object-contain"
                                unoptimized
                              />
                            </div>
                          )}
                          
                          {/* Sous-titre */}
                          {formation.subtitle && (
                            <p className="text-base md:text-lg text-secondary flex-1 font-semibold">
                              {formation.subtitle}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Questions liées (popup au hover) */}
                    {isHovered && formation.relatedQuestions.length > 0 && (
                      <div 
                        id={`popup-${index}`}
                        className="relative mt-3 w-full bg-main rounded-xl p-4 shadow-custom-xl border border-accent border-opacity-30"
                        style={{
                          maxHeight: '250px',
                          overflowY: 'auto'
                        }}
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