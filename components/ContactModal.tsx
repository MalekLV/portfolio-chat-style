// components/ContactModal.tsx
"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { useLanguageStore } from "../lib/languageStore"

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function ContactModal({ isOpen, onClose }: Props) {
  const t = useLanguageStore(s => s.t)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t("contact.nameError")
    }

    if (!formData.email.trim()) {
      newErrors.email = t("contact.emailError")
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t("contact.emailInvalid")
    }

    if (!formData.subject.trim()) {
      newErrors.subject = t("contact.subjectError")
    }

    if (!formData.message.trim()) {
      newErrors.message = t("contact.messageError")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = {
        access_key: "YOUR_ACCESS_KEY_HERE",
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message
      }

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          onClose()
          setFormData({
            name: "",
            email: "",
            subject: "",
            message: ""
          })
        }, 2000)
      } else {
        setErrors({ submit: t("contact.sendError") })
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
      setErrors({ submit: t("contact.sendError") })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    onClose()
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: ""
    })
    setErrors({})
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
        onClick={handleCancel}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-brown-dark rounded-lg shadow-custom-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header - Marron presque noir */}
          <div className="flex items-center justify-between p-6 bg-brown-darkest">
            <h2 className="text-xl font-semibold text-brown-light">{t("contact.title")}</h2>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-brown-dark rounded transition-colors text-brown-light opacity-80 hover:opacity-100"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Info contact */}
          <div className="p-6 text-sm text-brown-light space-y-2 opacity-90">
            <p>
              {t("contact.email")}{" "}
              <span className="font-semibold">levellymalek1@gmail.com</span>
            </p>
            <p>
              {t("contact.phone")}{" "}
              <span className="font-semibold">+33 7 67 37 36 71</span>
            </p>
          </div>

          {/* Formulaire */}
          <div className="px-6 pb-6 space-y-4" onKeyPress={handleKeyPress}>
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-2 text-brown-light">
                {t("contact.name")} <span className="text-brown-error">{t("contact.required")}</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg bg-brown-field px-4 py-2.5 outline-none transition-all text-brown-input font-medium focus:shadow-[0_0_0_2px_#2D2419,0_0_0_4px_#6B5A47]"
                placeholder={t("contact.namePlaceholder")}
              />
              {errors.name && (
                <p className="text-brown-error text-sm mt-1 font-medium">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2 text-brown-light">
                {t("contact.emailLabel")} <span className="text-brown-error">{t("contact.required")}</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg bg-brown-field px-4 py-2.5 outline-none transition-all text-brown-input font-medium focus:shadow-[0_0_0_2px_#2D2419,0_0_0_4px_#6B5A47]"
                placeholder={t("contact.emailPlaceholder")}
              />
              {errors.email && (
                <p className="text-brown-error text-sm mt-1 font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-semibold mb-2 text-brown-light">
                {t("contact.subject")} <span className="text-brown-error">{t("contact.required")}</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-lg bg-brown-field px-4 py-2.5 outline-none transition-all text-brown-input font-medium focus:shadow-[0_0_0_2px_#2D2419,0_0_0_4px_#6B5A47]"
                placeholder={t("contact.subjectPlaceholder")}
              />
              {errors.subject && (
                <p className="text-brown-error text-sm mt-1 font-medium">{errors.subject}</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-semibold mb-2 text-brown-light">
                {t("contact.message")} <span className="text-brown-error">{t("contact.required")}</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                className="w-full rounded-lg bg-brown-field px-4 py-2.5 outline-none transition-all resize-none text-brown-input font-medium focus:shadow-[0_0_0_2px_#2D2419,0_0_0_4px_#6B5A47]"
                placeholder={t("contact.messagePlaceholder")}
              />
              {errors.message && (
                <p className="text-brown-error text-sm mt-1 font-medium">{errors.message}</p>
              )}
            </div>

            {errors.submit && (
              <div className="p-3 bg-brown-error bg-opacity-20 rounded-lg text-brown-error text-sm font-medium shadow-custom-sm">
                {errors.submit}
              </div>
            )}

            {showSuccess && (
              <div className="p-3 bg-green-success rounded-lg text-green-success text-sm flex items-center gap-2 font-medium shadow-custom-sm">
                <span>✓</span>
                <span>{t("contact.success")}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleCancel}
                className="px-5 py-2 text-sm text-brown-light opacity-80 hover:opacity-100 transition-opacity font-medium"
                disabled={isSubmitting}
              >
                {t("chat.cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm bg-blue-dark text-white rounded-lg bg-blue-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-custom-md font-semibold"
              >
                {isSubmitting ? t("contact.sending") : t("contact.send")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}