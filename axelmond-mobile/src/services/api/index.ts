import { authApi } from "./auth.api";
import { coursesApi } from "./courses.api";
import { profileApi } from "./profile.api";

export { apiRequest, clearAuthSession, getFreshAccessToken } from "./client";
export { authApi, coursesApi, profileApi };

/** Unified API facade used by hooks and screens. */
export const api = {
  ...authApi,
  ...coursesApi,
  ...profileApi,
};

export default api;
