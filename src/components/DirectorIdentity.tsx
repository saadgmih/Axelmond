import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { directorProfile } from "../content/director-profile";

export function DirectorFounderSection() {
  const photoTrackRef = useRef<HTMLDivElement>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const photos = directorProfile.founderPhotos;

  const scrollToPhoto = (index: number) => {
    const nextIndex = (index + photos.length) % photos.length;
    const track = photoTrackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * nextIndex, behavior: "smooth" });
    setActivePhotoIndex(nextIndex);
  };

  const handlePhotoScroll = () => {
    const track = photoTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    const nextIndex = Math.max(0, Math.min(photos.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
    setActivePhotoIndex(nextIndex);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-950/75 shadow-2xl shadow-emerald-950/20">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_360px]">
        <div className="p-6 sm:p-8 md:p-10">
          <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
            Notre fondateur
          </span>
          <h2 className="mt-4 text-3xl font-black leading-tight text-white">{directorProfile.name}</h2>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">{directorProfile.title}</p>
          <p className="mt-5 text-base font-semibold leading-relaxed text-slate-200">"{directorProfile.quote}"</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{directorProfile.welcome}</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
            Performance Académique met la clarté, l'exigence et le suivi personnalisé au centre de l'expérience
            d'apprentissage afin d'aider chaque étudiant à progresser avec méthode.
          </p>
        </div>
        <div
          className="relative min-h-[360px] overflow-hidden border-t border-emerald-500/15 bg-slate-900 lg:border-l lg:border-t-0"
          role="region"
          aria-label="Galerie de portraits du fondateur"
          aria-roledescription="carrousel"
        >
          <div
            ref={photoTrackRef}
            onScroll={handlePhotoScroll}
            className="founder-photo-carousel absolute inset-0 flex snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-x-contain"
          >
            {photos.map((photo, index) => (
              <div
                key={photo.src}
                className="relative h-full min-w-full snap-start snap-always overflow-hidden"
                role="group"
                aria-label={`Photo ${index + 1} sur ${photos.length}`}
                aria-hidden={activePhotoIndex !== index}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="absolute inset-0 h-full w-full select-none object-cover"
                  style={{ objectPosition: photo.objectPosition }}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={index === 0 ? "high" : "low"}
                  width={720}
                  height={1080}
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollToPhoto(activePhotoIndex - 1)}
                className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/65 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                aria-label="Voir la photo précédente"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollToPhoto(activePhotoIndex + 1)}
                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/65 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                aria-label="Voir la photo suivante"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-2 backdrop-blur-sm">
                {photos.map((photo, index) => (
                  <button
                    key={photo.src}
                    type="button"
                    onClick={() => scrollToPhoto(index)}
                    className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                      activePhotoIndex === index ? "w-6 bg-emerald-400" : "w-2.5 bg-white/55 hover:bg-white/80"
                    }`}
                    aria-label={`Afficher la photo ${index + 1}`}
                    aria-current={activePhotoIndex === index ? "true" : undefined}
                  />
                ))}
              </div>
              <p className="sr-only" aria-live="polite">
                Photo {activePhotoIndex + 1} sur {photos.length}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function DirectorAuthCard() {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-3 shadow-xl shadow-black/20">
      <div className="flex items-center gap-3 text-left">
        <img
          src={directorProfile.photo}
          alt={directorProfile.photoAlt}
          className="h-14 w-14 shrink-0 rounded-full border border-emerald-300/30 object-cover object-[50%_22%]"
          loading="lazy"
          decoding="async"
          width={160}
          height={240}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{directorProfile.name}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300">
            {directorProfile.title}
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-400">"{directorProfile.quote}"</p>
        </div>
      </div>
    </div>
  );
}
