import { useEffect } from "react";
import {
  Layers,
  Video,
  Plus,
  FileText,
  Download,
  Loader2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import { RASTER_IMAGE_ACCEPT } from "../../../avatar-security";
import PremiumVideoPlayer from "../../../components/PremiumVideoPlayer";
import { formatLessonContentTypeLabel } from "../../../utils/user-facing-labels";
import { api } from "../../../api";

import { curriculumUi, getStepTheme, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumChaptersStep(props: TeacherCurriculumViewProps) {
  const {
    managedCourse,
    chapterSections,
    selectedManagedContents,
    managedLiveReplays,
    newSectionTitle,
    setNewSectionTitle,
    newSectionPublished,
    setNewSectionPublished,
    uploadSectionId,
    uploadTitle,
    setUploadTitle,
    uploadType,
    setUploadType,
    uploadFile,
    setUploadFile,
    uploadPublished,
    setUploadPublished,
    uploadStatusMsg,
    uploadStatusKind,
    isUploadingLessonAsset,
    handleSetUploadSectionId,
    showCurriculumSuccess,
    showCurriculumError,
    handleCreateChapter,
    handleUploadLessonAsset,
    handleSelectManagedCourse,
    handleUpdateSectionTitle,
    handleToggleSectionPublished,
    handleDeleteSection,
    handleToggleContentPublished,
    handleDeleteLessonContent,
  } = props;

  const stepTheme = getStepTheme(2);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;

  // Auto-select first chapter if none is selected
  useEffect(() => {
    if (chapterSections.length > 0 && (!uploadSectionId || !chapterSections.some((s) => s.id === uploadSectionId))) {
      handleSetUploadSectionId(chapterSections[0].id);
    }
  }, [chapterSections, uploadSectionId, handleSetUploadSectionId]);

  const activeChapter = chapterSections.find((s) => s.id === uploadSectionId) || chapterSections[0] || null;

  // Video processing status polling
  const processingVideos = selectedManagedContents.filter((c) => c.type === "VIDEO" && c.status === "PROCESSING");

  useEffect(() => {
    if (processingVideos.length === 0 || !managedCourse) return;

    const interval = setInterval(async () => {
      let shouldRefresh = false;
      for (const video of processingVideos) {
        if (video.jobId) {
          try {
            const job = await api.getVideoJobStatus(video.jobId);
            if (job.status === "READY" || job.status === "FAILED" || job.status === "CANCELLED") {
              shouldRefresh = true;
            }
          } catch (e) {
            console.error("Error polling job status:", e);
          }
        } else {
          shouldRefresh = true;
        }
      }

      if (shouldRefresh) {
        handleSelectManagedCourse(managedCourse.id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [processingVideos, managedCourse, handleSelectManagedCourse]);

  const handleRetryVideoJob = async (jobId: string) => {
    try {
      await api.retryVideoJob(jobId);
      if (managedCourse) {
        handleSelectManagedCourse(managedCourse.id);
      }
      showCurriculumSuccess("Le traitement vidéo a été relancé.");
    } catch (err: any) {
      showCurriculumError(err.message || "Impossible de relancer le traitement.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chapters Management */}
        <div className="lg:col-span-5 space-y-5 self-start">
          {/* Add Chapter Panel */}
          <div className={`${curriculumUi.panel} ${stepTheme.panel} space-y-4`}>
            <div>
              <h3 className={curriculumUi.panelTitle}>
                <Plus className="h-5 w-5 text-teal-400" />
                Ajouter un chapitre
              </h3>
              <p className={curriculumUi.panelSubtitle}>Créez les chapitres pour structurer ce module.</p>
            </div>

            <form onSubmit={handleCreateChapter} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Titre du chapitre
                </span>
                <input
                  type="text"
                  required
                  placeholder="ex: Chapitre 1 : Introduction générale"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className={inputFocus}
                />
              </label>

              <label className={curriculumUi.checkbox}>
                <input
                  type="checkbox"
                  checked={newSectionPublished}
                  onChange={(e) => setNewSectionPublished(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-emerald-600"
                />
                Publier immédiatement le chapitre
              </label>

              <button
                type="submit"
                className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${stepTheme.button}`}
              >
                Créer le chapitre
              </button>
            </form>
          </div>

          {/* Chapters List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={curriculumUi.sectionTitle}>
                <Layers className="h-4 w-4 text-teal-400" />
                Chapitres ({chapterSections.length})
              </h3>
              <span className={curriculumUi.countBadge}>
                {chapterSections.length} chapitre{chapterSections.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {chapterSections.length === 0 ? (
                <div className={curriculumUi.empty}>
                  <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">
                    Aucun chapitre créé. Utilisez le formulaire ci-dessus pour commencer.
                  </p>
                </div>
              ) : (
                chapterSections.map((section) => {
                  const isSelected = activeChapter?.id === section.id;
                  const mediaCount = (section.contents ?? []).length;
                  return (
                    <div
                      key={section.id}
                      onClick={() => handleSetUploadSectionId(section.id)}
                      className={`cursor-pointer transition-all duration-200 ${curriculumUi.card} ${
                        isSelected
                          ? "border-teal-400/80 bg-teal-950/40 shadow-lg shadow-teal-500/20 ring-1 ring-teal-500/40"
                          : curriculumUi.cardHover
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              Chapitre
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-teal-400 bg-teal-950 px-2 py-0.5 rounded-full border border-teal-500/40">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Actif
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-white truncate">{section.title}</h4>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {mediaCount} média{mediaCount !== 1 ? "s" : ""} associé{mediaCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className={publishedBadge(section.published)}>
                          {publishedLabel(section.published ?? false)}
                        </span>
                      </div>

                      <div
                        className={`flex flex-wrap items-center justify-between gap-2 pt-3 ${curriculumUi.divider} mt-3`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionTitle(section)}
                            className={curriculumUi.ghostBtn}
                          >
                            Renommer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSectionPublished(section)}
                            className={
                              section.published
                                ? curriculumUi.unpublishBtn
                                : `${curriculumUi.ghostBtn} border-teal-500/30 text-teal-300`
                            }
                          >
                            {section.published ? "Dépublier" : "Publier"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(section)}
                            className={curriculumUi.dangerBtn}
                          >
                            Supprimer
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetUploadSectionId(section.id)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition-colors ${
                            isSelected ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          <Video className="w-3 h-3" />
                          Médias
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Media Management for Selected Chapter */}
        <div className="lg:col-span-7 space-y-5">
          {activeChapter ? (
            <>
              {/* Media Upload Panel */}
              <div className={`${curriculumUi.panel} ${stepTheme.panel} space-y-4`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={curriculumUi.panelTitle}>
                      <Video className="h-5 w-5 text-teal-400" />
                      Ajouter un média
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-500/30">
                      Chapitre : {activeChapter.title}
                    </span>
                  </div>
                  <p className={curriculumUi.panelSubtitle}>
                    Uploadez vos vidéos, documents PDF ou images dans ce chapitre.
                  </p>
                </div>

                <form onSubmit={handleUploadLessonAsset} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
                  <fieldset disabled={isUploadingLessonAsset} className="space-y-4 disabled:opacity-70">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Type de média
                        </span>
                        <select
                          value={uploadType}
                          onChange={(e) => setUploadType(e.target.value as any)}
                          className={`w-full rounded-xl border border-slate-700 bg-[#031512] px-3 py-3 text-xs font-semibold text-slate-100 focus:bg-slate-950 focus:outline-none focus:ring-4 ${stepTheme.focus}`}
                        >
                          <option value="VIDEO">Vidéo (.mp4, WebM)</option>
                          <option value="PDF">Document PDF</option>
                          <option value="IMAGE">Image (PNG, JPG, WebP)</option>
                        </select>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Titre visible
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="ex: Leçon 1 : Introduction"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className={inputFocus}
                        />
                      </label>
                    </div>

                    <label className="block space-y-1 cursor-pointer">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Fichier média
                      </span>
                      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-500/30 bg-teal-950/20 p-4 text-center transition-colors hover:bg-teal-950/30 group">
                        <Download className="h-7 w-7 text-teal-400 transition-colors group-hover:text-teal-300" />
                        <div className="text-xs text-slate-400">
                          {uploadFile ? (
                            <span className="font-bold text-white">{uploadFile.name}</span>
                          ) : (
                            <span>Cliquez ou glissez un fichier ici</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {uploadType === "VIDEO" && "MP4, WebM (max 500 Mo)"}
                          {uploadType === "PDF" && "PDF (max 50 Mo)"}
                          {uploadType === "IMAGE" && "PNG, JPG, WebP (max 10 Mo)"}
                        </p>
                        <input
                          type="file"
                          required
                          accept={
                            uploadType === "VIDEO"
                              ? "video/mp4,video/webm"
                              : uploadType === "PDF"
                                ? "application/pdf"
                                : RASTER_IMAGE_ACCEPT
                          }
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </div>
                    </label>

                    <label className={curriculumUi.checkbox}>
                      <input
                        type="checkbox"
                        checked={uploadPublished}
                        onChange={(e) => setUploadPublished(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-emerald-600"
                      />
                      Publier immédiatement le média
                    </label>

                    {uploadStatusMsg && (
                      <div
                        className={`text-xs p-3 rounded-xl ${
                          uploadStatusKind === "error"
                            ? curriculumUi.alertError
                            : uploadStatusKind === "success"
                              ? curriculumUi.alertSuccess
                              : "bg-teal-950/60 border border-teal-500/30 text-teal-200"
                        }`}
                      >
                        {isUploadingLessonAsset && <Loader2 className="inline h-4 w-4 animate-spin mr-2" />}
                        {uploadStatusMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploadingLessonAsset || !uploadFile}
                      className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${stepTheme.button}`}
                    >
                      {isUploadingLessonAsset ? "Téléversement en cours..." : "Téléverser le média"}
                    </button>
                  </fieldset>
                </form>
              </div>

              {/* Live Replays if any */}
              {managedLiveReplays.length > 0 && (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wide text-emerald-200">
                    Rediffusions live en attente
                  </h3>
                  <div className="space-y-3">
                    {managedLiveReplays.map((content) => {
                      const attachment = content.attachments?.[0];
                      return (
                        <div key={content.id} className={`${curriculumUi.card} space-y-3`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span
                                className={`rounded px-2 py-0.5 text-[8px] font-black uppercase ${curriculumUi.mediaVideo}`}
                              >
                                Rediffusion live
                              </span>
                              <h4 className="text-sm font-black text-white">{content.title}</h4>
                            </div>
                            <span className={publishedBadge(false)}>{publishedLabel(false)}</span>
                          </div>
                          {attachment?.url && content.type === "VIDEO" && (
                            <PremiumVideoPlayer
                              src={attachment.url}
                              title={content.title}
                              instructor={managedCourse?.instructor ?? "Professeur"}
                              activeSector="teacher"
                            />
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleContentPublished(content)}
                              className={`${curriculumUi.ghostBtn} border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/60`}
                            >
                              Publier la rediffusion
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLessonContent(content)}
                              className={curriculumUi.dangerBtn}
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Media Contents List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={curriculumUi.sectionTitle}>Médias du chapitre ({selectedManagedContents.length})</h3>
                  <span className={curriculumUi.countBadge}>
                    {selectedManagedContents.length} ressource{selectedManagedContents.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {selectedManagedContents.length === 0 ? (
                    <div className={curriculumUi.empty}>
                      <Video className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-semibold">
                        Aucun média dans ce chapitre. Utilisez le formulaire ci-dessus pour téléverser une vidéo, un PDF
                        ou une image.
                      </p>
                    </div>
                  ) : (
                    selectedManagedContents.map((content) => {
                      const attachment = content.attachments?.[0];
                      const isVideo = content.type === "VIDEO";
                      const isProcessing = isVideo && content.status === "PROCESSING";
                      const isFailed = isVideo && content.status === "FAILED";

                      return (
                        <div key={content.id} className={`${curriculumUi.card} space-y-3`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded px-2 py-0.5 text-[8px] font-black uppercase ${
                                    content.type === "VIDEO"
                                      ? curriculumUi.mediaVideo
                                      : content.type === "PDF"
                                        ? curriculumUi.mediaPdf
                                        : curriculumUi.mediaImage
                                  }`}
                                >
                                  {formatLessonContentTypeLabel(content.type)}
                                </span>
                                {isProcessing && (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-600/30">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Traitement en cours...
                                  </span>
                                )}
                                {isFailed && (
                                  <span className="inline-flex items-center gap-1 rounded bg-red-950/80 px-2 py-0.5 text-[9px] font-bold text-red-300 border border-red-600/30">
                                    <AlertTriangle className="h-3 w-3" /> Échec du traitement
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-black text-white truncate">{content.title}</h4>
                            </div>
                            <span className={publishedBadge(content.published)}>
                              {publishedLabel(content.published ?? false)}
                            </span>
                          </div>

                          {/* Preview Player / Link */}
                          {attachment?.url && (
                            <div className="pt-2">
                              {isVideo && content.status === "READY" ? (
                                <PremiumVideoPlayer
                                  src={attachment.url}
                                  title={content.title}
                                  instructor={managedCourse?.instructor ?? "Professeur"}
                                  activeSector="teacher"
                                />
                              ) : content.type === "PDF" || content.type === "IMAGE" ? (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
                                >
                                  <FileText className="h-4 w-4" />
                                  Ouvrir / Télécharger le fichier ({attachment.fileName || "Média"})
                                </a>
                              ) : null}
                            </div>
                          )}

                          {/* Retry button for failed video */}
                          {isFailed && content.jobId && (
                            <button
                              type="button"
                              onClick={() => handleRetryVideoJob(content.jobId!)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-950/50 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/60 transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Relancer le traitement
                            </button>
                          )}

                          {/* Actions */}
                          <div
                            className={`flex flex-wrap items-center justify-between gap-2 pt-3 ${curriculumUi.divider}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleContentPublished(content)}
                              className={
                                content.published
                                  ? curriculumUi.unpublishBtn
                                  : `${curriculumUi.ghostBtn} border-teal-500/30 text-teal-300`
                              }
                            >
                              {content.published ? "Dépublier" : "Publier"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLessonContent(content)}
                              className={curriculumUi.dangerBtn}
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className={curriculumUi.empty}>
              <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-black text-white mb-1">Créez d&apos;abord un chapitre</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Utilisez le panneau à gauche pour ajouter un chapitre. Vous pourrez ensuite y verser des vidéos, des
                documents PDF ou des images.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
