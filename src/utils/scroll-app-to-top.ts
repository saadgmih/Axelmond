const MAIN_CONTENT_ID = "main-content";

/** Remonte tous les conteneurs de scroll de l'application (shell flex + fenêtre). */
export function scrollAppToTop(): void {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const main = document.getElementById(MAIN_CONTENT_ID);
  if (main) {
    main.scrollTop = 0;
    main.scrollTo({ top: 0, left: 0 });
  }
}

/** Réessaie après le paint — utile quand le contenu vient de changer de route. */
export function scrollAppToTopDeferred(): void {
  scrollAppToTop();
  requestAnimationFrame(() => {
    scrollAppToTop();
    requestAnimationFrame(scrollAppToTop);
  });
}
