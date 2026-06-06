import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Lock } from "lucide-react";
import type { AppUser } from "../../components/AuthScreen";
import type { AcademicProfilePayload } from "../../types";

type AcademicProfileFormState = {
  title: string;
  department: string;
  lab: string;
  speciality: string;
  teachingDomains: string;
  researchDomains: string;
  bio: string;
  avatarUrl: string;
  linkedIn: string;
  orcid: string;
  googleScholar: string;
  website: string;
};

type AcademicPasswordFormState = {
  currentPassword: string;
  newPassword: string;
};

interface TeacherAcademicProfileViewProps {
  currentUser: AppUser;
  academicProfileData: AcademicProfilePayload | null;
  academicProfileForm: AcademicProfileFormState;
  setAcademicProfileForm: Dispatch<SetStateAction<AcademicProfileFormState>>;
  academicProfileStatusMsg: string;
  academicProfileErrorMsg: string;
  refreshAcademicProfile: () => void | Promise<void>;
  handleUpdateAcademicProfile: (e: FormEvent) => void | Promise<void>;
  handleUploadAvatar: (e: FormEvent) => void | Promise<void>;
  handleUpdateAcademicAvatar: (e: FormEvent) => void | Promise<void>;
  handleDeleteAvatar: () => void | Promise<void>;
  setAvatarFile: (file: File | null) => void;
  avatarStatusMsg: string;
  academicPasswordForm: AcademicPasswordFormState;
  setAcademicPasswordForm: Dispatch<SetStateAction<AcademicPasswordFormState>>;
  handleChangeAcademicPassword: (e: FormEvent) => void | Promise<void>;
}

export default function TeacherAcademicProfileView({
  currentUser,
  academicProfileData,
  academicProfileForm,
  setAcademicProfileForm,
  academicProfileStatusMsg,
  academicProfileErrorMsg,
  refreshAcademicProfile,
  handleUpdateAcademicProfile,
  handleUploadAvatar,
  handleUpdateAcademicAvatar,
  handleDeleteAvatar,
  setAvatarFile,
  avatarStatusMsg,
  academicPasswordForm,
  setAcademicPasswordForm,
  handleChangeAcademicPassword,
}: TeacherAcademicProfileViewProps) {
  return (
    <div className="space-y-6 animate-in duration-200">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-pink-700 bg-pink-50 border border-pink-100 px-3 py-1 rounded-full">
                          Mon Profil Académique
                        </span>
                        <h2 className="text-2xl font-black text-slate-800 mt-3">Identité académique et recherche</h2>
                        <p className="text-xs text-slate-400 mt-1 max-w-2xl">Ces informations sont liées à votre compte authentifié. Le rôle est verrouillé côté serveur et ne peut pas être modifié depuis ce profil.</p>
                      </div>
                      <button
                        onClick={refreshAcademicProfile}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-3 rounded-xl text-xs transition-colors shadow-sm"
                      >
                        Actualiser
                      </button>
                    </div>

                    {(academicProfileStatusMsg || academicProfileErrorMsg) && (
                      <div className={`p-4 border text-xs font-semibold rounded-xl ${
                        academicProfileErrorMsg
                          ? "bg-red-50 border-red-100 text-red-800"
                          : "bg-emerald-50 border-emerald-100 text-emerald-800"
                      }`}>
                        {academicProfileErrorMsg || academicProfileStatusMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                      <form onSubmit={handleUpdateAcademicProfile} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom complet</span>
                            <input value={academicProfileData?.user.fullName || currentUser.fullName} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-500" />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
                            <input value={academicProfileData?.user.email || currentUser.email} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-500" />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rôle</span>
                            <input value={academicProfileData?.user.role || currentUser.role} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-500" />
                          </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input placeholder="Titre académique" value={academicProfileForm.title} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, title: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <input placeholder="Département" value={academicProfileForm.department} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, department: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <input placeholder="Chaire / laboratoire" value={academicProfileForm.lab} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, lab: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <input placeholder="Spécialité" value={academicProfileForm.speciality} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, speciality: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <textarea rows={3} placeholder="Domaines d'enseignement, séparés par virgules" value={academicProfileForm.teachingDomains} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, teachingDomains: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <textarea rows={3} placeholder="Domaines de recherche, séparés par virgules" value={academicProfileForm.researchDomains} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, researchDomains: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <textarea rows={4} placeholder="Bio courte" value={academicProfileForm.bio} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, bio: e.target.value }))} className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                          <input placeholder="LinkedIn" value={academicProfileForm.linkedIn} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, linkedIn: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <input placeholder="ORCID" value={academicProfileForm.orcid} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, orcid: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <input placeholder="Google Scholar" value={academicProfileForm.googleScholar} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, googleScholar: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <input placeholder="Site personnel" value={academicProfileForm.website} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, website: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>

                        <button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-sm">
                          Modifier le profil
                        </button>
                      </form>

                      <div className="space-y-5">
                        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                          <div className="flex items-center gap-4">
                            {academicProfileForm.avatarUrl ? (
                              <img src={academicProfileForm.avatarUrl} alt="Photo de profil" className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-white" />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
                                {(academicProfileData?.user.fullName || currentUser.fullName).slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="text-sm font-black text-slate-800">{academicProfileData?.user.fullName || currentUser.fullName}</h3>
                              <p className="text-xs text-slate-400">{academicProfileForm.title || currentUser.levelOrTitle}</p>
                            </div>
                          </div>

                          <form onSubmit={handleUploadAvatar} className="space-y-3">
                            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-pink-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
                            <button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl text-xs transition-colors">
                              Téléverser une photo
                            </button>
                          </form>
                          <form onSubmit={handleUpdateAcademicAvatar} className="space-y-3">
                            <input placeholder="URL de photo de profil" value={academicProfileForm.avatarUrl} onChange={(e) => setAcademicProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500" />
                            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors">
                              Utiliser cette URL
                            </button>
                          </form>
                          <button type="button" onClick={handleDeleteAvatar} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-colors">
                            Supprimer la photo
                          </button>
                          {avatarStatusMsg && <p className="text-xs font-semibold text-slate-500">{avatarStatusMsg}</p>}
                        </div>

                        <form onSubmit={handleChangeAcademicPassword} className="border border-slate-100 rounded-2xl p-5 bg-white space-y-3">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-pink-600" />
                            Changer le mot de passe
                          </h3>
                          <input type="password" placeholder="Mot de passe actuel" value={academicPasswordForm.currentPassword} onChange={(e) => setAcademicPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <input type="password" placeholder="Nouveau mot de passe" value={academicPasswordForm.newPassword} onChange={(e) => setAcademicPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500" />
                          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition-colors">
                            Mettre à jour
                          </button>
                        </form>

                        <div className="border border-slate-100 rounded-2xl p-5 bg-white space-y-4">
                          <h3 className="text-sm font-black text-slate-800">Activité académique</h3>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 rounded-xl p-3">
                              <p className="text-xl font-black text-slate-900">{academicProfileData?.courses.length || 0}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Modules</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3">
                              <p className="text-xl font-black text-slate-900">{academicProfileData?.lives.length || 0}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Lives</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3">
                              <p className="text-xl font-black text-slate-900">{academicProfileData?.publishedContentsCount || 0}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Publiés</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modules créés / enseignés</p>
                            {(academicProfileData?.courses || []).slice(0, 5).map((course) => (
                              <div key={course.id} className="flex items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                <span className="font-bold text-slate-700 truncate">#{course.id} {course.title}</span>
                                <span className={`font-black ${course.published ? "text-emerald-600" : "text-slate-400"}`}>{course.published ? "Publié" : "Brouillon"}</span>
                              </div>
                            ))}
                            {academicProfileData?.courses.length === 0 && <p className="text-xs text-slate-400">Aucun module créé ou enseigné.</p>}
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lives organisés</p>
                            {(academicProfileData?.lives || []).slice(0, 4).map((live) => (
                              <div key={live.id} className="text-xs bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                <p className="font-bold text-slate-700 truncate">{live.course?.title || `Module ${live.courseId}`}</p>
                                <p className="text-[10px] text-slate-400">{live.active ? "Actif" : "Terminé"} • {new Date(live.startedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
                              </div>
                            ))}
                            {academicProfileData?.lives.length === 0 && <p className="text-xs text-slate-400">Aucun live organisé.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
    </div>
  );
}
