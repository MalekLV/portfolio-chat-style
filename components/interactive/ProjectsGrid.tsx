// components/interactive/ProjectsGrid.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useChatStore } from "../../lib/chatStore"
import { getQuestionById, getQuestionTitle } from "../../lib/questionHelper"
import { useLanguageStore } from "../../lib/languageStore"
import { useSettingsStore } from "../../lib/settingsStore"
import { Users } from "lucide-react"
import Image from "next/image"

type ProjectItem = {
  id: string
  title: string
  subtitle: string
  year: string
  teamSize: string
  logoImage: string
  logoName: string
  schoolQuestionId: string
  images: string[]
  imageNames: string[]
}

type Props = {
  data?: any
  language: "fr" | "en"
  pageId?: string
}

export default function ProjectsGrid({ language, pageId = "projets" }: Props) {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const addMessage = useChatStore(s => s.addMessage)
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled)
  const setIsTyping = useChatStore(s => s.setIsTyping)
  const shouldSkip = useChatStore(s => s.shouldSkip)
  const t = useLanguageStore(s => s.t)
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Charger et parser le CSV
  useEffect(() => {
    async function loadProjects() {
      try {
        console.log('🔍 Début du chargement du CSV des projets...')
        const res = await fetch('/interactive/projets.csv')
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
        
        const parsedProjects: ProjectItem[] = []
        
        for (const line of dataLines) {
          const columns = line.split('\t').map(col => col.trim())
          console.log('🔢 Colonnes trouvées:', columns.length, 'pour la ligne:', line.substring(0, 50))
          
          if (columns.length < 15) {
            console.warn('⚠️ Ligne ignorée (pas assez de colonnes):', columns.length, line)
            continue
          }
          
          const [
            id_projet,
            fr_titre,
            fr_sous_titre,
            fr_annee,
            en_titre,
            en_sous_titre,
            en_annee,
            equipe,
            images_langages,
            fr_nom_langages,
            en_nom_langages,
            image_ecole,
            id_ecole,
            fr_nom_ecole,
            en_nom_ecole
          ] = columns
          
          const title = language === "fr" ? fr_titre : en_titre
          const subtitle = language === "fr" ? fr_sous_titre : en_sous_titre
          const year = language === "fr" ? fr_annee : en_annee
          const logoName = language === "fr" ? fr_nom_ecole : en_nom_ecole
          
          // Parser les images (séparées par des virgules)
          let images: string[] = []
          if (images_langages && images_langages.length > 0) {
            images = images_langages
              .split(',')
              .map(img => img.trim())
              .filter(img => img.length > 0)
              .slice(0, 4) // Maximum 4 icônes
          }
          
          // Parser les noms des langages selon la langue
          let imageNames: string[] = []
          const namesSource = language === "fr" ? fr_nom_langages : en_nom_langages
          
          if (namesSource && namesSource.length > 0) {
            imageNames = namesSource
              .split(',')
              .map(name => name.trim())
              .filter(name => name.length > 0)
              .slice(0, 4) // Maximum 4 noms
          } else if (images.length > 0) {
            // Fallback : utiliser les noms de fichiers sans extension
            imageNames = images.map(img => img.replace('.png', '').replace('.jpg', '').replace('.jpeg', ''))
          }
          
          if (title && id_projet) {
            const project = {
              id: id_projet,
              title,
              subtitle: subtitle || "",
              year: year || "",
              teamSize: equipe || "1",
              logoImage: image_ecole || "",
              logoName: logoName || "",
              schoolQuestionId: id_ecole || "",
              images,
              imageNames
            }
            console.log('✅ Projet ajouté:', project)
            parsedProjects.push(project)
          } else {
            console.warn('⚠️ Projet ignoré (manque title ou id):', { title, id_projet })
          }
        }
        
        console.log('🎯 Total projets chargés:', parsedProjects.length)
        console.log('📦 Projets complets:', parsedProjects)
        setProjects(parsedProjects)
      } catch (error) {
        console.error("❌ Erreur lors du chargement des projets:", error)
      }
    }
    
    loadProjects()
  }, [language])

  // Animation progressive des projets
  useEffect(() => {
    console.log('🎬 Animation: projects.length =', projects.length)
    if (projects.length === 0) return
    
    setIsTyping(true)
    
    if (!animationsEnabled) {
      setVisibleCount(projects.length)
      setIsTyping(false)
      return
    }
    
    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= projects.length) {
          clearInterval(timer)
          setIsTyping(false)
          return prev
        }
        return prev + 1
      })
    }, 400) // Animation rapide (400ms entre chaque carte)
    
    animationTimerRef.current = timer
    
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      setIsTyping(false)
    }
  }, [projects.length, animationsEnabled, setIsTyping])

  // Gérer le bouton d'accélération
  useEffect(() => {
    if (shouldSkip && visibleCount < projects.length) {
      setVisibleCount(projects.length)
      setIsTyping(false)
      
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
      
      useChatStore.setState({ shouldSkip: false })
    }
  }, [shouldSkip, visibleCount, projects.length, setIsTyping])

  // Gérer le changement d'état des animations
  useEffect(() => {
    if (!animationsEnabled && visibleCount < projects.length) {
      setVisibleCount(projects.length)
      setIsTyping(false)
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
        animationTimerRef.current = null
      }
    }
  }, [animationsEnabled, visibleCount, projects.length, setIsTyping])

  // Scroller automatiquement pendant l'animation
  useEffect(() => {
    if (visibleCount === 0) return
    
    const scrollTimer = setTimeout(() => {
      const scrollableParent = document.querySelector('.flex-1.overflow-y-auto')
      if (scrollableParent) {
        const scrollTop = scrollableParent.scrollTop
        const scrollHeight = scrollableParent.scrollHeight
        const clientHeight = scrollableParent.clientHeight
        
        const targetScroll = scrollTop + 150
        
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

  // Gérer le clic sur un projet
  const handleProjectClick = async (project: ProjectItem) => {
    if (!project.id) return
    
    const question = getQuestionById(project.id)
    if (!question) return
    
    const questionTitle = getQuestionTitle(question, language)
    
    const currentPageId = typeof window !== 'undefined' 
      ? window.location.pathname.split('/')[1] || 'home'
      : 'home'
    
    addMessage(currentPageId, { 
      role: "user", 
      content: questionTitle,
      questionId: project.id
    })
    
    if (question.type === "interactive" && question.component) {
      addMessage(currentPageId, {
        role: "bot",
        content: "",
        questionId: project.id,
        type: "interactive",
        componentName: question.component,
        data: {}
      })
    } else {
      const res = await fetch(`/api/content?id=${project.id}&lang=${language}`)
      const content = await res.text()
      
      addMessage(currentPageId, {
        role: "bot",
        content,
        questionId: project.id,
        type: "text"
      })
    }
  }

  // Gérer le clic sur le logo de l'école
  const handleSchoolLogoClick = async (project: ProjectItem, e: React.MouseEvent) => {
    e.stopPropagation() // Empêcher le clic sur la carte
    
    if (!project.schoolQuestionId) return
    
    const question = getQuestionById(project.schoolQuestionId)
    if (!question) return
    
    const questionTitle = getQuestionTitle(question, language)
    
    const currentPageId = typeof window !== 'undefined' 
      ? window.location.pathname.split('/')[1] || 'home'
      : 'home'
    
    addMessage(currentPageId, { 
      role: "user", 
      content: questionTitle,
      questionId: project.schoolQuestionId
    })
    
    if (question.type === "interactive" && question.component) {
      addMessage(currentPageId, {
        role: "bot",
        content: "",
        questionId: project.schoolQuestionId,
        type: "interactive",
        componentName: question.component,
        data: {}
      })
    } else {
      const res = await fetch(`/api/content?id=${project.schoolQuestionId}&lang=${language}`)
      const content = await res.text()
      
      addMessage(currentPageId, {
        role: "bot",
        content,
        questionId: project.schoolQuestionId,
        type: "text"
      })
    }
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
                  ? "Voici une sélection de projets que j'ai réalisés :" 
                  : "Here is a selection of projects I have completed:"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille de projets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4" style={{ overflow: 'visible' }}>
        {projects.map((project, index) => {
          const isVisible = index < visibleCount
          const isHovered = hoveredIndex === index
          
          return (
            <div
              key={index}
              className={`transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
                overflow: 'visible'
              }}
            >
              <div
                onClick={() => handleProjectClick(project)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`bg-bot-bubble rounded-xl shadow-custom-md cursor-pointer transition-all duration-300 border-2 h-full flex flex-col relative ${
                  isHovered 
                    ? 'shadow-custom-xl scale-105 border-accent' 
                    : 'border-transparent hover:shadow-custom-lg'
                }`}
              >
                {/* Contenu principal */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Titre */}
                  <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">
                    {project.title}
                  </h3>
                  
                  {/* Sous-titre */}
                  {project.subtitle && (
                    <p className="text-base md:text-lg text-secondary mb-4 flex-1">
                      {project.subtitle}
                    </p>
                  )}

                  {/* Informations horizontales : Logo école + Année + Équipe */}
                  <div className="flex items-center gap-4 mt-auto">
                    {/* Logo de l'école */}
                    {project.logoImage && project.schoolQuestionId && (
                      <div className="relative">
                        <div 
                          className="relative group w-12 h-12"
                          onClick={(e) => handleSchoolLogoClick(project, e)}
                        >
                          <div className="w-12 h-12 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform">
                            <Image
                              src={`/${project.logoImage}`}
                              alt={project.logoName}
                              width={48}
                              height={48}
                              className="w-full h-full object-contain"
                              unoptimized
                            />
                          </div>
                          {/* Tooltip pour le nom de l'école */}
                          {project.logoName && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-accent text-on-dark text-xs rounded whitespace-nowrap shadow-custom-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                              style={{ zIndex: 9999 }}
                            >
                              {project.logoName}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Année */}
                    {project.year && (
                      <div className="text-base md:text-lg font-bold text-accent">
                        {project.year}
                      </div>
                    )}

                    {/* Équipe */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Users size={20} className="text-accent" />
                      <span className="text-base md:text-lg font-bold text-accent">
                        {project.teamSize}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section des icônes de langages avec fond différent */}
                {project.images.length > 0 && (
                  <div 
                    className="px-5 py-4 border-t border-accent border-opacity-20 relative rounded-b-xl"
                  >
                    {/* Fond coloré sans affecter l'overflow */}
                    <div 
                      className="absolute inset-0 rounded-b-xl pointer-events-none"
                      style={{ backgroundColor: 'rgba(193, 181, 164, 0.35)' }}
                    />
                    <div className="relative flex flex-wrap justify-center gap-3">
                      {project.images.map((imageName, imgIndex) => {
                        const displayName = project.imageNames[imgIndex] || imageName.replace('.png', '')
                        
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
                            {/* Tooltip pour le nom du langage */}
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
          )
        })}
      </div>

      {/* Note de bas de page */}
      {visibleCount >= projects.length && projects.length > 0 && (
        <div className="text-center mt-8 animate-fade-in px-4">
          <p className="text-base md:text-lg text-muted italic">
            {language === "fr" 
              ? "Cliquez sur un projet pour en savoir plus" 
              : "Click on a project to learn more"}
          </p>
        </div>
      )}
    </div>
  )
}