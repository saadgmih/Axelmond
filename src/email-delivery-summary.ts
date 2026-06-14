export interface EmailDeliveryLogLike {
  messageId?: string | null;
  accepted?: unknown;
  rejected?: unknown;
  envelope?: any;
  response?: string | null;
  providerStatus: string;
  createdAt: Date | string;
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hasRejectedRecipients(log: EmailDeliveryLogLike) {
  return Array.isArray(log.rejected) && log.rejected.length > 0;
}

function isErrorLog(log: EmailDeliveryLogLike) {
  return log.providerStatus !== "QUEUED" || hasRejectedRecipients(log);
}

export function buildEmailDeliverySummary(logs: EmailDeliveryLogLike[], smtpConfigured: boolean, now = new Date()) {
  const sortedLogs = [...logs].sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
  const lastEmailSent = sortedLogs.find((log) => log.providerStatus === "QUEUED") || null;
  const lastSmtpError = sortedLogs.find(isErrorLog) || null;
  const emailsSentToday = sortedLogs.filter(
    (log) => log.providerStatus === "QUEUED" && isSameDay(toDate(log.createdAt), now),
  ).length;

  return {
    smtpConfigured,
    lastEmailSent,
    emailsSentToday,
    lastSmtpError,
  };
}
