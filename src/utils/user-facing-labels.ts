export function formatLessonContentTypeLabel(type: string): string {
  switch (type) {
    case "VIDEO":
      return "Vidéo";
    case "PDF":
      return "Document PDF";
    case "IMAGE":
      return "Image";
    case "TEXT":
      return "Texte";
    default:
      return "Contenu";
  }
}

/** Affiche une référence de reçu lisible sans préfixes techniques (INV-PAYPAL, etc.). */
export function formatInvoiceReference(invoiceId: string): string {
  const tail = invoiceId.match(/(\d{4,})$/)?.[1];
  return tail ? `Reçu n° ${tail}` : "Reçu";
}

/** Affiche une référence de ticket lisible (TK-123456 → Ticket n° 123456). */
export function formatTicketReference(ticketId: string): string {
  const tail = ticketId.match(/(\d{4,})$/)?.[1];
  return tail ? `Ticket n° ${tail}` : "Ticket enregistré";
}
