import webpush from "web-push";
import { prisma } from "./db";
import { emitToUser } from "./messaging-socket";

export type NotificationType =
  | "NEW_MESSAGE"
  | "NEW_CHAPTER"
  | "LIVE_STARTED"
  | "LIVE_SOON"
  | "NEW_QUIZ"
  | "NEW_HOMEWORK";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

let pushConfigured = false;

export function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:support@uroahumain.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  pushConfigured = true;
  return true;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || "";
}

export async function createUserNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: String(input.type),
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl || null,
      metadata: (input.metadata || {}) as any,
    },
  });

  if (pushConfigured) {
    await sendPushForNotification(input.userId, {
      title: input.title,
      body: input.body,
      url: input.actionUrl || "/",
      notificationId: notification.id,
    }).catch(() => undefined);
  }

  emitToUser(input.userId, "notification:new", serializeNotification(notification));
  return notification;
}

export async function createNotificationsForUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const results = [];
  for (const userId of uniqueIds) {
    results.push(await createUserNotification({ ...input, userId }));
  }
  return results;
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function listUserNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  return updated.count === 1;
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  return prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

async function sendPushForNotification(
  userId: string,
  payload: { title: string; body: string; url: string; notificationId: string },
) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const body = JSON.stringify(payload);
  for (const subscription of subscriptions) {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      body,
    ).catch(async () => {
      await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
    });
  }
}

export function serializeNotification(notification: {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  metadata: unknown;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    actionUrl: notification.actionUrl || "",
    metadata: notification.metadata || {},
    readAt: notification.readAt?.toISOString() || null,
    createdAt: notification.createdAt.toISOString(),
    isRead: Boolean(notification.readAt),
  };
}

export async function notifyEnrolledStudentsForCourse(
  courseId: number,
  input: Omit<CreateNotificationInput, "userId">,
) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });
  return createNotificationsForUsers(enrollments.map((entry) => entry.userId), input);
}
