export interface MessagingUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string;
}

export interface MessageAttachment {
  id: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: MessagingUser;
  body: string;
  createdAt: string;
  sentAtLabel: string;
  attachments: MessageAttachment[];
  readByMe: boolean;
  seenByOthers: boolean;
  seenCount: number;
}

export interface ConversationSummary {
  id: string;
  peer: MessagingUser | null;
  updatedAt: string;
  unreadCount: number;
  lastMessage: ChatMessage | null;
  isPeerTyping: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
}
