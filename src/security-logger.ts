import { prisma } from "./db";
import { platformLog, type PlatformLogLevel } from "./server/logger";

export function logSecurity(level: PlatformLogLevel, message: string, data?: unknown) {
  platformLog(level, "security", message, data);
}

export async function logAudit(
  userId: string | null,
  userEmail: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  details?: any,
  ip?: string,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        resource,
        resourceId: resourceId ? String(resourceId) : null,
        details: details || {},
        ip,
      },
    });
    logSecurity("INFO", `Audit Log: ${action} on ${resource}`, { userId, resourceId });
  } catch (err) {
    logSecurity("ERROR", `Failed to create audit log: ${String(err)}`);
  }
}

export function alertFailedLogins(email: string, ip: string, count: number) {
  if (count >= 5) {
    logSecurity("ERROR", `SECURITY ALERT: Multiple failed logins for email: ${email}`, { ip, count });
  } else {
    logSecurity("WARN", `Failed login attempt for email: ${email}`, { ip, count });
  }
}

export function alertMassDeletions(userId: string, resource: string, count: number) {
  if (count >= 5) {
    logSecurity("ERROR", `SECURITY ALERT: Mass deletion detected by user ${userId} on ${resource}`, { count });
  } else {
    logSecurity("WARN", `Resource deletion by user ${userId} on ${resource}`, { count });
  }
}

export function alertSuspectUpload(userId: string, filename: string, mimeType: string) {
  logSecurity("ERROR", `SECURITY ALERT: Suspect file upload attempted by user ${userId}`, { filename, mimeType });
}
