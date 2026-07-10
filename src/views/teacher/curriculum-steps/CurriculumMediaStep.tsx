import { FileText, Download } from "lucide-react";
import { RASTER_IMAGE_ACCEPT } from "../../../avatar-security";
import PremiumVideoPlayer from "../../../components/PremiumVideoPlayer";
import { formatLessonContentTypeLabel } from "../../../utils/user-facing-labels";

import { curriculumUi, getStepTheme, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function CurriculumMediaStep(props: TeacherCurriculumViewProps) {
  const {
    domains: _domains,
    activeCurriculumStep: _activeCurriculumStep,
    setActiveCurriculumStep: _setActiveCurriculumStep,
    selectedChapterId: _selectedChapterId,
    setSelectedChapterId: _setSelectedChapterId,
    selectedPartieId: _selectedPartieId,
    setSelectedPartieId: _setSelectedPartieId,
    newSectionMode: _newSectionMode,
    setNewSectionMode: _setNewSectionMode,
    uploadChapterId,
    setUploadChapterId,
    uploadPartId,
    setUploadPartId,
    uploadSubpartId: _uploadSubpartId,
    setUploadSubpartId,
    quizChapterId: _quizChapterId,
    setQuizChapterId: _setQuizChapterId,
    quizPartId: _quizPartId,
    setQuizPartId: _setQuizPartId,
    quizSubpartId: _quizSubpartId,
    setQuizSubpartId: _setQuizSubpartId,
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
    newSectionParentId: _newSectionParentId,
    setNewSectionParentId: _setNewSectionParentId,
    newSectionPublished: _newSectionPublished,
    setNewSectionPublished: _setNewSectionPublished,
    uploadSectionId,
    setUploadSectionId,
    uploadTitle,
    setUploadTitle,
    uploadType,
    setUploadType,
    uploadFile,
    setUploadFile,
    uploadPublished,
    setUploadPublished,
    uploadStatusMsg,
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
    managedSections,
    chapterSections,
    uploadPartOptions,
    selectedManagedContents,
    managedLiveReplays,
    handleSetUploadSectionId,
    showCurriculumSuccess: _showCurriculumSuccess,
    showCurriculumError: _showCurriculumError,
    handleCreateCourse: _handleCreateCourse,
    handleCreateSection: _handleCreateSection,
    handleUploadLessonAsset,
    handleSelectManagedCourse: _handleSelectManagedCourse,
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
    handleAddChildSection: _handleAddChildSection,
    handleToggleContentPublished,
    handleDeleteLessonContent,
  } = props;
  const stepTheme = getStepTheme(4);
  const inputFocus = `${curriculumUi.input} ${stepTheme.focus}`;
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {managedLiveReplays.length > 0 && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-5 md:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-wide text-emerald-200">Rediffusions live en attente</h3>
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
                      <span className={`rounded px-2 py-0.5 text-[8px] font-black uppercase ${curriculumUi.mediaVideo}`}>
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
      <div className={`lg:col-span-5 ${curriculumUi.panel} ${getStepTheme(4).panel} space-y-5 self-start`}>
        <div>
          <h3 className={curriculumUi.panelTitle}>
            <FileText className="h-5 w-5 text-lime-400" />
            Ajouter des médias
          </h3>
          <p className={curriculumUi.panelSubtitle}>Uploadez vidéos, PDF ou images dans la section cible.</p>
        </div>

        <form onSubmit={handleUploadLessonAsset} className={`space-y-4 pt-3 ${curriculumUi.divider}`}>
          {/* Destination Section Selector */}
          <div className="space-y-1">
            <span className={curriculumUi.label}>Section cible</span>
            <select
              value={uploadSectionId}
              onChange={(e) => handleSetUploadSectionId(e.target.value)}
              className={`${inputFocus} text-slate-700`}
            >
              <option value="">-- Directement dans le module (racine) --</option>
              {managedSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {`${"— ".repeat(section.depth ?? 0)}${section.title}`}
                </option>
              ))}
            </select>
          </div>

          {/* Cascading selectors */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-lime-500/20 bg-lime-950/20 p-3">
            <label className="block space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase">Chapitre</span>
              <select
                value={uploadChapterId}
                onChange={(e) => {
                  const value = e.target.value;
                  setUploadChapterId(value);
                  setUploadPartId("");
                  setUploadSubpartId("");
                  setUploadSectionId(value);
                }}
                className="w-full rounded-xl border border-slate-700 bg-[#031512] px-2 py-2 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/30"
              >
                <option value="">Module uniquement</option>
                {chapterSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase">Partie</span>
              <select
                value={uploadPartId}
                onChange={(e) => {
                  const value = e.target.value;
                  setUploadPartId(value);
                  setUploadSubpartId("");
                  setUploadSectionId(value || uploadChapterId);
                }}
                disabled={!uploadChapterId}
                className="w-full rounded-xl border border-slate-700 bg-[#031512] px-2 py-2 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/30 disabled:bg-slate-900"
              >
                <option value="">Partie facultative</option>
                {uploadPartOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
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
                <option value="IMAGE">Image (PNG, JPG, SVG)</option>
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
                  uploadType === "VIDEO" ? "video/*" : uploadType === "PDF" ? "application/pdf" : RASTER_IMAGE_ACCEPT
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
            className={`w-full rounded-xl py-3 text-xs font-black shadow-sm transition-colors active:scale-[0.98] ${stepTheme.button}`}
          >
            Lancer le téléversement (Upload)
          </button>

          {uploadStatusMsg && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-lime-500/30 bg-lime-950/40 p-3 text-center text-xs font-bold text-lime-300 animate-pulse">
              <span className="h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-lime-400" />
              {uploadStatusMsg}
            </div>
          )}
        </form>
      </div>

      {/* Right Panel: Section Contents List */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={curriculumUi.sectionTitle}>Médias attachés à la section</h3>
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
                  ? "Aucun média attaché à cette section."
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
                        <p className="max-w-md truncate font-mono text-[11px] text-slate-500">{attachment.fileName}</p>
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
                      {content.type === "VIDEO" && (
                        <PremiumVideoPlayer
                          src={attachment.url}
                          title={content.title}
                          instructor={managedCourse?.instructor ?? "Professeur"}
                          activeSector="teacher"
                        />
                      )}
                      {content.type === "PDF" && (
                        <div className="py-6 flex flex-col items-center justify-center gap-2">
                          <FileText className="h-12 w-12 text-red-500" />
                          <p className="text-[11px] font-bold text-slate-600">Document PDF attaché</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-wrap gap-2 pt-3 ${curriculumUi.divider}`}>
                    {attachment?.url && (
                      <a href={attachment.url} target="_blank" rel="noreferrer" className={curriculumUi.ghostBtn}>
                        Ouvrir le fichier
                      </a>
                    )}
                    <button
                      onClick={() => handleToggleContentPublished(content)}
                      className={`${curriculumUi.ghostBtn} ${content.published ? "" : "border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/60"}`}
                    >
                      {content.published ? "Dépublier" : "Publier"}
                    </button>
                    <button
                      onClick={() => handleDeleteLessonContent(content)}
                      className="px-3.5 py-2 text-[10px] font-black rounded-xl bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-950/70 ml-auto"
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
