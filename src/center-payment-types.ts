export type CenterPaymentStatus =
  | "PENDING_PAYMENT"
  | "UNDER_REVIEW"
  | "PAID"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export type CenterPaymentMethod = "CASH" | "CARD_AT_CENTER" | "BANK_TRANSFER" | "CHECK" | "OTHER";

export interface CenterPaymentConfig {
  centerName: string;
  address: string;
  openingHours: string;
  phone: string;
  email: string;
  expirationDays: number;
  currency: string;
  accessDurationDays: number;
  instructions: string;
}

export interface CenterPaymentReceipt {
  centerName: string;
  receiptNumber: string;
  requestReference: string;
  studentName: string;
  studentEmail: string;
  moduleTitle: string;
  amount: number;
  currency: string;
  paymentMethod: CenterPaymentMethod;
  validatedAt: string;
  accessDurationDays: number;
  accessEndsAt: string | null;
  validatedBy: string;
  status: "PAYÉ" | "REMBOURSÉ";
}

export interface CenterPaymentRequestView {
  reference: string;
  module: { id: number; title: string; description?: string | null };
  amount: number;
  currency: string;
  modulePriceSnapshot: number;
  accessDurationDays: number;
  includesAiAssistant: boolean;
  status: CenterPaymentStatus;
  expiresAt: string;
  paidAt: string | null;
  validatedAt: string | null;
  paymentMethod: CenterPaymentMethod | null;
  generatedReceiptNumber: string | null;
  publicReason: string | null;
  studentNote: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionId: string | null;
  accessEndsAt: string | null;
  receipt: CenterPaymentReceipt | null;
  center: CenterPaymentConfig;
  history: Array<{
    previousStatus: CenterPaymentStatus | null;
    newStatus: CenterPaymentStatus;
    publicReason?: string | null;
    createdAt: string;
  }>;
}

export interface AdminCenterPaymentRequestView extends CenterPaymentRequestView {
  id: string;
  student: { id: string; fullName: string; email: string };
  currentModulePrice: number;
  receivedAmount: number | null;
  physicalReceiptReference: string | null;
  adminNote: string | null;
  validatedBy: { id: string; fullName: string; email: string } | null;
  paymentId: string | null;
  history: Array<{
    id: string;
    previousStatus: CenterPaymentStatus | null;
    newStatus: CenterPaymentStatus;
    actorType: "STUDENT" | "ADMIN" | "SYSTEM";
    reason: string | null;
    publicReason: string | null;
    internalNote: string | null;
    changedBy: { id: string; fullName: string; email: string } | null;
    createdAt: string;
  }>;
}
