// app/api/content/route.ts
import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const lang = searchParams.get("lang") || "fr" // langue par défaut: français
  
  if (!id) {
    return new NextResponse("Missing id parameter", { status: 400 })
  }
  
  try {
    // Chemin vers le fichier markdown dans le dossier de langue approprié
    const file = path.join(process.cwd(), "content/questions", lang, `${id}.md`)
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(file)) {
      // Fallback vers le français si le fichier n'existe pas
      const fallbackFile = path.join(process.cwd(), "content/questions/fr", `${id}.md`)
      if (fs.existsSync(fallbackFile)) {
        const content = fs.readFileSync(fallbackFile, "utf-8")
        return new NextResponse(content)
      }
      return new NextResponse("Content not found", { status: 404 })
    }
    
    const content = fs.readFileSync(file, "utf-8")
    return new NextResponse(content)
  } catch (error) {
    console.error("Error reading content:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}