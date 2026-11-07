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
      {/* Office Tabs Header (Lecture | Annotation | Confort) */}
      <div className="flex items-center justify-between border-b border-[#18202d] bg-[#0c121e] px-2 sm:px-4 text-xs font-semibold">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        {isNativeApp() && (
          <button
            type="button"
            onClick={onOpenProModal}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-bold transition-all shrink-0 ml-2 ${
              isPro
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "bg-amber-500/15 text-amber-300 border border-amber-400/50 hover:bg-amber-400/25"
            }`}
            title={isPro ? "Licence UniOffice Pro active" : "Passer à UniOffice Pro (Supprimer filigrane)"}
          >
            <Crown className={`h-3 w-3 ${isPro ? "fill-amber-300" : ""}`} />
            <span>{isPro ? "Pro VIP" : "Supprimer filigrane"}</span>
          </button>
        )}
      </div>

      {/* 3. Ribbon Controls Content for Active Tab */}
      <div className="flex min-h-[46px] sm:min-h-[50px] items-center justify-between gap-2 px-2 sm:px-4 py-1.5 bg-[#0e1422] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* TAB: LECTURE */}
        {activeTab === "lecture" && (
          <>
            {/* DESKTOP / TABLET LAYOUT (>= 640px): Single clean row */}
            <div className="ribbon-lecture-desktop items-center gap-1 sm:gap-2 flex-nowrap w-full">
              {/* Thumbnails Sidebar Toggle */}
              <button
                type="button"
                onClick={onToggleSidebar}
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] transition-colors shrink-0 ${
                  showSidebar ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:text-white"
                }`}
                title="Miniatures des pages (volet latéral)"
                aria-label="Miniatures des pages"
              >
                <PanelLeft className="h-4 w-4" />
              </button>

              {/* Page Navigation (Fixed nowrap for 1 / 2) */}
              <div className="flex h-8 sm:h-9 shrink-0 items-center rounded-lg border border-[#222c3d] bg-[#121827] px-1.5 text-xs whitespace-nowrap select-none">
                <button
                  type="button"
                  onClick={() => onPageChange(-1)}
                  disabled={pageNumber <= 1}
                  className="p-1 text-slate-400 hover:text-emerald-300 disabled:opacity-30 transition-colors"
                  title="Page précédente"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-bold tabular-nums text-slate-200 whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                  <span>{pageNumber}</span> <span className="text-slate-500 font-normal">/</span> <span>{numPages || "…"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(1)}
                  disabled={!numPages || pageNumber >= numPages}
                  className="p-1 text-slate-400 hover:text-emerald-300 disabled:opacity-30 transition-colors"
                  title="Page suivante"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Mode d'affichage Défilement continu vs Page par page */}
              <button
                type="button"
                onClick={onToggleScrollMode}
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] transition-colors shrink-0 ${
                  scrollMode === "continuous"
                    ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300"
                    : "text-slate-300 hover:text-white"
                }`}
                title={scrollMode === "continuous" ? "Mode actuel : Défilement continu (cliquer pour Page par page)" : "Mode actuel : Page par page (cliquer pour Défilement continu)"}
                aria-label="Mode d'affichage des pages"
              >
                {scrollMode === "continuous" ? <ScrollText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </button>

              <div className="h-5 w-px bg-slate-800 mx-1 shrink-0" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onZoomOut}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors"
                  title="Zoom arrière"
                  aria-label="Zoom arrière"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-[2.8rem] text-center text-xs font-bold text-slate-300 tabular-nums select-none">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={onZoomIn}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors"
                  title="Zoom avant"
                  aria-label="Zoom avant"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              {/* Actions Right Cluster */}
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                  title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                  aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={onFitWidth}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors"
                  title="Ajuster à la largeur"
                  aria-label="Ajuster à la largeur"
                >
                  <MoveHorizontal className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onResetZoom}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors"
                  title="Réinitialiser zoom à 100%"
                  aria-label="Réinitialiser zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onRotateClockwise}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors"
                  title="Pivoter de 90°"
                  aria-label="Pivoter de 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* MOBILE / INTERMEDIATE SCREEN LAYOUT (< 640px): 3 clean balanced rows */}
            <div className="ribbon-lecture-mobile gap-2 w-full py-1">
              {/* Ligne 1 : 3 éléments (Miniatures, Pagination < 1 / 2 >, Plein écran) */}
              <div className="flex items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] transition-colors shrink-0 ${
                    showSidebar ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:text-white"
                  }`}
                  title="Miniatures des pages (volet latéral)"
                  aria-label="Miniatures des pages"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>

                {/* Page Navigation */}
                <div className="flex h-8 items-center rounded-lg border border-[#222c3d] bg-[#121827] px-1 text-xs shrink-0 whitespace-nowrap select-none">
                  <button
                    type="button"
                    onClick={() => onPageChange(-1)}
                    disabled={pageNumber <= 1}
                    className="p-1 text-slate-400 hover:text-emerald-300 disabled:opacity-30 transition-colors"
                    title="Page précédente"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-1.5 font-bold tabular-nums text-slate-200 whitespace-nowrap shrink-0 inline-flex items-center gap-1 text-[11px]">
                    <span>{pageNumber}</span> <span className="text-slate-500 font-normal">/</span> <span>{numPages || "…"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={!numPages || pageNumber >= numPages}
                    className="p-1 text-slate-400 hover:text-emerald-300 disabled:opacity-30 transition-colors"
                    title="Page suivante"
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onToggleScrollMode}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] transition-colors shrink-0 ${
                    scrollMode === "continuous"
                      ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300"
                      : "text-slate-300 hover:text-white"
                  }`}
                  title={scrollMode === "continuous" ? "Mode Défilement continu" : "Mode Page par page"}
                  aria-label="Mode d'affichage des pages"
                >
                  {scrollMode === "continuous" ? <ScrollText className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors shrink-0"
                  title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                  aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
                </button>
              </div>

              {/* Ligne 2 : 3 boutons (Ajuster largeur, Réinitialiser zoom, Pivoter de 90°) */}
              <div className="flex items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  onClick={onFitWidth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors shrink-0"
                  title="Ajuster à la largeur"
                  aria-label="Ajuster à la largeur"
                >
                  <MoveHorizontal className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onResetZoom}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors shrink-0"
                  title="Réinitialiser zoom à 100%"
                  aria-label="Réinitialiser zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onRotateClockwise}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors shrink-0"
                  title="Pivoter de 90°"
                  aria-label="Pivoter de 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>

              {/* Ligne 3 : Zoom "- 100% +" */}
              <div className="flex items-center justify-center gap-2 w-full">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onZoomOut}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors shrink-0"
                    title="Zoom arrière"
                    aria-label="Zoom arrière"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="min-w-[3rem] text-center text-xs font-bold text-slate-200 tabular-nums select-none">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={onZoomIn}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white transition-colors shrink-0"
                    title="Zoom avant"
                    aria-label="Zoom avant"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB: ANNOTATION */}
        {activeTab === "annotation" && (
          <>
            {/* DESKTOP / TABLET (>= 480px): Horizontal single line (Fullscreen REMOVED) */}
            <div className="ribbon-desktop items-center gap-1.5 sm:gap-2.5 flex-nowrap w-full">
              {/* Tool: Select (standard navigation) */}
              <button
                type="button"
                onClick={() => onSelectTool("select")}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors shrink-0 ${
                  annotationTool === "select"
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                }`}
                title="Curseur de sélection & navigation"
              >
                <MousePointer className="h-3.5 w-3.5" />
                <span>Sélection</span>
              </button>

              {/* Tool: Highlighter */}
              <button
                type="button"
                onClick={() => onSelectTool("highlighter")}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors shrink-0 ${
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
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors shrink-0 ${
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
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors shrink-0 ${
                  annotationTool === "eraser"
                    ? "border-rose-500 bg-rose-500/20 text-rose-300"
                    : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                }`}
                title="Gomme de précision"
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>Gomme</span>
              </button>

              <div className="h-5 w-px bg-slate-800 mx-1 shrink-0" />

              {/* Color Palette (Dynamic based on Highlighter or Pen) */}
              {annotationTool === "highlighter" && (
                <div className="flex items-center gap-1 bg-[#121827] p-1 rounded-lg border border-[#222c3d] shrink-0">
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
                <div className="flex items-center gap-1.5 shrink-0">
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

              {/* Actions: Undo & Clear Page (Fullscreen REMOVED) */}
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={onUndoStroke}
                  disabled={!hasStrokesOnPage}
                  className="flex h-8 items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2 text-xs text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                  title="Annuler le dernier trait sur cette page"
                  aria-label="Annuler"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>Annuler</span>
                </button>

                <button
                  type="button"
                  onClick={onClearPageStrokes}
                  disabled={!hasStrokesOnPage}
                  className="flex h-8 items-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-2 text-xs text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 transition-colors"
                  title="Effacer toutes les notes de la page courante"
                  aria-label="Nettoyer page"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Nettoyer page</span>
                </button>
              </div>
            </div>

            {/* MOBILE (< 480px): 3 boutons par ligne (3 + 3 = 6 boutons sur 2 lignes) */}
            <div className="ribbon-mobile gap-2 w-full py-1">
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {/* Ligne 1 : 3 boutons (Sélection, Surligner, Stylet) */}
                <button
                  type="button"
                  onClick={() => onSelectTool("select")}
                  className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors w-full ${
                    annotationTool === "select"
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                  }`}
                  title="Curseur de sélection & navigation"
                  aria-label="Sélection"
                >
                  <MousePointer className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Sélection</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTool("highlighter")}
                  className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors w-full ${
                    annotationTool === "highlighter"
                      ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                      : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                  }`}
                  title="Surligneur fluorescent"
                  aria-label="Surligner"
                >
                  <Highlighter className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Surligner</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTool("pen")}
                  className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors w-full ${
                    annotationTool === "pen"
                      ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                      : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                  }`}
                  title="Stylet / Dessin manuscrit"
                  aria-label="Stylet"
                >
                  <PenTool className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Stylet</span>
                </button>

                {/* Ligne 2 : 3 boutons (Gomme, Annuler, Nettoyer page) */}
                <button
                  type="button"
                  onClick={() => onSelectTool("eraser")}
                  className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition-colors w-full ${
                    annotationTool === "eraser"
                      ? "border-rose-500 bg-rose-500/20 text-rose-300"
                      : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                  }`}
                  title="Gomme de précision"
                  aria-label="Gomme"
                >
                  <Eraser className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Gomme</span>
                </button>

                <button
                  type="button"
                  onClick={onUndoStroke}
                  disabled={!hasStrokesOnPage}
                  className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-30 transition-colors w-full"
                  title="Annuler le dernier trait sur cette page"
                  aria-label="Annuler"
                >
                  <Undo2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Annuler</span>
                </button>

                <button
                  type="button"
                  onClick={onClearPageStrokes}
                  disabled={!hasStrokesOnPage}
                  className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#222c3d] bg-[#121827] px-1.5 text-xs text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 transition-colors w-full"
                  title="Effacer toutes les notes de la page courante"
                  aria-label="Nettoyer page"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Nettoyer</span>
                </button>
              </div>

              {/* Options de palette / trait sur mobile quand surligneur ou stylet est actif */}
              {annotationTool === "highlighter" && (
                <div className="flex items-center justify-center gap-1.5 bg-[#121827] p-1.5 rounded-lg border border-[#222c3d] w-full">
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
                <div className="flex items-center justify-between gap-2 bg-[#121827] p-1.5 rounded-lg border border-[#222c3d] w-full overflow-x-auto">
                  <div className="flex items-center gap-1 shrink-0">
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

                  <div className="flex items-center gap-1 text-[11px] shrink-0">
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
            </div>
          </>
        )}

        {/* TAB: CONFORT VISUEL */}
        {activeTab === "confort" && (
          <>
            {/* DESKTOP / TABLET (>= 480px): Horizontal single line */}
            <div className="ribbon-desktop items-center gap-2 flex-nowrap w-full">
              <span className="text-xs text-slate-400 font-medium shrink-0">
                Mode de confort :
              </span>

              {/* Normal Light */}
              <button
                type="button"
                onClick={() => onSelectTheme("normal")}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors shrink-0 ${
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
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors shrink-0 ${
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
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors shrink-0 ${
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
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors shrink-0 ${
                  theme === "emerald"
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Émeraude Académique</span>
              </button>
            </div>

            {/* MOBILE (< 480px): 2 boutons sur 2 boutons (2x2 grid) */}
            <div className="ribbon-mobile-grid grid-cols-2 gap-2 w-full py-1">
              {/* Normal Light */}
              <button
                type="button"
                onClick={() => onSelectTheme("normal")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors w-full ${
                  theme === "normal"
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                }`}
              >
                <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Standard (Clair)</span>
              </button>

              {/* Dark Inversion */}
              <button
                type="button"
                onClick={() => onSelectTheme("dark")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors w-full ${
                  theme === "dark"
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                }`}
              >
                <Moon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Nuit Sombre</span>
              </button>

              {/* Sepia Mode */}
              <button
                type="button"
                onClick={() => onSelectTheme("sepia")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors w-full ${
                  theme === "sepia"
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Sépia Reposant</span>
              </button>

              {/* Emerald Tint */}
              <button
                type="button"
                onClick={() => onSelectTheme("emerald")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors w-full ${
                  theme === "emerald"
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : "border-[#222c3d] bg-[#121827] text-slate-300 hover:text-white"
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Émeraude Académique</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default UniOfficeRibbon;
