// lib/languageStore.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Language = "fr" | "en"

type Translations = {
  [key: string]: string
}

const translations: Record<Language, Translations> = {
  fr: {
    "app.title": "Malek Le Velly",
    "sidebar.title": "Portfolio",
    "sidebar.home": "Accueil",
    "sidebar.formation": "Formation",
    "sidebar.experiences": "Expériences",
    "sidebar.competences": "Compétences",
    "sidebar.projets": "Projets",
    "sidebar.personnel": "Personnel",
    "sidebar.contact": "Me contacter",
    "sidebar.linkedin": "LinkedIn",
    "sidebar.cvTooltip": "Obtenir mon CV",
    "sidebar.linkedinTooltip": "Visiter mon LinkedIn",
    "sidebar.githubTooltip": "Aller sur mon GitHub",
    "sidebar.animations": "Animations",
    "sidebar.animationsOn": "Animations activées",
    "sidebar.animationsOff": "Animations désactivées",
    "header.changeLanguage": "Changer de langue",
    "mobile.openMenu": "Ouvrir le menu",
    "mobile.closeMenu": "Fermer le menu",
    "home.greeting": "Bonjour ! Je suis **Malek Le Velly**, voici mon portfolio. \n\n **Petit conseil** : Ce n'est pas ChatGPT, mais un **portfolio interactif** !\n\nTapez des mots-clés (ex: \"formation\", \"langages\") ou explorez toutes les questions via le bouton **(+)** pour découvrir mon parcours.\n\nBonne visite !",
    "home.welcome": "Bienvenue sur mon portfolio interactif ! Posez-moi vos questions pour en savoir plus sur mon parcours.",
    "chat.placeholder": "Posez votre question...",
    "chat.placeholder.example1": "Ex: langages",
    "chat.placeholder.example2": "Ex: formation",
    "chat.placeholder.example3": "Ex: projets",
    "chat.placeholder.example4": "Ex: compétences",
    "chat.placeholder.default": "Ou cliquez sur [+]...",
    "chat.send": "Envoyer",
    "chat.allQuestions": "Toutes les questions",
    "chat.fallback": "Hmm, je n'ai pas trouvé de question correspondante... \n\n**Comment ça marche ?**\n- Tapez des **mots-clés** comme \"formation\", \"langages\", \"projets\"\n- Ou explorez le **catalogue complet** via le bouton (+)\n- Les **suggestions** apparaissent automatiquement pendant que vous tapez\n\n**Pourquoi ce système ?**\nPlutôt qu'une IA générative, j'ai créé un portfolio interactif où vous choisissez exactement ce que vous voulez découvrir. C'est plus rapide, plus contrôlé, et ça évite les hallucinations !",
    "chat.delete": "Supprimer",
    "chat.confirmDelete": "Confirmer la suppression",
    "chat.deleteMessage": "Êtes-vous sûr de vouloir supprimer cette conversation ?",
    "chat.noAskAgain": "Ne plus demander",
    "chat.cancel": "Annuler",
    "chat.delete.action": "Supprimer",
    "chat.accelerate": "Accélérer l'animation",
    "browser.title": "Toutes les questions",
    "browser.search": "Rechercher une question...",
    "browser.close": "Fermer",
    "browser.noResults": "Aucune question trouvée",
    "contact.title": "Me contacter",
    "contact.email": "Email :",
    "contact.phone": "Téléphone :",
    "contact.name": "Nom",
    "contact.required": "*",
    "contact.namePlaceholder": "Votre nom",
    "contact.nameError": "Le nom est requis",
    "contact.emailLabel": "Email",
    "contact.emailPlaceholder": "votre.email@exemple.fr",
    "contact.emailError": "L'email est requis",
    "contact.emailInvalid": "L'email n'est pas valide",
    "contact.subject": "Objet",
    "contact.subjectPlaceholder": "Objet de votre message",
    "contact.subjectError": "L'objet est requis",
    "contact.message": "Message",
    "contact.messagePlaceholder": "Votre message...",
    "contact.messageError": "Le message est requis",
    "contact.send": "Envoyer",
    "contact.sending": "Envoi...",
    "contact.success": "Message envoyé avec succès !",
    "contact.sendError": "Erreur lors de l'envoi du message",
    "onboarding.skip": "Passer",
    "onboarding.next": "Suivant",
    "onboarding.plusButton.title": "Catalogue de questions",
    "onboarding.plusButton.description": "Cliquez ici pour voir toutes les questions disponibles et naviguer facilement dans mon portfolio.",
    "onboarding.sidebar.title": "Navigation par sections",
    "onboarding.sidebar.description": "Explorez les différentes sections de mon parcours : formation, expériences, compétences, projets...",
    "onboarding.animations.title": "Contrôle des animations",
    "onboarding.animations.description": "Activez ou désactivez les animations d'écriture selon vos préférences."
  },
  en: {
    "app.title": "Malek Le Velly",
    "sidebar.title": "Portfolio",
    "sidebar.home": "Home",
    "sidebar.formation": "Education",
    "sidebar.experiences": "Experiences",
    "sidebar.competences": "Skills",
    "sidebar.projets": "Projects",
    "sidebar.personnel": "Personal",
    "sidebar.contact": "Contact me",
    "sidebar.linkedin": "LinkedIn",
    "sidebar.cvTooltip": "Get my resume",
    "sidebar.linkedinTooltip": "Visit my LinkedIn",
    "sidebar.githubTooltip": "Go to my GitHub",
    "sidebar.animations": "Animations",
    "sidebar.animationsOn": "Animations enabled",
    "sidebar.animationsOff": "Animations disabled",
    "header.changeLanguage": "Change language",
    "mobile.openMenu": "Open menu",
    "mobile.closeMenu": "Close menu",
    "home.greeting": "Hello! I'm **Malek LE VELLY**, this is my portfolio. \n\n**Quick tip**: This isn't ChatGPT, but an **interactive portfolio**!\n\nType keywords (e.g., \"education\", \"languages\") or explore all questions via the **(+)** button to discover my journey.\n\nEnjoy your visit! ",
    "home.welcome": "Welcome to my interactive portfolio! Ask me questions to learn more about my background.",
    "chat.placeholder": "Ask your question...",
    "chat.placeholder.example1": "Ex: languages",
    "chat.placeholder.example2": "Ex: education",
    "chat.placeholder.example3": "Ex: projects",
    "chat.placeholder.example4": "Ex: skills",
    "chat.placeholder.default": "Or click on [+]...",
    "chat.send": "Send",
    "chat.allQuestions": "All questions",
    "chat.fallback": "Hmm, I couldn't find a matching question... \n\n**How does it work?**\n- Type **keywords** like \"education\", \"languages\", \"projects\"\n- Or explore the **complete catalog** via the (+) button\n- **Suggestions** appear automatically as you type\n\n**Why this system?**\nRather than generative AI, I created an interactive portfolio where you choose exactly what you want to discover. It's faster, more controlled, and avoids hallucinations!",
    "chat.delete": "Delete",
    "chat.confirmDelete": "Confirm deletion",
    "chat.deleteMessage": "Are you sure you want to delete this conversation?",
    "chat.noAskAgain": "Don't ask again",
    "chat.cancel": "Cancel",
    "chat.delete.action": "Delete",
    "chat.accelerate": "Accelerate animation",
    "browser.title": "All questions",
    "browser.search": "Search for a question...",
    "browser.close": "Close",
    "browser.noResults": "No questions found",
    "contact.title": "Contact me",
    "contact.email": "Email:",
    "contact.phone": "Phone:",
    "contact.name": "Name",
    "contact.required": "*",
    "contact.namePlaceholder": "Your name",
    "contact.nameError": "Name is required",
    "contact.emailLabel": "Email",
    "contact.emailPlaceholder": "your.email@example.com",
    "contact.emailError": "Email is required",
    "contact.emailInvalid": "Email is not valid",
    "contact.subject": "Subject",
    "contact.subjectPlaceholder": "Subject of your message",
    "contact.subjectError": "Subject is required",
    "contact.message": "Message",
    "contact.messagePlaceholder": "Your message...",
    "contact.messageError": "Message is required",
    "contact.send": "Send",
    "contact.sending": "Sending...",
    "contact.success": "Message sent successfully!",
    "contact.sendError": "Error sending message",
    "onboarding.skip": "Skip",
    "onboarding.next": "Next",
    "onboarding.plusButton.title": "Question catalog",
    "onboarding.plusButton.description": "Click here to see all available questions and easily navigate through my portfolio.",
    "onboarding.sidebar.title": "Section navigation",
    "onboarding.sidebar.description": "Explore different sections of my journey: education, experiences, skills, projects...",
    "onboarding.animations.title": "Animation control",
    "onboarding.animations.description": "Enable or disable typing animations according to your preferences."
  }
}

type LanguageStore = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: "fr",
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const lang = get().language
        return translations[lang][key] || key
      }
    }),
    {
      name: "portfolio-language"
    }
  )
)