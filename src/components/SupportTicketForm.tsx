import React, { useRef, useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2, Send, Trash2 } from "lucide-react";
import { api, getFreshSessionToken } from "../api";
import { RASTER_IMAGE_ACCEPT } from "../avatar-security";
import { getUploadedFileUrl, getUploadErrorMessage, uploadFiles, validateUploadFile, bindUploadProgress, formatUploadProgressLabel, uploadProgressBarWidth } from "../uploadthing-client";
import { formatTicketReference } from "../utils/user-facing-labels";

interface SupportTicketFormProps {
  defaultCategory?: string;
  submitLabel?: string;
}

export default function SupportTicketForm({
  defaultCategory = "Support Technique",
  submitLabel = "Envoyer le signalement",
}: SupportTicketFormProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdTicket, setCreatedTicket] = useState<{
    id: string;
    subject: string;
    category: string;
    status: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateUploadFile(file, "SUPPORT_IMAGE");
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
    setUploadProgress(0);

    const token = await getFreshSessionToken();
    if (!token) {
      setUploadError("Authentification expirée. Veuillez vous reconnecter.");
      setUploadProgress(null);
      return;
    }

    try {
      const response = await (uploadFiles as any)("supportScreenshot", {
        files: [file],
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: bindUploadProgress((progress) => {
          setUploadProgress(progress);
        }),
      });

      const url = getUploadedFileUrl(response?.[0]);
      if (!url) throw new Error("URL de l'image introuvable.");

      setScreenshotUrl(url);
      setUploadProgress(null);
    } catch (err: any) {
      console.error("Screenshot upload failed:", err);
      setUploadError(getUploadErrorMessage(err));
      setUploadProgress(null);
      setSelectedFile(null);
    }
  };

  const removeScreenshot = () => {
    setScreenshotUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!subject.trim()) errors.subject = "Le sujet est requis.";
    else if (subject.trim().length < 3) errors.subject = "Le sujet doit contenir au moins 3 caractères.";
    if (!description.trim()) errors.description = "La description est requise.";
    else if (description.trim().length < 10)
      errors.description = "La description doit contenir au moins 10 caractères.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setCreatedTicket(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await api.createSupportTicket({
        subject,
        category,
        description,
        screenshotUrl,
      });
      setSuccessMsg(response.message);
      setCreatedTicket(response.ticket);
      setSubject("");
      setDescription("");
      setScreenshotUrl(null);
      setSelectedFile(null);
      setValidationErrors({});
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Une erreur est survenue lors de la création de votre ticket."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-white">
      {successMsg && createdTicket && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl space-y-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold">{successMsg}</p>
          </div>
          <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-xl space-y-1.5 text-slate-350">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Récapitulatif du ticket</p>
            <p className="text-xs">
              <span className="text-slate-500">Numéro :</span>{" "}
              <span className="font-bold text-indigo-300">{formatTicketReference(createdTicket.id)}</span>
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Sujet :</span>{" "}
              <span className="font-bold text-white">{createdTicket.subject}</span>
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Statut :</span>{" "}
              <span className="text-indigo-300">{createdTicket.status}</span>
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/30 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmitTicket} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ticket-category" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Type de problème
          </label>
          <select
            id="ticket-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-xl text-xs bg-slate-950 border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isSubmitting}
          >
            <option value="Support Technique">Bug ou dysfonctionnement technique</option>
            <option value="Modules">Problème de module ou contenu</option>
            <option value="Compte">Compte utilisateur</option>
            <option value="Paiements">Paiement ou inscription</option>
            <option value="Sécurité">Sécurité</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ticket-subject" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Résumé du problème
          </label>
          <input
            id="ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex : La vidéo du module 3 ne se lance pas"
            className="w-full px-4 py-2.5 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isSubmitting}
          />
          {validationErrors.subject && <p className="text-red-400 text-xs">{validationErrors.subject}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ticket-description" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Description détaillée
          </label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Étapes pour reproduire, message d'erreur affiché, navigateur utilisé..."
            rows={6}
            className="w-full px-4 py-2.5 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isSubmitting}
          />
          {validationErrors.description && <p className="text-red-400 text-xs">{validationErrors.description}</p>}
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Capture d&apos;écran (facultatif)
          </span>
          {screenshotUrl ? (
            <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={screenshotUrl}
                  alt="Capture d'écran"
                  className="w-12 h-12 rounded-lg object-cover border border-slate-800"
                />
                <p className="text-xs font-bold text-slate-300 truncate max-w-[180px]">
                  {selectedFile?.name || "Capture"}
                </p>
              </div>
              <button
                type="button"
                onClick={removeScreenshot}
                className="p-1.5 text-slate-400 hover:text-red-400"
                disabled={isSubmitting}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={RASTER_IMAGE_ACCEPT}
                className="hidden"
                disabled={isSubmitting || uploadProgress !== null}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isSubmitting || uploadProgress !== null}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || uploadProgress !== null}
                className="w-full border border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-950/40 p-4 rounded-xl flex flex-col items-center gap-2"
              >
                {uploadProgress !== null ? (
                  <>
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    <div className="w-full space-y-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-200"
                          style={{ width: uploadProgressBarWidth(uploadProgress) }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        Téléversement : {formatUploadProgressLabel(uploadProgress)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                    <span className="text-xs text-slate-400">Ajouter une capture (max 4 Mo)</span>
                  </>
                )}
              </button>
              {uploadError && <p className="text-red-400 text-[10px]">{uploadError}</p>}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || uploadProgress !== null}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl text-xs disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> {submitLabel}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
