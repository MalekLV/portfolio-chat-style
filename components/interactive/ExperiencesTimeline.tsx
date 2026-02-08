// components/interactive/ExperiencesTimeline.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import Image from "next/image"

type ExperienceItem = {
  year: string
  title: string
  subtitle: string
  questionId: string
  logoImage: string
  images: string[]
  imageNames: string[]
}

type Props = {
  data?: any
  language: "fr" | "en"
  pageId?: string
}

export default function ExperiencesTimeline({ language, pageId = "experiences" }: Props) {
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [experienceHeights, setExperienceHeights] = useState<number[]>([])
  
  const addMessage = useChatStore(s => s.addMessage)
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const setIsTyping = useChatStore(s => s.setIsTyping)
  const isTyping = useChatStore(s => s.isTyping)
  const shouldSkip = useChatStore(s => s.shouldSkip)
  const t = useLanguageStore(s => s.t)
  const timelineRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const experienceRefs = useRef<Array<HTMLDivElement | null>>([])
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

  // Mesurer les hauteurs des expériences pour l'espacement dynamique
  useEffect(() => {
    if (experiences.length === 0 || visibleCount === 0) return
    
    const measureHeights = () => {
      const heights = experienceRefs.current.map((ref, index) => {
        if (!ref) return 240
        const baseHeight = ref.offsetHeight
        return baseHeight + 60
      })
      setExperienceHeights(heights)
    }
    
    measureHeights()
    
    window.addEventListener('resize', measureHeights)
    return () => window.removeEventListener('resize', measureHeights)
  }, [experiences, visibleCount])

  // Charger et parser le CSV
  useEffect(() => {
    async function loadExperiences() {
      try {
        console.log('🔍 Début du chargement du CSV des expériences...')
        const res = await fetch('/interactive/experiences.csv')
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
        
        const parsedExperiences: ExperienceItem[] = []
        
        for (const line of dataLines) {
          const columns = line.split('\t').map(col => col.trim())
          console.log('🔢 Colonnes trouvées:', columns.length, 'pour la ligne:', line.substring(0, 50))
          
          // Vérifier si on a la nouvelle structure avec noms_langages (11 colonnes) ou l'ancienne (9 colonnes)
          const hasLanguageNames = columns.length >= 11
          
          if (columns.length < 9) {
            console.warn('⚠️ Ligne ignorée (pas assez de colonnes):', columns.length, line)
            continue
          }
          
          let id_experience, image_logo, fr_annee, fr_titre, fr_sous_titre, en_annee, en_titre, en_sous_titre, images_langages
          let fr_noms_langages = ""
          let en_noms_langages = ""
          
          if (hasLanguageNames) {
            // Nouvelle structure avec noms des langages
            [
              id_experience,
              image_logo,
              fr_annee,
              fr_titre,
              fr_sous_titre,
              en_annee,
              en_titre,
              en_sous_titre,
              images_langages,
              fr_noms_langages,
              en_noms_langages
            ] = columns
          } else {
            // Ancienne structure sans noms
            [
              id_experience,
              image_logo,
              fr_annee,
              fr_titre,
              fr_sous_titre,
              en_annee,
              en_titre,
              en_sous_titre,
              images_langages
            ] = columns
          }
          
          const year = language === "fr" ? fr_annee : en_annee
          const title = language === "fr" ? fr_titre : en_titre
          const subtitle = language === "fr" ? fr_sous_titre : en_sous_titre
          
          // Parser les images (séparées par des virgules)
          let images: string[] = []
          if (images_langages && images_langages.length > 0) {
            images = images_langages
              .split(',')
              .map(img => img.trim())
              .filter(img => img.length > 0)
          }
          
          // Parser les noms des langages selon la langue
          let imageNames: string[] = []
          const namesSource = language === "fr" ? fr_noms_langages : en_noms_langages
          
          if (namesSource && namesSource.length > 0) {
            imageNames = namesSource
              .split(',')
              .map(name => name.trim())
              .filter(name => name.length > 0)
          } else if (images.length > 0) {
            // Fallback : utiliser les noms de fichiers sans extension si pas de noms fournis
            imageNames = images.map(img => img.replace('.png', '').replace('.jpg', '').replace('.jpeg', ''))
          }
          
          if (year && title && id_experience) {
            const experience = {
              year,
              title,
              subtitle: subtitle || "",
              questionId: id_experience,
              logoImage: image_logo || "",
              images,
              imageNames
            }
            console.log('✅ Expérience ajoutée:', experience)
            parsedExperiences.push(experience)
          } else {
            console.warn('⚠️ Expérience ignorée (manque year, title ou id):', { year, title, id_experience })
          }
        }
        
        // INVERSER l'ordre pour avoir la plus récente en premier
        parsedExperiences.reverse()
        
        console.log('🎯 Total expériences chargées:', parsedExperiences.length)
        console.log('📦 Expériences complètes:', parsedExperiences)
        setExperiences(parsedExperiences)
      } catch (error) {
        console.error("❌ Erreur lors du chargement des expériences:", error)
      }
    }
    
    loadExperiences()
  }, [language])

  // Animation progressive des expériences
  useEffect(() => {
    console.log('🎬 Animation: experiences.length =', experiences.length)
    if (experiences.length === 0) return
    
    setIsTyping(true)
    
    if (!animationsEnabled) {
      setVisibleCount(experiences.length)
      setIsTyping(false)
      return
    }
    
    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= experiences.length) {
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
  }, [experiences.length, animationsEnabled, setIsTyping])

  // Gérer le bouton d'accélération
  useEffect(() => {
    if (shouldSkip && visibleCount < experiences.length) {
      setVisibleCount(experiences.length)
      setIsTyping(false)
      
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      
      useChatStore.setState({ shouldSkip: false })
    }
  }, [shouldSkip, visibleCount, experiences.length, setIsTyping])

  // Gérer le changement d'état des animations
  useEffect(() => {
    if (!animationsEnabled && visibleCount < experiences.length) {
      setVisibleCount(experiences.length)
      setIsTyping(false)
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
    }
  }, [animationsEnabled, visibleCount, experiences.length, setIsTyping])

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

  // Gérer le clic sur une expérience
  const handleExperienceClick = async (experience: ExperienceItem) => {
    if (!experience.questionId) return
    
    const question = getQuestionById(experience.questionId)
    if (!question) return
    
    const questionTitle = getQuestionTitle(question, language)
    
    const currentPageId = typeof window !== 'undefined' 
      ? window.location.pathname.split('/')[1] || 'home'
      : 'home'
    
    addMessage(currentPageId, { 
      role: "user", 
      content: questionTitle,
      questionId: experience.questionId
    })
    
    if (question.type === "interactive" && question.component) {
      addMessage(currentPageId, {
        role: "bot",
        content: "",
        questionId: experience.questionId,
        type: "interactive",
        componentName: question.component,
        data: {}
      })
    } else {
      const res = await fetch(`/api/content?id=${experience.questionId}&lang=${language}`)
      const content = await res.text()
      
      addMessage(currentPageId, {
        role: "bot",
        content,
        questionId: experience.questionId,
        type: "text"
      })
    }
  }

  // Calculer la position Y cumulative
  const getExperienceY = (index: number): number => {
    if (experienceHeights.length === 0) return index * 240
    
    let y = 0
    for (let i = 0; i < index; i++) {
      y += experienceHeights[i] || 240
    }
    return y
  }

  // Calculer la hauteur totale
  const getTotalHeight = (): number => {
    if (experienceHeights.length === 0) return experiences.length * 240
    
    return experienceHeights.reduce((acc, h) => acc + h, 0)
  }

  return (
    <div className="w-full py-6" ref={containerRef} style={{ overflow: 'visible' }}>
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
                  ? "Voici mon parcours professionnel :" 
                  : "Here is my professional journey:"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div 
        ref={timelineRef}
        className="relative w-full px-4"
        style={{ overflow: 'visible' }}
      >
        {/* Ligne verticale */}
        <div 
          className="absolute w-1 bg-accent transition-all duration-1000 ease-out"
          style={{
            left: isMobile ? 'calc(1.5rem + 12px + 14px)' : 'calc(50% + 14px)',
            height: `${getTotalHeight() * Math.min(visibleCount, experiences.length) / Math.max(experiences.length, 1)}px`,
            top: '12px'
          }}
        />

        {/* Flèche en bas */}
        {visibleCount > 0 && (
          <div 
            className="absolute transition-all duration-1000 ease-out"
            style={{
              left: isMobile ? 'calc(1.5rem + 12px + 14px + 2px)' : 'calc(50% + 14px + 2px)',
              top: `${12 + getTotalHeight() * Math.min(visibleCount, experiences.length) / Math.max(experiences.length, 1) - 15}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[15px] border-l-transparent border-r-transparent border-t-accent" />
          </div>
        )}

        {/* Expériences */}
        <div className="pt-4" style={{ overflow: 'visible' }}>
          {experiences.map((experience, index) => {
            const isVisible = index < visibleCount
            const isLeft = !isMobile && index % 2 === 0
            const isHovered = hoveredIndex === index
            const yPosition = getExperienceY(index)
            
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
                  zIndex: isHovered ? 100 : 1,
                  overflow: 'visible'
                }}
              >
                {/* Point sur la timeline */}
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

                {/* Carte d'expérience */}
                <div
                  ref={el => {
                    experienceRefs.current[index] = el
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
                    right: isMobile ? 'auto' : (isLeft ? 'calc(50% + 2rem)' : 'auto'),
                    overflow: 'visible'
                  }}
                >
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
                      {experience.year}
                    </div>

                    {/* Carte principale */}
                    <div
                      onClick={() => handleExperienceClick(experience)}
                      className={`bg-bot-bubble rounded-xl shadow-custom-md cursor-pointer transition-all duration-300 ${
                        isHovered 
                          ? 'shadow-custom-xl scale-105 border-2 border-accent' 
                          : 'border-2 border-transparent hover:shadow-custom-lg'
                      }`}
                      style={{ overflow: 'visible' }}
                    >
                      {/* Contenu principal avec padding */}
                      <div className="p-5">
                        {/* Titre */}
                        <h3 className="text-xl md:text-2xl font-bold text-primary mb-3">
                          {experience.title}
                        </h3>
                        
                        {/* Logo de l'entreprise + Sous-titre */}
                        {(experience.logoImage || experience.subtitle) && (
                          <div className="flex items-center gap-3">
                            {/* Logo de l'entreprise */}
                            {experience.logoImage && (
                              <div className="w-12 h-12 flex-shrink-0">
                                <Image
                                  src={`/${experience.logoImage}`}
                                  alt={experience.subtitle}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-contain"
                                  unoptimized
                                />
                              </div>
                            )}
                            
                            {/* Sous-titre */}
                            {experience.subtitle && (
                              <p className="text-base md:text-lg text-secondary flex-1 font-semibold">
                                {experience.subtitle}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section des icônes avec fond différent - Affichée seulement si présentes */}
                      {experience.images.length > 0 && (
                        <div 
                          className="px-5 py-4 border-t border-accent border-opacity-20 relative rounded-b-xl"
                        >
                          {/* Fond coloré sans affecter l'overflow */}
                          <div 
                            className="absolute inset-0 rounded-b-xl pointer-events-none"
                            style={{ backgroundColor: 'rgba(193, 181, 164, 0.35)' }}
                          />
                          <div className="relative flex flex-wrap justify-center gap-3">
                            {experience.images.map((imageName, imgIndex) => {
                              // Utiliser le nom personnalisé si disponible, sinon fallback sur le nom du fichier
                              const displayName = experience.imageNames[imgIndex] || imageName.replace('.png', '')
                              
                              return (
                                <div 
                                  key={imgIndex}
                                  className="relative w-12 h-12 hover:scale-110 transition-transform group"
                                >
                                  <Image
                                    src={`/icones/${imageName}`}
                                    alt={displayName}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-contain"
                                    unoptimized
                                  />
                                  {/* Tooltip stylisé pour le nom du langage */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                    style={{ zIndex: 9999 }}
                                  >
                                    {displayName}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Note de bas de page */}
      {visibleCount >= experiences.length && experiences.length > 0 && (
        <div 
          className="text-center animate-fade-in px-4"
          style={{
            marginTop: `${getTotalHeight() + 80}px`
          }}
        >
          <p className="text-base md:text-lg text-muted italic">
            {language === "fr" 
              ? "Cliquez sur une expérience pour en savoir plus" 
              : "Click on an experience to learn more"}
          </p>
        </div>
      )}
    </div>
  )
}