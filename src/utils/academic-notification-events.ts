const COURSE_REFRESH_NOTIFICATION_TYPES = new Set([
  "NEW_COURSE",
  "COURSE_UPDATED",
  "NEW_MODULE",
  "NEW_CHAPTER",
  "NEW_SECTION",
  "NEW_CONTENT",
  "LIVE_REPLAY_AVAILABLE",
  "NEW_HOMEWORK",
]);

export function shouldRefreshCourseForNotification(type: string): boolean {
  return COURSE_REFRESH_NOTIFICATION_TYPES.has(type);
}
