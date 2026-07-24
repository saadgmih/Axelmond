import { useEffect } from "react";
import { FileText, Download, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { RASTER_IMAGE_ACCEPT } from "../../../avatar-security";
import PremiumVideoPlayer from "../../../components/PremiumVideoPlayer";
import { formatLessonContentTypeLabel } from "../../../utils/user-facing-labels";
import { api } from "../../../api";

import { curriculumUi, getStepTheme, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumMediaStep(props: TeacherCurriculumViewProps) {
  const {
    domains: _domains,
    activeCurriculumStep: _activeCurriculumStep,
    setActiveCurriculumStep: _setActiveCurriculumStep,
    quizChapterId: _quizChapterId,
    setQuizChapterId: _setQuizChapterId,
    curriculumSuccessMsg: _curriculumSuccessMsg,
    curriculumErrorMsg: _curriculumErrorMsg,
    newCourseTitle: _newCourseTitle,
    setNewCourseTitle: _setNewCourseTitle,
    newCourseDescription: _newCourseDescription,
    setNewCourseDescription: _setNewCourseDescription,
    newCourseDisciplineId: _newCourseDisciplineId,
    setNewCourseDisciplineId: _setNewCourseDisciplineId,
    newCourseCredits: _newCourseCredits,
    setNewCourseCredits: _setNewCourseCredits,
    newCourseDuration: _newCourseDuration,
    setNewCourseDuration: _setNewCourseDuration,
    newCoursePrice: _newCoursePrice,
    setNewCoursePrice: _setNewCoursePrice,
    newCoursePublished: _newCoursePublished,
    setNewCoursePublished: _setNewCoursePublished,
    newSectionCourseId: _newSectionCourseId,
    newSectionTitle: _newSectionTitle,
    setNewSectionTitle: _setNewSectionTitle,
    newSectionPublished: _newSectionPublished,
    setNewSectionPublished: _setNewSectionPublished,
    uploadSectionId,
    setUploadSectionId: _setUploadSectionId,
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
    editingCourse: _editingCourse,
    setEditingCourse: _setEditingCourse,
    editCourseForm: _editCourseForm,
    setEditCourseForm: _setEditCourseForm,
    teacherQuizzes: _teacherQuizzes,
    quizCourseId: _quizCourseId,
    newQuizTitle: _newQuizTitle,
    setNewQuizTitle: _setNewQuizTitle,
    selectedQuizId: _selectedQuizId,
    setSelectedQuizId: _setSelectedQuizId,
    newQuestionText: _newQuestionText,
    setNewQuestionText: _setNewQuestionText,
    newQuestionOptions: _newQuestionOptions,
    setNewQuestionOptions: _setNewQuestionOptions,
    newQuestionAnswer: _newQuestionAnswer,
    setNewQuestionAnswer: _setNewQuestionAnswer,
    newQuestionExplanation: _newQuestionExplanation,
    setNewQuestionExplanation: _setNewQuestionExplanation,
    quizManagerMsg: _quizManagerMsg,
    quizManagerError: _quizManagerError,
    allDisciplines: _allDisciplines,
    managedCourses: _managedCourses,
    managedCourse,
    managedSections: _managedSections,
    chapterSections,
    selectedManagedContents,
    managedLiveReplays,
    handleSetUploadSectionId,
    showCurriculumSuccess,
    showCurriculumError,
    handleCreateCourse: _handleCreateCourse,
    handleCreateChapter: _handleCreateChapter,
    handleUploadLessonAsset,
    handleSelectManagedCourse,
    loadTeacherQuizzes: _loadTeacherQuizzes,
    handleCreateQuiz: _handleCreateQuiz,
    handleAddQuestion: _handleAddQuestion,
    handleDeleteQuestion: _handleDeleteQuestion,
    handleUpdateCourseDetails: _handleUpdateCourseDetails,
    handleSaveEditCourse: _handleSaveEditCourse,
    handleToggleCoursePublished: _handleToggleCoursePublished,
    handleDeleteCourse: _handleDeleteCourse,
    handleUpdateSectionTitle: _handleUpdateSectionTitle,
    handleToggleSectionPublished: _handleToggleSectionPublished,
    handleDeleteSection: _handleDeleteSection,
    handleToggleContentPublished,
    handleDeleteLessonContent,
  } = props;

  const stepTheme = getStepTheme(3);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;
  const destinationLabel = uploadSectionId
    ? chapterSections.find((chapter) => chapter.id === uploadSectionId)?.title || "Chapitre sélectionné"
    : "Racine du module";

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
      {managedLiveReplays.length > 0 && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-5 md:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-wide text-emerald-200">
              Rediffusions live en attente
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Comme sur TikTok, la rediffusion est créée automatiquement à la fin du live. Publiez-la ici pour la rendre
              visible aux étudiants.
            </p>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-5 ${curriculumUi.panel} ${getStepTheme(3).panel} space-y-5 self-start`}>
          <div>
            <h3 className={curriculumUi.panelTitle}>
              <FileText className="h-5 w-5 text-lime-400" />
              Ajouter des médias
            </h3>
            <p className={curriculumUi.panelSubtitle}>Uploadez vidéos, PDF ou images dans le chapitre choisi.</p>
          </div>

          <form onSubmit={handleUploadLessonAsset} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
            <fieldset disabled={isUploadingLessonAsset} className="space-y-4 disabled:opacity-70">
              {/* Destination chapter selector */}
              <div className="space-y-1">
                <span className={curriculumUi.label}>Chapitre cible</span>
                <select
                  value={uploadSectionId}
                  onChange={(e) => handleSetUploadSectionId(e.target.value)}
                  className={`${inputFocus} text-slate-100`}
                >
                  <option value="">-- Directement dans le module (racine) --</option>
                  {chapterSections.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-semibold text-lime-300/80">Destination actuelle : {destinationLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Type de média</span>
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Titre visible</span>
                  <input
                    type="text"
                    required
                    placeholder="ex: Tutoriel de programmation"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className={inputFocus}
                  />
                </label>
              </div>

              {/* Styled File Input Container */}
              <label className="block space-y-1 cursor-pointer">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fichier média</span>
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lime-500/30 bg-lime-950/20 p-4 text-center transition-colors hover:bg-lime-950/30 group">
                  <Download className="h-8 w-8 text-lime-400 transition-colors group-hover:text-lime-300" />
                  <div className="text-xs text-slate-400">
                    {uploadFile ? (
                      <p className="max-w-[280px] truncate font-mono text-[11px] font-bold text-lime-300">
                        {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} Mo)
                      </p>
                    ) : (
                      <>
                        <p className="font-bold text-slate-300">Sélectionnez ou glissez un fichier</p>
                        <p className="text-[10px] text-slate-500 mt-1">PDF, MP4 ou images uniquement</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    required
                    accept={
                      uploadType === "VIDEO"
                        ? "video/*"
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
                  className={`h-4 w-4 cursor-pointer accent-emerald-600`}
                />
                Publier le média après l'upload
              </label>

              <button
                type="submit"
                className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] disabled:cursor-wait ${stepTheme.button}`}
              >
                {isUploadingLessonAsset ? "Enregistrement en cours..." : "Téléverser et enregistrer le média"}
              </button>
            </fieldset>

            {uploadStatusMsg && (
              <div
                role={uploadStatusKind === "error" ? "alert" : "status"}
                aria-live="polite"
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-center text-xs font-bold ${
                  uploadStatusKind === "error"
                    ? "border-red-500/30 bg-red-950/40 text-red-300"
                    : "border-lime-500/30 bg-lime-950/40 text-lime-300"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    uploadStatusKind === "error" ? "bg-red-400" : "bg-lime-400"
                  } ${isUploadingLessonAsset ? "animate-pulse" : ""}`}
                />
                {uploadStatusMsg}
              </div>
            )}
          </form>
        </div>

        {/* Right Panel: Chapter contents list */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={curriculumUi.sectionTitle}>Médias enregistrés</h3>
              <p className="mt-1 text-[10px] font-semibold text-slate-500">{destinationLabel}</p>
            </div>
            <span className={curriculumUi.countBadge}>
              {selectedManagedContents.length} média{selectedManagedContents.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {selectedManagedContents.length === 0 ? (
              <div className={curriculumUi.empty}>
                <FileText className="mx-auto mb-2 h-8 w-8 text-lime-300" />
                <p className="text-xs font-semibold text-slate-500">
                  {uploadSectionId
                    ? "Aucun média attaché à ce chapitre."
                    : "Aucun média attaché directement à la racine du module."}
                </p>
              </div>
            ) : (
              selectedManagedContents.map((content) => {
                const attachment = content.attachments?.[0];
                return (
                  <div key={content.id} className={`${curriculumUi.card} space-y-4`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
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
                        </div>
                        <h4 className="text-sm font-black text-white leading-snug">{content.title}</h4>
                        {attachment?.fileName && (
                          <p className="max-w-md truncate font-mono text-[11px] text-slate-500">
                            {attachment.fileName}
                          </p>
                        )}
                      </div>

                      <span className={publishedBadge(content.published)}>
                        {publishedLabel(content.published ?? false)}
                      </span>
                    </div>

                    {/* Preview */}
                    {attachment?.url && (
                      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60 p-2">
                        {content.type === "IMAGE" && (
                          <img
                            src={attachment.url}
                            alt={content.title}
                            className="w-full max-h-48 object-contain rounded-xl bg-slate-950"
                          />
                        )}
                        {content.type === "VIDEO" &&
                          (content.status === "PROCESSING" ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3 bg-slate-950 rounded-xl text-emerald-400">
                              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                              <p className="text-[11px] font-bold">
                                Vidéo en cours de préparation (ajout de l'intro)...
                              </p>
                            </div>
                          ) : content.status === "FAILED" ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3 bg-slate-950 rounded-xl text-red-400 px-4 text-center">
                              <AlertTriangle className="h-8 w-8 text-red-500" />
                              <div>
                                <p className="text-xs font-bold">Échec de la préparation de la vidéo.</p>
                                <p className="text-[10px] text-slate-500 mt-1">L'intro n'a pas pu être injectée.</p>
                              </div>
                              {content.jobId && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryVideoJob(content.jobId!)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Relancer la préparation
                                </button>
                              )}
                            </div>
                          ) : (
                            <PremiumVideoPlayer
                              src={attachment.url}
                              title={content.title}
                              instructor={managedCourse?.instructor ?? "Professeur"}
                              activeSector="teacher"
                            />
                          ))}
                        {content.type === "PDF" && (
                          <div className="py-6 flex flex-col items-center justify-center gap-2">
                            <FileText className="h-12 w-12 text-red-500" />
                            <p className="text-[11px] font-bold text-slate-600">Document PDF attaché</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-wrap gap-2 pt-3 ${curriculumUi.divider}`}>
                      {attachment?.url && content.status !== "PROCESSING" && (
                        <a href={attachment.url} target="_blank" rel="noreferrer" className={curriculumUi.ghostBtn}>
                          Ouvrir le fichier
                        </a>
                      )}
                      <button
                        disabled={content.status === "PROCESSING"}
                        onClick={() => handleToggleContentPublished(content)}
                        className={`${curriculumUi.ghostBtn} ${content.published ? "" : "border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/60"} disabled:opacity-50`}
                      >
                        {content.published ? "Dépublier" : "Publier"}
                      </button>
                      <button
                        disabled={content.status === "PROCESSING"}
                        onClick={() => handleDeleteLessonContent(content)}
                        className="px-3.5 py-2 text-[10px] font-black rounded-xl bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-950/70 ml-auto disabled:opacity-50"
                      >
                        Supprimer média
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
