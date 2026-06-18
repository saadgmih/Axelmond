/** Shared boot flags so healthchecks respond before long startup work finishes. */
export const startupState = {
  listening: false,
  dbVerified: false,
};
