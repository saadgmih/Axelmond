import { authApi } from "./auth.api";
import { coursesApi } from "./courses.api";
import { liveApi } from "./live.api";
import { profileApi } from "./profile.api";

export { apiRequest, clearAuthSession, getFreshAccessToken, onSessionInvalidated } from "./client";
export { authApi, coursesApi, liveApi, profileApi };

/** Unified API facade used by hooks and screens. */
export const api = {
  ...authApi,
  ...coursesApi,
  ...profileApi,
  ...liveApi,
};
export default api;
