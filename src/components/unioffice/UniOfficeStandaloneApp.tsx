import React, { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Crown,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Fullscreen,
  Highlighter,
  Laptop,
  Maximize2,
  Minimize2,
  PenTool,
  Printer,
  RotateCw,
  RotateCcw,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import UniOfficeRibbon from "./UniOfficeRibbon";
import UniOfficeAnnotationLayer from "./UniOfficeAnnotationLayer";
import UniOfficeWatermark from "./UniOfficeWatermark";
import UniOfficeProModal from "./UniOfficeProModal";
import type { AnnotationStroke, UniOfficeTab, UniOfficeTheme, UniOfficeTool } from "./types";
import { isNativeApp } from "../../utils/platform-app";

// Bundle the legacy PDF.js worker so older Safari / WebKit and iOS devices
// can run the worker without crashing on missing ES2023+ features.
const BUNDLED_PDF_WORKER_SRC = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
const PDF_WORKER_SRC =
  typeof window !== "undefined"
    ? `${window.location.origin}/pdf.worker.min.mjs?v=5.4.296-legacy-v1`
    : BUNDLED_PDF_WORKER_SRC;
pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

interface RecentFile {
  id: string;
  name: string;
  size: number;
  lastOpened: number;
  dataUrl?: string;
}

export const UniOfficeStandaloneApp: React.FC = () => {
  // Current loaded PDF
  const [fileData, setFileData] = useState<string | ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [scrollMode, setScrollMode] = useState<"single" | "continuous">("single");
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [touchZoomEnabled, setTouchZoomEnabled] = useState<boolean>(false);

  // UniOffice Tools
  const [activeTab, setActiveTab] = useState<UniOfficeTab>("lecture");
  const [annotationTool, setAnnotationTool] = useState<UniOfficeTool>("select");
  const [strokeColor, setStrokeColor] = useState<string>("#fde047");
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [strokesByPage, setStrokesByPage] = useState<Record<number, AnnotationStroke[]>>({});
  const [pageAspectRatios, setPageAspectRatios] = useState<Record<number, number>>({});
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [theme, setTheme] = useState<UniOfficeTheme>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("unioffice_theme");
      if (saved === "dark" || saved === "sepia" || saved === "emerald" || saved === "normal") {
        return saved;
      }
    }
    return "normal";
  });
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("unioffice_pro_unlocked") === "true";
    }
    return false;
  });

  // Recent files list
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    if (typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem("unioffice_recent_files");
        if (saved) return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save recent files
  const saveRecentFile = useCallback((name: string, size: number) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.name !== name);
      const updated = [{ id: Date.now().toString(), name, size, lastOpened: Date.now() }, ...filtered].slice(0, 8);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("unioffice_recent_files", JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFile(file);
  };

  const loadFile = (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setPageNumber(1);
    setStrokesByPage({});

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFileData(event.target.result);
        saveRecentFile(file.name, file.size);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadSamplePdf = async () => {
    try {
      setFileName("Guide_Academique_Exemple.pdf");
      setFileSize(247699);
      setPageNumber(1);
      setStrokesByPage({});
      const response = await fetch("/legal-documents/help-center.pdf");
      const buffer = await response.arrayBuffer();
      setFileData(buffer);
      saveRecentFile("Guide_Academique_Exemple.pdf", 247699);
    } catch (err) {
      console.error("Failed to load sample PDF:", err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      loadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCloseFile = () => {
    setFileData(null);
    setFileName("");
    setNumPages(0);
    setPageNumber(1);
  };

  const handlePageChange = (offset: number) => {
    setPageNumber((prev) => Math.max(1, Math.min(numPages, prev + offset)));
  };

  const handleZoomIn = () => setScale((prev) => Math.min(4.0, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => setScale((prev) => Math.max(0.5, +(prev - 0.25).toFixed(2)));
  const handleResetZoom = () => setScale(1.0);
  const handleFitWidth = () => setScale(1.25);
  const handleFitScreen = () => setScale(0.9);
  const handleRotateClockwise = () => setRotation((prev) => (prev + 90) % 360);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSelectTool = (tool: UniOfficeTool) => {
    setAnnotationTool(tool);
    if (tool !== "select" && activeTab !== "annotation") {
      setActiveTab("annotation");
    }
  };

  const handleSelectTheme = (newTheme: UniOfficeTheme) => {
    setTheme(newTheme);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("unioffice_theme", newTheme);
    }
  };

  const handleUndoStroke = () => {
    setStrokesByPage((prev) => {
      const pageStrokes = prev[pageNumber] || [];
      if (pageStrokes.length === 0) return prev;
      return {
        ...prev,
        [pageNumber]: pageStrokes.slice(0, -1),
      };
    });
  };

  const handleClearPageStrokes = () => {
    setStrokesByPage((prev) => ({
      ...prev,
      [pageNumber]: [],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!fileData) return;
    const blob = new Blob([fileData], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "UniOffice_Document.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Ko";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#040810] text-slate-100 flex flex-col font-sans select-none antialiased">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ========================================================================= */}
      {/* 1. HOME SCREEN / DASHBOARD (WHEN NO FILE IS LOADED)                       */}
      {/* ========================================================================= */}
      {!fileData && (
        <div className="flex-1 flex flex-col justify-between">
          {/* Top Brand Header */}
          <header className="flex h-16 items-center justify-between border-b border-emerald-950/60 bg-[#060c18] px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                <Shield className="h-5 w-5 fill-slate-950 stroke-[2.2]" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-white">UniOffice</span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-400 border border-emerald-500/30">
                    SecurPDF
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Suite Bureautique & Lecteur PDF Haute Définition</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsProModalOpen(true)}
                className={`flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition-all ${
                  isPro
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/50"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                }`}
              >
                <Crown className={`h-4 w-4 ${isPro ? "fill-amber-300" : ""}`} />
                <span>{isPro ? "UniOffice Pro VIP Actif" : "Passer à Pro VIP"}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0e1626] text-slate-300 hover:text-white"
                title="Plein écran"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
              </button>
            </div>
          </header>

          {/* Hero & File Open Section */}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
            <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Alternative moderne et sécurisée à WPS Office</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Lisez, Annotez & Sécurisez vos documents PDF
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Ouvrez n'importe quel fichier PDF de votre ordinateur ou téléphone. Profitez d'une fluidité instantanée,
                d'un surlignage haute précision et de 4 modes de confort oculaire.
              </p>
            </div>

            {/* Drag & Drop Card */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-emerald-400 bg-emerald-950/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-[1.01]"
                  : "border-slate-800 bg-[#0a101d]/90 hover:border-emerald-500/50 hover:bg-[#0c1424]"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                  <UploadCloud className="h-8 w-8 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Glissez-déposez un document PDF ici</h3>
                  <p className="text-xs text-slate-400 mt-1">Ou parcourez vos fichiers locaux depuis votre appareil</p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Ouvrir un fichier PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSamplePdf();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <span>Document d'exemple</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Files (if any) */}
            {recentFiles.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Documents récents
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentFiles([]);
                      if (typeof localStorage !== "undefined") {
                        localStorage.removeItem("unioffice_recent_files");
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    Effacer l'historique
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-800 bg-[#0a101d] hover:border-emerald-500/40 hover:bg-[#0e1626] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatFileSize(file.size)} • {new Date(file.lastOpened).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
              <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#070b14] flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Lecture HD & Zoom Vectoriel</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Rendu Retina supersamplé ultra-net sans flou. Défilement fluide page unique ou continu avec miniatures.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#070b14] flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  <Highlighter className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Annotations & Dessin Libre</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Surligneur fluorescent, stylet plume, choix des épaisseurs et des couleurs. Sauvegarde automatique des traits.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#070b14] flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Eye className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-white">4 Modes de Confort Oculaire</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Basculez instantanément entre Standard Clair, Nuit Sombre anti-fatigue, Sépia Reposant et Émeraude Académique.
                </p>
              </div>
            </div>

            {/* Mobile Download & Installation Banner */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#07121c] to-teal-950/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Installez UniOfficeSecurPDF sur votre téléphone</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Disponible en téléchargement direct pour Android (APK) et installable sur iPhone (PWA Safari).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href="/telecharger-android"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>APK Android</span>
                </a>
                <a
                  href="/"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>Plateforme Académique</span>
                </a>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800/80 bg-[#050912] py-4 px-6 text-center text-xs text-slate-500">
            UniOfficeSecurPDF • Suite Bureautique Indépendante • © {new Date().getFullYear()} Performance Académique
          </footer>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEWER SCREEN (WHEN A PDF FILE IS LOADED)                              */}
      {/* ========================================================================= */}
      {fileData && (
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Office Actions Header */}
          <div className="flex h-12 items-center justify-between border-b border-[#18202d] bg-[#070b14] px-3 sm:px-4 shrink-0">
            {/* Left: Back button & Document title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleCloseFile}
                className="flex items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white hover:border-emerald-500/50 transition-colors"
                title="Fermer ce document et revenir à l'accueil"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Accueil</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                  {fileName}
                </span>
                <span className="hidden md:inline text-[11px] text-slate-400 font-mono">
                  ({formatFileSize(fileSize)})
                </span>
              </div>
            </div>

            {/* Right: Actions (Open another, Print, Download, Pro, Fullscreen) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white"
                title="Ouvrir un autre fichier PDF"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ouvrir</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white"
                title="Imprimer le document"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Imprimer</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:border-emerald-500/50"
                title="Enregistrer / Télécharger"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Enregistrer</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProModalOpen(true)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  isPro
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/50"
                    : "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm"
                }`}
              >
                <Crown className={`h-3 w-3 ${isPro ? "fill-amber-300" : ""}`} />
                <span>{isPro ? "VIP" : "Pro"}</span>
              </button>
            </div>
          </div>

          {/* UniOffice Custom Ribbon */}
          <UniOfficeRibbon
            title={fileName}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            pageNumber={pageNumber}
            numPages={numPages}
            onPageChange={handlePageChange}
            scrollMode={scrollMode}
            onToggleScrollMode={() => setScrollMode((prev) => (prev === "continuous" ? "single" : "continuous"))}
            showSidebar={showSidebar}
            onToggleSidebar={() => setShowSidebar((prev) => !prev)}
            scale={scale}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitWidth={handleFitWidth}
            onFitScreen={handleFitScreen}
            onResetZoom={handleResetZoom}
            onRotateClockwise={handleRotateClockwise}
            touchZoomEnabled={touchZoomEnabled}
            onToggleTouchZoom={() => setTouchZoomEnabled((prev) => !prev)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            annotationTool={annotationTool}
            onSelectTool={handleSelectTool}
            strokeColor={strokeColor}
            onSelectColor={setStrokeColor}
            strokeWidth={strokeWidth}
            onSelectStrokeWidth={setStrokeWidth}
            onUndoStroke={handleUndoStroke}
            onClearPageStrokes={handleClearPageStrokes}
            hasStrokesOnPage={(strokesByPage[pageNumber] || []).length > 0}
            theme={theme}
            onSelectTheme={handleSelectTheme}
            isPro={isPro}
            onOpenProModal={() => setIsProModalOpen(true)}
          />

          {/* Main Viewer Body with Optional Thumbnails Sidebar & PDF Canvas */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Optional Sidebar Thumbnails */}
            {showSidebar && numPages > 0 && (
              <aside className="w-48 sm:w-56 border-r border-[#1f2838] bg-[#080d16] p-3 overflow-y-auto flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Miniatures</span>
                  <button
                    type="button"
                    onClick={() => setShowSidebar(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPageNumber(p)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                      pageNumber === p
                        ? "border-emerald-500 bg-emerald-500/15 shadow-sm"
                        : "border-[#1c2434] bg-[#0c121e] hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[11px] font-bold text-slate-300">Page {p}</span>
                  </button>
                ))}
              </aside>
            )}

            {/* Document Canvas Stage */}
            <div
              ref={containerRef}
              className={`flex-1 overflow-auto flex justify-center p-4 sm:p-6 transition-colors duration-300 relative ${
                theme === "dark"
                  ? "bg-[#05070a]"
                  : theme === "sepia"
                  ? "bg-[#251f18]"
                  : theme === "emerald"
                  ? "bg-[#021814]"
                  : "bg-[#0b101d]"
              }`}
            >
              <div
                className={`relative shadow-2xl transition-transform duration-200 ${
                  theme === "dark"
                    ? "brightness-90 invert hue-rotate-180"
                    : theme === "sepia"
                    ? "sepia-[0.35] brightness-95"
                    : theme === "emerald"
                    ? "brightness-95 contrast-105"
                    : ""
                }`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                <Document
                  file={fileData}
                  onLoadSuccess={({ numPages: loadedPages }) => {
                    setNumPages(loadedPages);
                    setPageNumber(1);
                  }}
                  loading={
                    <div className="flex flex-col items-center justify-center p-12 text-slate-300 gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <span className="text-xs font-semibold">Chargement du document PDF...</span>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center p-8 text-rose-400 gap-2 border border-rose-500/30 rounded-2xl bg-rose-950/20">
                      <span className="text-sm font-bold">Impossible d'ouvrir ce fichier PDF</span>
                      <span className="text-xs text-slate-400">Vérifiez que le fichier n'est pas endommagé.</span>
                    </div>
                  }
                >
                  {scrollMode === "single" ? (
                    <div className="relative">
                      <Page
                        pageNumber={pageNumber}
                        width={Math.max(300, Math.round(800 * scale))}
                        devicePixelRatio={Math.max(window.devicePixelRatio || 1, 2)}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        onRenderSuccess={(page) => {
                          if (page.width > 0 && page.height > 0) {
                            setPageAspectRatios((prev) => ({
                              ...prev,
                              [pageNumber]: page.height / page.width,
                            }));
                          }
                        }}
                      />
                      {/* Interactive Canvas Overlay for Surlignage & Stylet */}
                      <UniOfficeAnnotationLayer
                        pageNumber={pageNumber}
                        width={Math.max(300, Math.round(800 * scale))}
                        height={
                          pageAspectRatios[pageNumber]
                            ? Math.round(Math.max(300, Math.round(800 * scale)) * pageAspectRatios[pageNumber])
                            : Math.round(Math.max(300, Math.round(800 * scale)) * 1.414)
                        }
                        tool={annotationTool}
                        color={strokeColor}
                        strokeWidth={strokeWidth}
                        strokes={strokesByPage[pageNumber] || []}
                        onUpdateStrokes={(p, newStrokes) => {
                          setStrokesByPage((prev) => ({
                            ...prev,
                            [p]: newStrokes,
                          }));
                        }}
                      />
                      {/* Security Watermark (Only active on mobile when not Pro) */}
                      <UniOfficeWatermark
                        info={{
                          documentTitle: fileName,
                          studentName: "UniOffice SecurPDF Free",
                        }}
                        isPro={isPro}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => {
                        const currentWidth = Math.max(300, Math.round(800 * scale));
                        const currentHeight = pageAspectRatios[p]
                          ? Math.round(currentWidth * pageAspectRatios[p])
                          : Math.round(currentWidth * 1.414);
                        return (
                          <div key={p} className="relative">
                            <Page
                              pageNumber={p}
                              width={currentWidth}
                              devicePixelRatio={Math.max(window.devicePixelRatio || 1, 2)}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              onRenderSuccess={(page) => {
                                if (page.width > 0 && page.height > 0) {
                                  setPageAspectRatios((prev) => ({
                                    ...prev,
                                    [p]: page.height / page.width,
                                  }));
                                }
                              }}
                            />
                            <UniOfficeAnnotationLayer
                              pageNumber={p}
                              width={currentWidth}
                              height={currentHeight}
                              tool={annotationTool}
                              color={strokeColor}
                              strokeWidth={strokeWidth}
                              strokes={strokesByPage[p] || []}
                              onUpdateStrokes={(pageNum, newStrokes) => {
                                setStrokesByPage((prev) => ({
                                  ...prev,
                                  [pageNum]: newStrokes,
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Document>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pro Upgrade Modal with PayPal */}
      <UniOfficeProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        isPro={isPro}
        onTogglePro={() => setIsPro((prev) => !prev)}
      />
    </div>
  );
};

export default UniOfficeStandaloneApp;
