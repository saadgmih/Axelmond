import React, { useEffect, useState } from "react";
import {
  Download,
  FileText,
  Video as VideoIcon,
  Image as ImageIcon,
  ShieldCheck,
  Clock,
  User,
  ArrowLeft,
  LogIn,
  ExternalLink,
  BookOpen,
  ListVideo,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import PremiumVideoPlayer from "./PremiumVideoPlayer";
import LogoSymbol from "./LogoSymbol";
import { AntiCaptureShield, useContentProtection } from "./security/ContentProtection";
import type { AppUser } from "./AuthScreen";

interface ResourceData {
  id?: string;
  moduleId?: number;
  lessonId?: string;
  title: string;
  moduleName: string;
  courseId?: number;
  chapterName?: string;
  type: "VIDEO" | "PDF" | "IMAGE";
  url: string;
  duration?: string;
  fileName?: string;
  instructor?: string;
}

interface PublicModuleGroup {
  courseId: number;
  courseTitle: string;
  videos: Array<{
    id: string;
    moduleId: number;
    lessonId?: string;
    title: string;
    duration: string;
    url: string;
    publicPath: string;
  }>;
}

const DEFAULT_RESOURCE: ResourceData = {
  id: "c28-m106",
  moduleId: 106,
  lessonId: "50427f3c-5dd8-4f53-aa7f-e91721c8749f",
  title: "Théorème des accroissements finis : Cours & Exercices",
  moduleName: "Analyse 1-PC",
  courseId: 28,
  chapterName: "Théorème des accroissements finis",
  type: "VIDEO",
  url: "https://1t9oizz60b.ufs.sh/f/sSOaqnYcOFxgNHkNxmI0duxfgKplak5yJCGY3Xq8MBRPzvj2",
  duration: "1h 09 min",
  fileName: "Theoreme_des_accroissements_finis_cours_exercices.mp4",
  instructor: "Prof Oussama",
};

interface PublicResourceViewProps {
  currentUser?: AppUser;
  navigateTo?: (view: string) => void;
}

export default function PublicResourceView({ currentUser, navigateTo }: PublicResourceViewProps) {
  const [resource, setResource] = useState<ResourceData>(DEFAULT_RESOURCE);
  const [modulesCatalog, setModulesCatalog] = useState<PublicModuleGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [playlistDrawerOpen, setPlaylistDrawerOpen] = useState<boolean>(false);

  const { shieldActive: docShieldActive, dismissShield: dismissDocShield } = useContentProtection({
    enabled: resource.type !== "VIDEO",
  });

  // Load active resource based on URL
  useEffect(() => {
    async function loadResource() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const directSrc = searchParams.get("src");
        const directTitle = searchParams.get("title");
        const directModule = searchParams.get("module");
        const directType = (searchParams.get("type") || "").toUpperCase() as "VIDEO" | "PDF" | "IMAGE";

        // 1. Direct query parameters
        if (directSrc && directTitle) {
          setResource({
            title: directTitle,
            moduleName: directModule || "Module Universitaire",
            type: ["VIDEO", "PDF", "IMAGE"].includes(directType) ? directType : "VIDEO",
            url: directSrc,
            duration: searchParams.get("duration") || undefined,
            fileName: searchParams.get("fileName") || directTitle,
            instructor: searchParams.get("instructor") || "Prof Oussama",
          });
          setLoading(false);
          return;
        }

        // 2. Target ID from query (?id=...) or path (/ressource/:id)
        let targetId = searchParams.get("id") || searchParams.get("slug") || "";
        const queryCourseId = searchParams.get("courseId");
        const queryModuleId = searchParams.get("moduleId");

        if (!targetId && queryCourseId && queryModuleId) {
          targetId = `c${queryCourseId}-m${queryModuleId}`;
        }

        if (!targetId) {
          const pathParts = window.location.pathname.split("/").filter(Boolean);
          if (pathParts.length >= 2 && ["ressource", "apercu", "media"].includes(pathParts[0])) {
            targetId = pathParts[1];
          }
        }

        const endpoint = targetId
          ? `/api/public/resource/${encodeURIComponent(targetId)}`
          : "/api/public/resource";

        const res = await fetch(endpoint);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.resource) {
            setResource(json.resource);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Public resource API fetch failed, fallback to default", err);
      }

      setResource(DEFAULT_RESOURCE);
      setLoading(false);
    }

    loadResource();
  }, []);

  // Fetch full list of public videos by module
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch("/api/public/resources");
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.modules)) {
            setModulesCatalog(json.modules);
          }
        }
      } catch {
        // Silently ignore catalog fetch error
      }
    }
    fetchCatalog();
  }, []);

  const currentModuleGroup =
    modulesCatalog.find(
      (m) =>
        (resource.courseId && m.courseId === resource.courseId) ||
        m.courseTitle.toLowerCase().trim() === resource.moduleName.toLowerCase().trim() ||
        m.videos.some((v) => v.id === resource.id || v.title === resource.title)
    ) || null;

  return (
    <div className="min-h-screen bg-[#02130f] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white max-w-full overflow-x-hidden">
      {/* ── Top Bar / Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/30 bg-[#041d17]/90 backdrop-blur-md px-3 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 w-full max-w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <a
            href="/"
            className="flex items-center gap-2 sm:gap-3 text-emerald-200 hover:text-white transition-colors group min-w-0"
          >
            <LogoSymbol className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 group-hover:scale-105 transition-transform" />
            <div className="min-w-0">
              <span className="font-black text-xs sm:text-base tracking-tight text-white block leading-tight truncate">
                Performance Académique
              </span>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {currentModuleGroup && currentModuleGroup.videos.length > 0 && (
            <button
              type="button"
              onClick={() => setPlaylistDrawerOpen(!playlistDrawerOpen)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/70 border border-emerald-600/30 text-emerald-300 hover:bg-emerald-900/60 transition-all"
              title={`Voir les vidéos du module ${currentModuleGroup.courseTitle}`}
            >
              <ListVideo className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Vidéos du module</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentModuleGroup.videos.length}
              </span>
            </button>
          )}

          {currentUser ? (
            <button
              type="button"
              onClick={() => (navigateTo ? navigateTo("dashboard") : (window.location.href = "/student"))}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 transition-all whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mon Espace Étudiant</span>
              <span className="sm:hidden">Mon Espace</span>
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 transition-all whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Se connecter / S&apos;inscrire</span>
              <span className="md:hidden">Connexion</span>
            </a>
          )}
        </div>
      </header>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6 min-w-0">
        {/* Title & Metadata Card */}
        <div className="bg-[#052820]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl shadow-black/40 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
              {resource.moduleName}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
              {resource.type === "VIDEO" ? (
                <>
                  <VideoIcon className="w-3 h-3 text-emerald-400" />
                  Vidéo de Cours &amp; Exercices
                </>
              ) : resource.type === "PDF" ? (
                <>
                  <FileText className="w-3 h-3 text-emerald-400" />
                  Document PDF
                </>
              ) : (
                <>
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  Image Pédagogique
                </>
              )}
            </span>
            {resource.duration && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 bg-slate-900/60 border border-slate-700/50 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                {resource.duration}
              </span>
            )}
            {resource.instructor && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 bg-slate-900/60 border border-slate-700/50 flex items-center gap-1.5">
                <User className="w-3 h-3 text-slate-400" />
                {resource.instructor}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
            {resource.title}
          </h1>

          {resource.chapterName && (
            <p className="text-xs sm:text-sm text-emerald-200/80 font-medium flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Chapitre : <span className="text-white font-semibold">{resource.chapterName}</span>
            </p>
          )}
        </div>

        {/* ── Player / Media Viewer Container ─────────────────────────── */}
        <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-emerald-500/25 shadow-2xl">
          {loading ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center bg-black/80 gap-3 text-emerald-300">
              <div className="w-10 h-10 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-xs font-semibold">Chargement de la ressource...</p>
            </div>
          ) : resource.type === "VIDEO" ? (
            <PremiumVideoPlayer
              key={resource.url}
              src={resource.url}
              title={resource.title}
              instructor={resource.instructor || "Prof Oussama"}
              activeSector="student"
              showMetadata={true}
              currentUser={currentUser}
            />
          ) : resource.type === "PDF" ? (
            <div className="relative flex flex-col bg-slate-950 p-4 sm:p-6 space-y-4 overflow-hidden">
              <AntiCaptureShield active={docShieldActive} onDismiss={dismissDocShield} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-slate-300">Aperçu du document PDF :</span>
                <div className="flex items-center gap-2">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ouvrir en plein écran</span>
                  </a>
                  <a
                    href={resource.url}
                    download={resource.fileName || "document.pdf"}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </a>
                </div>
              </div>
              <iframe
                src={`${resource.url}#toolbar=1`}
                title={resource.title}
                className="w-full h-[650px] rounded-2xl border border-emerald-950 bg-slate-900"
              />
            </div>
          ) : (
            <div className="relative p-4 sm:p-8 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
              <AntiCaptureShield active={docShieldActive} onDismiss={dismissDocShield} />
              <img
                src={resource.url}
                alt={resource.title}
                className="max-h-[700px] w-auto max-w-full rounded-2xl object-contain shadow-xl"
              />
            </div>
          )}
        </div>

        {/* ── Training Invitation Card ─────────────────────────────────── */}
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#04241d] via-[#031c16] to-[#02130f] p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Programme académique officiel</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Vous préparez vos examens en {resource.moduleName} ?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Ce cours libre fait partie de notre cursus complet. Bénéficiez de tous les chapitres, vidéos
                d&apos;exercices d&apos;examens résolus pas à pas, résumés de cours PDF téléchargeables et séances de
                soutien live hebdomadaires avec les professeurs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <a
                href="/"
                className="w-full sm:w-auto text-center px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Rejoindre la formation {resource.moduleName}
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ── Module Videos Drawer Modal ─────────────────────────────── */}
      {playlistDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
          onClick={() => setPlaylistDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#041d17] border-l border-emerald-500/30 h-full p-6 overflow-y-auto space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-4">
              <div className="flex items-center gap-2">
                <ListVideo className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-black text-base text-white">Vidéos du module</h3>
                  <p className="text-xs text-emerald-400 font-bold">{currentModuleGroup?.courseTitle || resource.moduleName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlaylistDrawerOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-2">
              {currentModuleGroup && currentModuleGroup.videos.length > 0 ? (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 pb-1">
                    <span>
                      {currentModuleGroup.videos.length} vidéo{currentModuleGroup.videos.length > 1 ? "s" : ""} disponible{currentModuleGroup.videos.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {currentModuleGroup.videos.map((vid, idx) => {
                      const isActive = vid.id === resource.id || vid.title === resource.title;
                      return (
                        <a
                          key={vid.id}
                          href={vid.publicPath}
                          onClick={() => setPlaylistDrawerOpen(false)}
                          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            isActive
                              ? "bg-emerald-600 border-emerald-400 text-white font-bold shadow-md shadow-emerald-950/40"
                              : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-emerald-950/50 hover:text-white hover:border-emerald-500/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <p className="truncate font-semibold">{vid.title}</p>
                              {vid.duration && vid.duration !== "—" && (
                                <p className={`text-[10px] font-normal ${isActive ? "text-emerald-100" : "text-emerald-300/80"}`}>
                                  {vid.duration}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                        </a>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Aucune autre vidéo disponible pour ce module.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-emerald-950/40 bg-[#02130f] py-8 text-center text-xs text-slate-500 space-y-3 mt-12">
        <div className="flex flex-wrap justify-center gap-6 text-slate-400 font-medium">
          <a href="/about" className="hover:text-emerald-300 transition-colors">
            À propos
          </a>
          <a href="/contact" className="hover:text-emerald-300 transition-colors">
            Contact
          </a>
          <a href="/support" className="hover:text-emerald-300 transition-colors">
            Centre d&apos;aide
          </a>
          <a href="/privacy" className="hover:text-emerald-300 transition-colors">
            Confidentialité
          </a>
          <a href="/terms" className="hover:text-emerald-300 transition-colors">
            Conditions d&apos;utilisation
          </a>
        </div>
        <p>© 2026 Performance Académique. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
