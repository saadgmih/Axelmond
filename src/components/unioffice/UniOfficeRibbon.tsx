import React from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eraser,
  Eye,
  FileText,
  Fullscreen,
  Hand,
  Highlighter,
  Maximize2,
  Minimize2,
  Moon,
  MoveHorizontal,
  MousePointer,
  PanelLeft,
  PenTool,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ScrollText,
  Shield,
  ShieldCheck,
  Sun,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { UniOfficeTab, UniOfficeTheme, UniOfficeTool } from "./types";
import { isNativeApp } from "../../utils/platform-app";

interface UniOfficeRibbonProps {
  title: string;
  activeTab: UniOfficeTab;
  onSelectTab: (tab: UniOfficeTab) => void;
  // Page Navigation & Modes
  pageNumber: number;
  numPages: number | null;
  onPageChange: (offset: number) => void;
  scrollMode: "continuous" | "single";
  onToggleScrollMode: () => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  // Zoom & Transform
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitScreen: () => void;
  onResetZoom: () => void;
  onRotateClockwise: () => void;
  touchZoomEnabled: boolean;
  onToggleTouchZoom: () => void;
  // Fullscreen
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  // Annotation Tools
  annotationTool: UniOfficeTool;
  onSelectTool: (tool: UniOfficeTool) => void;
  strokeColor: string;
  onSelectColor: (color: string) => void;
  strokeWidth: number;
  onSelectStrokeWidth: (width: number) => void;
  onUndoStroke: () => void;
  onClearPageStrokes: () => void;
  hasStrokesOnPage: boolean;
  // Theme / Eye Comfort
  theme: UniOfficeTheme;
  onSelectTheme: (theme: UniOfficeTheme) => void;
  // Pro / VIP
  isPro: boolean;
  onOpenProModal: () => void;
}

const HIGHLIGHTER_COLORS = [
  { label: "Jaune", hex: "#fde047" },
  { label: "Vert", hex: "#86efac" },
  { label: "Rose", hex: "#f472b6" },
  { label: "Bleu", hex: "#93c5fd" },
];

const PEN_COLORS = [
  { label: "Noir", hex: "#0f172a" },
  { label: "Bleu", hex: "#2563eb" },
  { label: "Rouge", hex: "#dc2626" },
  { label: "Émeraude", hex: "#059669" },
];

export const UniOfficeRibbon: React.FC<UniOfficeRibbonProps> = ({
  title,
  activeTab,
  onSelectTab,
  pageNumber,
  numPages,
  onPageChange,
  scrollMode,
  onToggleScrollMode,
  showSidebar,
  onToggleSidebar,
  scale,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitScreen,
  onResetZoom,
  onRotateClockwise,
  touchZoomEnabled,
  onToggleTouchZoom,
  isFullscreen,
  onToggleFullscreen,
  annotationTool,
  onSelectTool,
  strokeColor,
  onSelectColor,
  strokeWidth,
  onSelectStrokeWidth,
  onUndoStroke,
  onClearPageStrokes,
  hasStrokesOnPage,
  theme,
  onSelectTheme,
  isPro,
  onOpenProModal,
}) => {
  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-[#1f2838] bg-[#090d16] text-slate-200 shadow-[0_12px_32px_rgba(2,6,23,0.35)] select-none">
      {/* 1. Brand Top Bar: UniOfficeSecurPDF */}
      <div className="flex h-11 sm:h-12 items-center justify-between border-b border-[#18202d] bg-[#060910] px-3 sm:px-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              <Shield className="h-4 w-4 fill-slate-950 stroke-[2.2]" />
            </span>
            <div className="flex items-baseline">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white">UniOffice</span>
            </div>
          </div>

          <span className="hidden sm:inline-block text-slate-600">•</span>
          <span className="truncate text-xs font-semibold text-slate-300 max-w-[140px] sm:max-w-xs md:max-w-md">
            {title}
          </span>
        </div>

        {/* Pro Pill, Security Status & Quick Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {isNativeApp() ? (
            /* Application Mobile (Android / iPhone) : Option suppression filigrane avec PayPal */
            <button
              type="button"
              onClick={onOpenProModal}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-bold transition-all ${
                isPro
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-amber-500/15 text-amber-300 border border-amber-400/50 hover:bg-amber-400/25"
              }`}
              title={isPro ? "Licence UniOffice Pro active" : "Passer à UniOffice Pro (Supprimer filigrane)"}
            >
              <Crown className={`h-3 w-3 ${isPro ? "fill-amber-300" : ""}`} />
              <span>{isPro ? "Pro VIP" : "Supprimer filigrane"}</span>
            </button>
          ) : (
            /* Site Web Performance Académique : 100% Inclus et Gratuit pour les étudiants */
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/50 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Inclus avec votre formation</span>
            </div>
          )}

          {/* Certified Security Badge */}
          <div className="hidden md:flex items-center gap-1 rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/30">
            <ShieldCheck className="h-3 w-3" />
            <span>Protégé</span>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 2. Office Tabs Header (Lecture | Annotation | Confort | Sécurité) */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-[#18202d] bg-[#0c121e] px-2 sm:px-4 text-xs font-semibold overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onSelectTab("lecture")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "lecture"
              ? "border-emerald-400 text-emerald-300 font-bold bg-white/[0.02]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Lecture</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("annotation")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap relative ${
            activeTab === "annotation"
              ? "border-emerald-400 text-emerald-300 font-bold bg-white/[0.02]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Highlighter className="h-3.5 w-3.5" />
          <span>Annotation</span>
          {annotationTool !== "select" && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("confort")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "confort"
              ? "border-emerald-400 text-emerald-300 font-bold bg-white/[0.02]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Confort visuel</span>
          {theme !== "normal" && (
            <span className="rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-300 capitalize">
              {theme}
            </span>
          )}
        </button>
      </div>

      {/* 3. Ribbon Controls Content for Active Tab */}
      <div className="flex min-h-[46px] sm:min-h-[50px] items-center justify-between gap-2 px-2 sm:px-4 py-1.5 bg-[#0e1422] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* TAB: LECTURE */}
        {activeTab === "lecture" && (
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap w-full">
            {/* Thumbnails Sidebar Toggle */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] transition-colors ${
                showSidebar ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:text-white"
              }`}
              title="Miniatures des pages (volet latéral)"
            >
              <PanelLeft className="h-4 w-4" />
            </button>

            {/* Continuous vs Single Scroll Toggle */}
            <button
              type="button"
              onClick={onToggleScrollMode}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] transition-colors ${
                scrollMode === "continuous" ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:text-white"
              }`}
              title={scrollMode === "continuous" ? "Mode continu actif" : "Passer en mode continu"}
            >
              <ScrollText className="h-4 w-4" />
            </button>

            {/* Page Navigation */}
            <div className="flex h-8 sm:h-9 items-center rounded-lg border border-[#222c3d] bg-[#121827] px-1 text-xs">
              <button
                type="button"
                onClick={() => onPageChange(-1)}
                disabled={pageNumber <= 1}
                className="p-1 text-slate-400 hover:text-emerald-300 disabled:opacity-30"
                title="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-bold tabular-nums text-slate-200">
                {pageNumber} <span className="text-slate-500 font-normal">/</span> {numPages || "…"}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={!numPages || pageNumber >= numPages}
                className="p-1 text-slate-400 hover:text-emerald-300 disabled:opacity-30"
                title="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onZoomOut}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                title="Zoom arrière"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[2.8rem] text-center text-xs font-bold text-slate-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={onZoomIn}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                title="Zoom avant"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Touch Zoom Toggle */}
            <button
              type="button"
              onClick={onToggleTouchZoom}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] transition-colors ${
                touchZoomEnabled
                  ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Pinch-to-zoom / Pan tactile"
            >
              <Hand className="h-4 w-4" />
            </button>

            {/* Fit Width / Screen / Reset */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={onFitWidth}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                title="Ajuster à la largeur"
              >
                <MoveHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onFitScreen}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                title="Ajuster à l'écran"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onResetZoom}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                title="Réinitialiser zoom à 100%"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onRotateClockwise}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                title="Pivoter de 90°"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB: ANNOTATION */}
        {activeTab === "annotation" && (
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap sm:flex-nowrap w-full">
            {/* Tool: Select (standard navigation) */}
            <button
              type="button"
              onClick={() => onSelectTool("select")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                annotationTool === "select"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
              title="Curseur de sélection & navigation"
            >
              <MousePointer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sélection</span>
            </button>

            {/* Tool: Highlighter */}
            <button
              type="button"
              onClick={() => onSelectTool("highlighter")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                annotationTool === "highlighter"
                  ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
              title="Surligneur fluorescent"
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span>Surligner</span>
            </button>

            {/* Tool: Pen */}
            <button
              type="button"
              onClick={() => onSelectTool("pen")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                annotationTool === "pen"
                  ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
              title="Stylet / Dessin manuscrit"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Stylet</span>
            </button>

            {/* Tool: Eraser */}
            <button
              type="button"
              onClick={() => onSelectTool("eraser")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                annotationTool === "eraser"
                  ? "border-rose-500 bg-rose-500/20 text-rose-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
              title="Gomme de précision"
            >
              <Eraser className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gomme</span>
            </button>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* Color Palette (Dynamic based on Highlighter or Pen) */}
            {annotationTool === "highlighter" && (
              <div className="flex items-center gap-1 bg-[#121827] p-1 rounded-lg border border-[#222c3d]">
                {HIGHLIGHTER_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => onSelectColor(col.hex)}
                    style={{ backgroundColor: col.hex }}
                    className={`h-5 w-5 rounded-full border transition-all ${
                      strokeColor === col.hex
                        ? "border-white ring-2 ring-emerald-400 scale-110"
                        : "border-black/30 hover:scale-105"
                    }`}
                    title={`Surligneur ${col.label}`}
                  />
                ))}
              </div>
            )}

            {annotationTool === "pen" && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-[#121827] p-1 rounded-lg border border-[#222c3d]">
                  {PEN_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => onSelectColor(col.hex)}
                      style={{ backgroundColor: col.hex }}
                      className={`h-5 w-5 rounded-full border transition-all ${
                        strokeColor === col.hex
                          ? "border-white ring-2 ring-emerald-400 scale-110"
                          : "border-black/40 hover:scale-105"
                      }`}
                      title={`Stylet ${col.label}`}
                    />
                  ))}
                </div>

                {/* Pen Width Selection */}
                <div className="flex items-center gap-1 bg-[#121827] px-1.5 py-1 rounded-lg border border-[#222c3d] text-[11px]">
                  <button
                    type="button"
                    onClick={() => onSelectStrokeWidth(2)}
                    className={`px-1.5 py-0.5 rounded font-bold ${strokeWidth === 2 ? "bg-cyan-500/30 text-cyan-300" : "text-slate-400"}`}
                  >
                    Fin
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectStrokeWidth(4)}
                    className={`px-1.5 py-0.5 rounded font-bold ${strokeWidth === 4 ? "bg-cyan-500/30 text-cyan-300" : "text-slate-400"}`}
                  >
                    Moyen
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectStrokeWidth(8)}
                    className={`px-1.5 py-0.5 rounded font-bold ${strokeWidth === 8 ? "bg-cyan-500/30 text-cyan-300" : "text-slate-400"}`}
                  >
                    Épais
                  </button>
                </div>
              </div>
            )}

            {/* Actions: Undo & Clear Page */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={onUndoStroke}
                disabled={!hasStrokesOnPage}
                className="flex h-8 items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2 text-xs text-slate-300 hover:text-white disabled:opacity-30"
                title="Annuler le dernier trait sur cette page"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Annuler</span>
              </button>

              <button
                type="button"
                onClick={onClearPageStrokes}
                disabled={!hasStrokesOnPage}
                className="flex h-8 items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2 text-xs text-rose-400 hover:bg-rose-500/20 disabled:opacity-30"
                title="Effacer toutes les notes de la page courante"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nettoyer page</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: CONFORT VISUEL */}
        {activeTab === "confort" && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Mode de confort :
            </span>

            {/* Normal Light */}
            <button
              type="button"
              onClick={() => onSelectTheme("normal")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                theme === "normal"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>Standard (Clair)</span>
            </button>

            {/* Dark Inversion */}
            <button
              type="button"
              onClick={() => onSelectTheme("dark")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                theme === "dark"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
            >
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              <span>Nuit Sombre</span>
            </button>

            {/* Sepia Mode */}
            <button
              type="button"
              onClick={() => onSelectTheme("sepia")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                theme === "sepia"
                  ? "border-amber-500 bg-amber-500/20 text-amber-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>Sépia Reposant</span>
            </button>

            {/* Emerald Tint */}
            <button
              type="button"
              onClick={() => onSelectTheme("emerald")}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                theme === "emerald"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Émeraude Académique</span>
            </button>

            <span className="text-[11px] text-slate-400 ml-auto hidden md:inline">
              Protection anti-fatigue oculaire intégrée
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default UniOfficeRibbon;
