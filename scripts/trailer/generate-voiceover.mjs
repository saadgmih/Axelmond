import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAI } from "openai";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VOICE_DIR = path.join(__dirname, "work", "voiceovers");

const TEXTS = {
  "02_dashboard.mp3": "Performance Académique réunit tous les outils essentiels de l’apprentissage dans une seule plateforme.",
  "03_catalog.mp3": "Des formations structurées et accessibles.",
  "04_content.mp3": "Vidéos, documents et ressources pédagogiques sont organisés pour offrir une expérience d’apprentissage claire et continue.",
  "05_progression.mp3": "Chaque étudiant peut suivre son avancement et reprendre son apprentissage là où il s’est arrêté.",
  "06_live.mp3": "Les sessions en direct rapprochent les professeurs et les étudiants, où qu’ils soient.",
  "07_professor.mp3": "Les professeurs disposent d’un espace complet pour organiser, publier et accompagner leurs étudiants.",
  "08_conclusion.mp3": "Performance Académique. Transformez votre manière d’apprendre et d’enseigner."
};

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY in environment");
    process.exit(1);
  }

  fs.mkdirSync(VOICE_DIR, { recursive: true });
  const openai = new OpenAI({ apiKey });

  for (const [filename, text] of Object.entries(TEXTS)) {
    const dest = path.join(VOICE_DIR, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Already exists: ${filename}`);
      continue;
    }
    console.log(`Generating TTS for: ${filename} ("${text}")…`);
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    console.log(`Saved: ${dest}`);
  }
  console.log("All voiceovers generated successfully!");
}

main().catch(console.error);
