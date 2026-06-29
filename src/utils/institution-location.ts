export const PERFORMANCE_ACADEMIQUE_LOCATION = {
  name: "Performance Académique",
  addressLine1: "Hay Moulay Rachid 4",
  city: "Casablanca",
  postalCode: "20670",
  country: "Maroc",
  latitude: 33.567193,
  longitude: -7.541311,
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=33.567193,-7.541311",
  googleMapsEmbedUrl: "https://www.google.com/maps?q=33.567193,-7.541311&hl=fr&z=18&output=embed",
} as const;

export const PERFORMANCE_ACADEMIQUE_ADDRESS =
  `${PERFORMANCE_ACADEMIQUE_LOCATION.addressLine1}, ` +
  `${PERFORMANCE_ACADEMIQUE_LOCATION.city} ${PERFORMANCE_ACADEMIQUE_LOCATION.postalCode}, ` +
  PERFORMANCE_ACADEMIQUE_LOCATION.country;

export const PERFORMANCE_ACADEMIQUE_COORDINATES = `${PERFORMANCE_ACADEMIQUE_LOCATION.latitude}, ${PERFORMANCE_ACADEMIQUE_LOCATION.longitude}`;
